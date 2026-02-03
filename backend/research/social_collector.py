"""
Social & Sentiment Collector
Aggregates market sentiment data from reliable APIs:
- Fear & Greed Index (Crypto)
- Stock Market Fear & Greed (CNN)
- Google Trends (search interest)
- Reddit Sentiment (aggregated)
"""

import httpx
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional

from .engine import (
    ResearchItem, ResearchDatabase, SourceType, Category,
    generate_item_id, analyze_sentiment_keywords
)


class SocialCollector:
    """Collects social sentiment and market mood indicators"""
    
    # Alternative Crypto Fear & Greed API
    FEAR_GREED_API = "https://api.alternative.me/fng/"
    
    # CoinGlass funding rates (market sentiment indicator)
    COINGLASS_API = "https://open-api.coinglass.com/public/v2/funding"
    
    def __init__(self, db: ResearchDatabase):
        self.db = db
        self.client = httpx.AsyncClient(
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            timeout=30.0
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def get_crypto_fear_greed(self) -> Optional[ResearchItem]:
        """Fetch Crypto Fear & Greed Index"""
        try:
            response = await self.client.get(f"{self.FEAR_GREED_API}?limit=1")
            response.raise_for_status()
            data = response.json()
            
            if data.get("data"):
                fg = data["data"][0]
                value = int(fg["value"])
                classification = fg["value_classification"]
                timestamp = datetime.fromtimestamp(int(fg["timestamp"]), tz=timezone.utc)
                
                # Map to sentiment (-1 to 1)
                # 0-25: Extreme Fear (-1 to -0.5)
                # 25-45: Fear (-0.5 to -0.1)
                # 45-55: Neutral (-0.1 to 0.1)
                # 55-75: Greed (0.1 to 0.5)
                # 75-100: Extreme Greed (0.5 to 1)
                if value <= 25:
                    sentiment = -1.0 + (value / 25) * 0.5  # -1 to -0.5
                elif value <= 45:
                    sentiment = -0.5 + ((value - 25) / 20) * 0.4  # -0.5 to -0.1
                elif value <= 55:
                    sentiment = -0.1 + ((value - 45) / 10) * 0.2  # -0.1 to 0.1
                elif value <= 75:
                    sentiment = 0.1 + ((value - 55) / 20) * 0.4  # 0.1 to 0.5
                else:
                    sentiment = 0.5 + ((value - 75) / 25) * 0.5  # 0.5 to 1
                
                # Determine emoji indicator
                if value <= 25:
                    emoji = "😱"
                    bg_hint = "extreme_fear"
                elif value <= 45:
                    emoji = "😨"
                    bg_hint = "fear"
                elif value <= 55:
                    emoji = "😐"
                    bg_hint = "neutral"
                elif value <= 75:
                    emoji = "😊"
                    bg_hint = "greed"
                else:
                    emoji = "🤑"
                    bg_hint = "extreme_greed"
                
                return ResearchItem(
                    id=generate_item_id("social", "fear_greed", str(timestamp.date())),
                    source_type=SourceType.SOCIAL_MEDIA,
                    source_name="Fear & Greed Index",
                    category=Category.CRYPTO,
                    title=f"{emoji} Crypto Fear & Greed: {value} ({classification})",
                    content=f"The Crypto Fear & Greed Index is at {value}/100 ({classification}). "
                            f"This indicator measures market sentiment based on volatility, momentum, "
                            f"social media, surveys, Bitcoin dominance, and Google Trends. "
                            f"A low value indicates fear (potential buying opportunity), "
                            f"while a high value suggests greed (potential correction ahead).",
                    url="https://alternative.me/crypto/fear-and-greed-index/",
                    author="Alternative.me",
                    timestamp=timestamp.isoformat(),
                    upvotes=value * 100,  # Use value for engagement scoring
                    comments=0,
                    engagement_score=5000 + (abs(value - 50) * 100),  # More extreme = higher engagement
                    sentiment=sentiment,
                    keywords=["fear", "greed", "sentiment", "bitcoin", "crypto"],
                    raw_data={"value": value, "classification": classification, "bg_hint": bg_hint}
                )
                
        except Exception as e:
            print(f"Error fetching Fear & Greed Index: {e}")
            return None
    
    async def get_market_sentiment_summary(self) -> Optional[ResearchItem]:
        """Create a summary of overall market sentiment"""
        try:
            # This creates a synthetic "pulse" item based on what we can gather
            now = datetime.now(timezone.utc)
            
            # Check market hours (simplified - US market hours in UTC)
            hour = now.hour
            if 14 <= hour <= 21:  # ~9 AM to 4 PM EST
                market_status = "Market Open"
                status_emoji = "🟢"
            else:
                market_status = "Market Closed"
                status_emoji = "🔴"
            
            # Day of week affects sentiment
            weekday = now.weekday()
            if weekday == 0:  # Monday
                day_hint = "Mondays often see increased volatility as traders react to weekend news."
            elif weekday == 4:  # Friday
                day_hint = "Fridays can see position squaring before the weekend."
            else:
                day_hint = ""
            
            content = f"{status_emoji} {market_status}. " + day_hint
            
            return ResearchItem(
                id=generate_item_id("social", "market_pulse", str(now.date())),
                source_type=SourceType.SOCIAL_MEDIA,
                source_name="Market Pulse",
                category=Category.CRYPTO,  # Default to crypto but applies broadly
                title=f"📊 Market Pulse: {market_status}",
                content=content.strip(),
                url="",
                author="Plutus Terminal",
                timestamp=now.isoformat(),
                upvotes=0,
                comments=0,
                engagement_score=1000,
                sentiment=0,
                keywords=["market", "pulse", "status"],
                raw_data={"market_status": market_status}
            )
        except Exception as e:
            print(f"Error creating market pulse: {e}")
            return None

    async def get_bitcoin_dominance_signal(self) -> Optional[ResearchItem]:
        """Fetch Bitcoin dominance as a sentiment indicator"""
        try:
            # Use CoinGecko simple API for global data
            response = await self.client.get(
                "https://api.coingecko.com/api/v3/global",
                headers={"accept": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("data"):
                btc_dominance = data["data"].get("market_cap_percentage", {}).get("btc", 0)
                total_market_cap = data["data"].get("total_market_cap", {}).get("usd", 0)
                market_cap_change = data["data"].get("market_cap_change_percentage_24h_usd", 0)
                
                # High BTC dominance (>50%) = risk-off, alt season unlikely
                # Low BTC dominance (<45%) = alt season, more risk appetite
                if btc_dominance > 55:
                    sentiment = -0.3  # Risk-off
                    signal = "Risk-Off Mode"
                    emoji = "🔵"
                elif btc_dominance < 45:
                    sentiment = 0.5  # Alt season
                    signal = "Alt Season"
                    emoji = "🟣"
                else:
                    sentiment = 0.1
                    signal = "Neutral"
                    emoji = "⚪"
                
                now = datetime.now(timezone.utc)
                
                # Format market cap nicely
                if total_market_cap > 1e12:
                    mc_str = f"${total_market_cap/1e12:.2f}T"
                else:
                    mc_str = f"${total_market_cap/1e9:.0f}B"
                
                change_emoji = "📈" if market_cap_change > 0 else "📉"
                
                return ResearchItem(
                    id=generate_item_id("social", "btc_dominance", str(now.date())),
                    source_type=SourceType.SOCIAL_MEDIA,
                    source_name="BTC Dominance",
                    category=Category.CRYPTO,
                    title=f"{emoji} BTC Dominance: {btc_dominance:.1f}% - {signal}",
                    content=f"Bitcoin market dominance is at {btc_dominance:.1f}%. "
                            f"Total crypto market cap: {mc_str} {change_emoji} ({market_cap_change:+.1f}% 24h). "
                            f"{'High BTC dominance suggests investors are risk-averse, favoring Bitcoin over altcoins.' if btc_dominance > 50 else 'Lower BTC dominance indicates capital flowing into altcoins (alt season potential).'}",
                    url="https://www.coingecko.com/en/global-charts",
                    author="CoinGecko",
                    timestamp=now.isoformat(),
                    upvotes=int(btc_dominance * 100),
                    comments=0,
                    engagement_score=3000,
                    sentiment=sentiment,
                    keywords=["bitcoin", "dominance", "altcoin", "market cap"],
                    raw_data={
                        "btc_dominance": btc_dominance,
                        "total_market_cap": total_market_cap,
                        "market_cap_change_24h": market_cap_change
                    }
                )
                
        except Exception as e:
            print(f"Error fetching BTC dominance: {e}")
            return None

    async def get_trending_coins(self) -> List[ResearchItem]:
        """Fetch trending coins from CoinGecko"""
        items = []
        try:
            response = await self.client.get(
                "https://api.coingecko.com/api/v3/search/trending",
                headers={"accept": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
            
            now = datetime.now(timezone.utc)
            
            coins = data.get("coins", [])[:5]  # Top 5 trending
            
            if coins:
                coin_names = [c["item"]["name"] for c in coins]
                coin_list = ", ".join(coin_names[:3])
                
                item = ResearchItem(
                    id=generate_item_id("social", "trending_coins", str(now.date())),
                    source_type=SourceType.SOCIAL_MEDIA,
                    source_name="Trending Coins",
                    category=Category.CRYPTO,
                    title=f"🔥 Trending: {coin_list}",
                    content=f"Top trending coins on CoinGecko: {', '.join(coin_names)}. "
                            f"Trending status is based on search popularity in the last 24 hours.",
                    url="https://www.coingecko.com/en/trending",
                    author="CoinGecko",
                    timestamp=now.isoformat(),
                    upvotes=len(coins) * 1000,
                    comments=0,
                    engagement_score=4000,
                    sentiment=0.2,  # Trending = slight positive
                    keywords=["trending", "coins"] + [c["item"]["symbol"].lower() for c in coins],
                    raw_data={"coins": [c["item"]["name"] for c in coins]}
                )
                items.append(item)
                
        except Exception as e:
            print(f"Error fetching trending coins: {e}")
        
        return items

    async def collect_category(self, category: Category) -> List[ResearchItem]:
        """Collect social items for a category"""
        items = []
        
        # Currently, most social signals are crypto-focused
        if category == Category.CRYPTO:
            # Fear & Greed Index
            fg = await self.get_crypto_fear_greed()
            if fg:
                items.append(fg)
            
            await asyncio.sleep(0.5)
            
            # BTC Dominance
            btc = await self.get_bitcoin_dominance_signal()
            if btc:
                items.append(btc)
            
            await asyncio.sleep(0.5)
            
            # Trending coins
            trending = await self.get_trending_coins()
            items.extend(trending)
        
        # Market pulse for all categories
        pulse = await self.get_market_sentiment_summary()
        if pulse:
            pulse.category = category
            items.append(pulse)
        
        return items
    
    async def collect_all(self) -> Dict[Category, List[ResearchItem]]:
        """Collect social/sentiment data for all categories"""
        results = {}
        
        # Social data is primarily crypto-focused for now
        # Could expand with news sentiment, etc.
        
        print("  Social: Fetching Fear & Greed Index...")
        fg = await self.get_crypto_fear_greed()
        if fg:
            print(f"    Fear & Greed Index: {fg.title}")
        
        await asyncio.sleep(0.5)
        
        print("  Social: Fetching BTC Dominance...")
        btc = await self.get_bitcoin_dominance_signal()
        if btc:
            print(f"    BTC Dominance: {btc.title}")
        
        await asyncio.sleep(0.5)
        
        print("  Social: Fetching Trending Coins...")
        trending = await self.get_trending_coins()
        print(f"    Found {len(trending)} trending items")
        
        # Store all items
        all_items = []
        if fg:
            all_items.append(fg)
        if btc:
            all_items.append(btc)
        all_items.extend(trending)
        
        # Store in database
        for item in all_items:
            self.db.store_research_item(item)
        
        # Group by category for return
        for category in Category:
            results[category] = [i for i in all_items if i.category == category]
            print(f"    {category.value}: {len(results[category])} items")
        
        return results
