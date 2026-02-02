"""
Prediction Market Collector
Aggregates data from other prediction platforms (Metaculus, Manifold) for calibration signals
"""

import httpx
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional

from .engine import (
    ResearchItem, ResearchDatabase, SourceType, Category,
    generate_item_id, calculate_engagement_score,
    analyze_sentiment_keywords, extract_keywords
)


# Category keywords for filtering
CATEGORY_KEYWORDS = {
    Category.POLITICS: ["election", "trump", "biden", "harris", "congress", "senate", "vote", "president", "political"],
    Category.SPORTS: ["nfl", "nba", "mlb", "nhl", "super bowl", "playoffs", "championship", "game", "match", "win"],
    Category.CRYPTO: ["bitcoin", "btc", "ethereum", "eth", "crypto", "blockchain", "defi", "price"],
    Category.ENTERTAINMENT: ["oscar", "emmy", "grammy", "movie", "film", "box office", "award", "nomination"],
}


class PredictionMarketCollector:
    """
    Collects data from prediction markets for calibration:
    - Metaculus (forecasting platform)
    - Manifold Markets (play money prediction market)
    """
    
    METACULUS_API = "https://www.metaculus.com/api2"
    MANIFOLD_API = "https://api.manifold.markets/v0"
    
    def __init__(self, db: ResearchDatabase):
        self.db = db
        self.client = httpx.AsyncClient(
            headers={"User-Agent": "PolymarketResearch/1.0"},
            timeout=30.0
        )
    
    async def close(self):
        await self.client.aclose()
    
    def _categorize_question(self, text: str) -> Optional[Category]:
        """Determine category from question text"""
        text_lower = text.lower()
        
        for category, keywords in CATEGORY_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return category
        
        return None
    
    # ========== Metaculus ==========
    
    async def fetch_metaculus_questions(self, limit: int = 50) -> List[Dict]:
        """Fetch trending questions from Metaculus"""
        try:
            url = f"{self.METACULUS_API}/questions/"
            params = {
                "limit": limit,
                "status": "open",
                "order_by": "-activity",
                "type": "forecast",
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            return data.get("results", [])
            
        except Exception as e:
            print(f"Error fetching Metaculus questions: {e}")
            return []
    
    def _parse_metaculus_question(self, question: Dict) -> Optional[ResearchItem]:
        """Parse a Metaculus question into a ResearchItem"""
        try:
            title = question.get("title", "")
            if not title:
                return None
            
            category = self._categorize_question(title)
            if not category:
                return None
            
            question_id = question.get("id")
            url = f"https://www.metaculus.com/questions/{question_id}/"
            
            # Get community prediction
            community = question.get("community_prediction", {})
            forecast = community.get("full", {}).get("q2")  # Median
            forecasters = question.get("number_of_forecasters", 0)
            
            engagement = calculate_engagement_score(
                upvotes=forecasters * 5,
                comments=question.get("activity", 0),
                hours_old=24,
                source_weight=1.8
            )
            
            # Build content
            description = question.get("description", "")
            content = f"Question: {title}\n\n"
            if forecast:
                content += f"Community Forecast: {forecast*100:.1f}%\n"
            content += f"Forecasters: {forecasters}\n"
            if description:
                content += f"\n{description[:500]}"
            
            # Determine sentiment from forecast
            sentiment = 0.0
            if forecast:
                sentiment = (forecast - 0.5) * 2  # Convert 0-1 to -1 to 1
            
            keywords = extract_keywords(title + " " + description, category)
            
            created_time = question.get("created_time", datetime.now(timezone.utc).isoformat())
            
            return ResearchItem(
                id=generate_item_id("metaculus", url, title),
                source_type=SourceType.PREDICTION_MARKET,
                source_name="Metaculus",
                category=category,
                title=title,
                content=content,
                url=url,
                author="Metaculus Community",
                timestamp=created_time,
                upvotes=forecasters,
                comments=question.get("activity", 0),
                engagement_score=engagement,
                sentiment=sentiment,
                keywords=keywords,
                raw_data={
                    "question_id": question_id,
                    "community_prediction": forecast,
                    "forecasters": forecasters,
                    "close_time": question.get("close_time"),
                }
            )
            
        except Exception as e:
            print(f"Error parsing Metaculus question: {e}")
            return None
    
    # ========== Manifold Markets ==========
    
    async def fetch_manifold_markets(self, limit: int = 50) -> List[Dict]:
        """Fetch markets from Manifold"""
        try:
            url = f"{self.MANIFOLD_API}/markets"
            params = {
                "limit": limit,
                "sort": "liquidity",
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"Error fetching Manifold markets: {e}")
            return []
    
    async def search_manifold_markets(self, query: str, limit: int = 20) -> List[Dict]:
        """Search Manifold markets"""
        try:
            url = f"{self.MANIFOLD_API}/search-markets"
            params = {
                "term": query,
                "limit": limit,
                "filter": "open",
                "sort": "liquidity",
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"Error searching Manifold for '{query}': {e}")
            return []
    
    def _parse_manifold_market(self, market: Dict) -> Optional[ResearchItem]:
        """Parse a Manifold market into a ResearchItem"""
        try:
            question = market.get("question", "")
            if not question:
                return None
            
            category = self._categorize_question(question)
            if not category:
                return None
            
            market_id = market.get("id", "")
            slug = market.get("slug", market_id)
            creator = market.get("creatorUsername", "unknown")
            url = f"https://manifold.markets/{creator}/{slug}"
            
            probability = market.get("probability")
            volume = market.get("volume", 0)
            liquidity = market.get("totalLiquidity", 0)
            unique_bettors = market.get("uniqueBettorCount", 0)
            
            engagement = calculate_engagement_score(
                upvotes=unique_bettors * 3,
                comments=int(volume / 100),
                hours_old=24,
                source_weight=1.5
            )
            
            # Build content
            description = market.get("textDescription", "") or ""
            content = f"Question: {question}\n\n"
            if probability is not None:
                content += f"Market Probability: {probability*100:.1f}%\n"
            content += f"Volume: ${volume:,.0f}\n"
            content += f"Traders: {unique_bettors}\n"
            if description:
                content += f"\n{description[:500]}"
            
            # Sentiment from probability
            sentiment = 0.0
            if probability is not None:
                sentiment = (probability - 0.5) * 2
            
            keywords = extract_keywords(question + " " + description, category)
            
            created_time = market.get("createdTime")
            if created_time:
                created_time = datetime.fromtimestamp(created_time/1000, tz=timezone.utc).isoformat()
            else:
                created_time = datetime.now(timezone.utc).isoformat()
            
            return ResearchItem(
                id=generate_item_id("manifold", url, question),
                source_type=SourceType.PREDICTION_MARKET,
                source_name="Manifold Markets",
                category=category,
                title=question,
                content=content,
                url=url,
                author=creator,
                timestamp=created_time,
                upvotes=unique_bettors,
                comments=int(volume / 100),
                engagement_score=engagement,
                sentiment=sentiment,
                keywords=keywords,
                raw_data={
                    "market_id": market_id,
                    "probability": probability,
                    "volume": volume,
                    "liquidity": liquidity,
                    "unique_bettors": unique_bettors,
                }
            )
            
        except Exception as e:
            print(f"Error parsing Manifold market: {e}")
            return None
    
    async def collect_all(self) -> Dict[Category, List[ResearchItem]]:
        """Collect from all prediction markets"""
        results = {cat: [] for cat in Category}
        
        print("  Prediction Markets: Fetching Metaculus...")
        metaculus_questions = await self.fetch_metaculus_questions(limit=100)
        for q in metaculus_questions:
            item = self._parse_metaculus_question(q)
            if item:
                results[item.category].append(item)
                self.db.store_research_item(item)
        
        await asyncio.sleep(0.5)
        
        print("  Prediction Markets: Fetching Manifold...")
        manifold_markets = await self.fetch_manifold_markets(limit=100)
        for m in manifold_markets:
            item = self._parse_manifold_market(m)
            if item:
                results[item.category].append(item)
                self.db.store_research_item(item)
        
        # Search Manifold for category-specific terms
        for category, keywords in CATEGORY_KEYWORDS.items():
            for term in keywords[:2]:
                search_results = await self.search_manifold_markets(term, limit=10)
                for m in search_results:
                    item = self._parse_manifold_market(m)
                    if item and item.category == category:
                        if item.id not in [x.id for x in results[category]]:
                            results[category].append(item)
                            self.db.store_research_item(item)
                await asyncio.sleep(0.3)
        
        for category, items in results.items():
            print(f"    {category.value}: {len(items)} items")
        
        return results
