"""
Research Orchestrator
Coordinates all collectors and generates trading signals
"""

import asyncio
import json
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
import os

from .engine import (
    ResearchItem, ResearchDatabase, MarketSignal, Category,
    analyze_sentiment_keywords
)
from .reddit_collector import RedditCollector
from .news_collector import NewsCollector
from .prediction_market_collector import PredictionMarketCollector
from .polymarket_collector import PolymarketCollector
from .social_collector import SocialMediaCollector


class ResearchOrchestrator:
    """
    Main coordinator for the research system
    - Runs all collectors
    - Aggregates and analyzes data
    - Generates trading signals with datapoints
    """
    
    def __init__(self, db_path: str = "data/research.db"):
        self.db = ResearchDatabase(db_path)
        self.reddit = RedditCollector(self.db)
        self.news = NewsCollector(self.db)
        self.prediction_markets = PredictionMarketCollector(self.db)
        self.polymarket = PolymarketCollector(self.db)
        self.social = SocialMediaCollector(self.db)
        
        # Signal generation thresholds
        self.min_sources = 3
        self.min_confidence = 0.5
    
    async def close(self):
        await self.reddit.close()
        await self.news.close()
        await self.prediction_markets.close()
        await self.polymarket.close()
        await self.social.close()
    
    async def run_collection(self) -> Dict:
        """Run all collectors and return summary"""
        print("\n" + "="*60)
        print(f"Starting Research Collection - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        results = {
            "reddit": {},
            "news": {},
            "prediction_markets": {},
            "polymarket": {},
            "social": {},
            "total_items": 0,
            "by_category": {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            # Reddit
            print("\n📱 Collecting from Reddit...")
            reddit_results = await self.reddit.collect_all()
            for cat, items in reddit_results.items():
                results["reddit"][cat.value] = len(items)
                results["total_items"] += len(items)
            
            # News
            print("\n📰 Collecting from News Sources...")
            news_results = await self.news.collect_all()
            for cat, items in news_results.items():
                results["news"][cat.value] = len(items)
                results["total_items"] += len(items)
            
            # Prediction Markets (Metaculus, Manifold)
            print("\n🎯 Collecting from Prediction Markets...")
            pm_results = await self.prediction_markets.collect_all()
            for cat, items in pm_results.items():
                results["prediction_markets"][cat.value] = len(items)
                results["total_items"] += len(items)
            
            # Polymarket Direct
            print("\n💰 Collecting from Polymarket...")
            poly_results = await self.polymarket.collect_all()
            for cat, items in poly_results.items():
                results["polymarket"][cat.value] = len(items)
                results["total_items"] += len(items)
            
            # Social Media (Twitter/Nitter, Fear & Greed)
            print("\n🐦 Collecting from Social Media...")
            social_results = await self.social.collect_all()
            for cat, items in social_results.items():
                results["social"][cat.value] = len(items)
                results["total_items"] += len(items)
            
            # Calculate totals by category
            for category in Category:
                cat_total = (
                    results["reddit"].get(category.value, 0) +
                    results["news"].get(category.value, 0) +
                    results["prediction_markets"].get(category.value, 0) +
                    results["polymarket"].get(category.value, 0) +
                    results["social"].get(category.value, 0)
                )
                results["by_category"][category.value] = cat_total
            
            print(f"\n✅ Collection complete! Total items: {results['total_items']}")
            
        except Exception as e:
            print(f"\n❌ Error during collection: {e}")
            results["error"] = str(e)
        
        return results
    
    def generate_signal_for_category(self, category: Category) -> Optional[MarketSignal]:
        """Generate a trading signal for a category based on recent research"""
        
        # Get recent research
        research = self.db.get_recent_research(category=category, hours=24, limit=50)
        
        if len(research) < self.min_sources:
            return None
        
        # Aggregate sentiment and evidence
        total_sentiment = 0.0
        total_weight = 0.0
        datapoints = []
        sources = set()
        total_engagement = 0
        
        for item in research:
            weight = item.get("engagement_score", 1.0)
            sentiment = item.get("sentiment", 0.0)
            
            total_sentiment += sentiment * weight
            total_weight += weight
            sources.add(item.get("source_name", ""))
            total_engagement += int(item.get("engagement_score", 0))
            
            # Add high-value items as datapoints
            if weight > 10 or abs(sentiment) > 0.3:
                datapoints.append({
                    "source": item.get("source_name", "Unknown"),
                    "title": item.get("title", "")[:100],
                    "sentiment": f"{'Bullish' if sentiment > 0 else 'Bearish' if sentiment < 0 else 'Neutral'}",
                    "engagement": int(item.get("engagement_score", 0)),
                    "url": item.get("url", ""),
                    "timestamp": item.get("timestamp", "")
                })
        
        if total_weight == 0:
            return None
        
        avg_sentiment = total_sentiment / total_weight
        
        # Calculate confidence based on source diversity and agreement
        source_diversity = min(len(sources) / 5, 1.0)  # Max at 5 sources
        sentiment_strength = min(abs(avg_sentiment) * 2, 1.0)
        confidence = (source_diversity * 0.4 + sentiment_strength * 0.6)
        
        if confidence < self.min_confidence:
            return None
        
        # Determine side
        side = "YES" if avg_sentiment > 0 else "NO"
        
        # Sort datapoints by engagement
        datapoints.sort(key=lambda x: x.get("engagement", 0), reverse=True)
        datapoints = datapoints[:10]  # Top 10
        
        # Generate reasoning
        bullish_count = sum(1 for d in datapoints if d["sentiment"] == "Bullish")
        bearish_count = sum(1 for d in datapoints if d["sentiment"] == "Bearish")
        
        reasoning = f"Analysis of {len(research)} sources across {len(sources)} platforms. "
        reasoning += f"Sentiment: {bullish_count} bullish, {bearish_count} bearish signals. "
        reasoning += f"Average sentiment score: {avg_sentiment:.2f}. "
        reasoning += f"Confidence based on {len(sources)} unique sources."
        
        # Create signal
        signal_id = hashlib.md5(
            f"{category.value}:{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]
        
        now = datetime.now(timezone.utc)
        
        signal = MarketSignal(
            id=signal_id,
            market_id=f"{category.value}_general",
            market_question=f"{category.value.title()} Market Sentiment",
            category=category,
            side=side,
            sentiment_score=avg_sentiment,
            confidence=confidence,
            datapoints=datapoints,
            sources_count=len(sources),
            total_engagement=total_engagement,
            generated_at=now.isoformat(),
            expires_at=(now + timedelta(hours=24)).isoformat(),
            reasoning=reasoning
        )
        
        self.db.store_signal(signal)
        return signal
    
    def generate_all_signals(self) -> List[MarketSignal]:
        """Generate signals for all categories"""
        signals = []
        
        for category in Category:
            signal = self.generate_signal_for_category(category)
            if signal:
                signals.append(signal)
        
        return signals
    
    def get_category_summary(self, category: Category) -> Dict:
        """Get a detailed summary for a category"""
        research = self.db.get_recent_research(category=category, hours=24, limit=100)
        
        if not research:
            return {
                "category": category.value,
                "total_items": 0,
                "message": "No recent research data"
            }
        
        # Group by source
        by_source = {}
        for item in research:
            source = item.get("source_type", "unknown")
            if source not in by_source:
                by_source[source] = []
            by_source[source].append(item)
        
        # Calculate stats
        sentiments = [item.get("sentiment", 0) for item in research]
        avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0
        
        # Top items by engagement
        top_items = sorted(research, key=lambda x: x.get("engagement_score", 0), reverse=True)[:5]
        
        return {
            "category": category.value,
            "total_items": len(research),
            "by_source": {k: len(v) for k, v in by_source.items()},
            "average_sentiment": round(avg_sentiment, 3),
            "sentiment_direction": "Bullish" if avg_sentiment > 0.1 else "Bearish" if avg_sentiment < -0.1 else "Neutral",
            "top_items": [
                {
                    "title": item.get("title", "")[:100],
                    "source": item.get("source_name", ""),
                    "engagement": int(item.get("engagement_score", 0)),
                    "sentiment": item.get("sentiment", 0),
                    "url": item.get("url", "")
                }
                for item in top_items
            ]
        }


async def run_continuous_monitoring(interval_minutes: int = 15):
    """Run continuous monitoring loop"""
    orchestrator = ResearchOrchestrator()
    
    print("\n🚀 Starting Continuous Research Monitoring")
    print(f"   Interval: {interval_minutes} minutes")
    print("   Press Ctrl+C to stop\n")
    
    try:
        while True:
            # Run collection
            await orchestrator.run_collection()
            
            # Generate signals
            print("\n📊 Generating Signals...")
            signals = orchestrator.generate_all_signals()
            
            for signal in signals:
                print(f"\n  {signal.category.value.upper()}: {signal.side}")
                print(f"    Confidence: {signal.confidence:.1%}")
                print(f"    Sentiment: {signal.sentiment_score:.2f}")
                print(f"    Sources: {signal.sources_count}")
                print(f"    Datapoints: {len(signal.datapoints)}")
            
            if not signals:
                print("  No signals generated (insufficient confidence)")
            
            # Wait for next cycle
            print(f"\n⏰ Next collection in {interval_minutes} minutes...")
            await asyncio.sleep(interval_minutes * 60)
            
    except KeyboardInterrupt:
        print("\n\n👋 Stopping monitoring...")
    finally:
        await orchestrator.close()


async def main():
    """Test the orchestrator"""
    orchestrator = ResearchOrchestrator()
    
    try:
        # Run collection
        results = await orchestrator.run_collection()
        print(f"\nCollection Results: {json.dumps(results, indent=2)}")
        
        # Generate signals
        print("\n" + "="*60)
        print("GENERATING SIGNALS")
        print("="*60)
        
        signals = orchestrator.generate_all_signals()
        
        for signal in signals:
            print(f"\n📈 {signal.category.value.upper()} SIGNAL")
            print(f"   Side: {signal.side}")
            print(f"   Confidence: {signal.confidence:.1%}")
            print(f"   Sentiment Score: {signal.sentiment_score:.2f}")
            print(f"   Sources: {signal.sources_count}")
            print(f"   Total Engagement: {signal.total_engagement:,}")
            print(f"\n   Reasoning: {signal.reasoning}")
            print(f"\n   Top Datapoints:")
            for dp in signal.datapoints[:5]:
                print(f"     • [{dp['source']}] {dp['title'][:60]}...")
        
        if not signals:
            print("\n⚠️ No signals generated (insufficient data or confidence)")
        
        # Show category summaries
        print("\n" + "="*60)
        print("CATEGORY SUMMARIES")
        print("="*60)
        
        for category in Category:
            summary = orchestrator.get_category_summary(category)
            print(f"\n{category.value.upper()}:")
            print(f"  Items: {summary['total_items']}")
            print(f"  Sentiment: {summary.get('sentiment_direction', 'N/A')} ({summary.get('average_sentiment', 0):.2f})")
            if summary.get('by_source'):
                print(f"  Sources: {summary['by_source']}")
    
    finally:
        await orchestrator.close()


if __name__ == "__main__":
    asyncio.run(main())
