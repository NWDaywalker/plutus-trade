"""
Kalshi Prediction Market Collector
Kalshi is a CFTC-regulated exchange - the only legal prediction market for US residents
https://kalshi.com

API Docs: https://trading-api.readme.io/reference/getmarkets
"""

import httpx
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
import json

from .engine import (
    ResearchItem, ResearchDatabase, SourceType, Category,
    generate_item_id, calculate_engagement_score
)


# Category mapping for Kalshi market categories
KALSHI_CATEGORY_MAP = {
    # Politics
    "Politics": Category.POLITICS,
    "Elections": Category.POLITICS,
    "Congress": Category.POLITICS,
    "Supreme Court": Category.POLITICS,
    "US Government": Category.POLITICS,
    "World Politics": Category.POLITICS,
    
    # Economics/Finance (map to Politics for now)
    "Economics": Category.POLITICS,
    "Fed": Category.POLITICS,
    "Inflation": Category.POLITICS,
    "Interest Rates": Category.POLITICS,
    
    # Crypto
    "Crypto": Category.CRYPTO,
    "Bitcoin": Category.CRYPTO,
    "Ethereum": Category.CRYPTO,
    
    # Sports
    "Sports": Category.SPORTS,
    "NFL": Category.SPORTS,
    "NBA": Category.SPORTS,
    "MLB": Category.SPORTS,
    "NHL": Category.SPORTS,
    "Soccer": Category.SPORTS,
    "Golf": Category.SPORTS,
    "Tennis": Category.SPORTS,
    "UFC": Category.SPORTS,
    "Boxing": Category.SPORTS,
    
    # Entertainment
    "Entertainment": Category.ENTERTAINMENT,
    "Awards": Category.ENTERTAINMENT,
    "Oscars": Category.ENTERTAINMENT,
    "Emmys": Category.ENTERTAINMENT,
    "TV": Category.ENTERTAINMENT,
    "Movies": Category.ENTERTAINMENT,
    
    # Weather/Science (map to Politics as "current events")
    "Weather": Category.POLITICS,
    "Climate": Category.POLITICS,
    "Science": Category.POLITICS,
    "Space": Category.ENTERTAINMENT,
    
    # Tech
    "Tech": Category.CRYPTO,  # Often crypto-adjacent
    "AI": Category.CRYPTO,
}


class KalshiCollector:
    """Collects prediction market data from Kalshi"""
    
    # Kalshi public API endpoint
    API_BASE = "https://api.elections.kalshi.com/trade-api/v2"
    
    def __init__(self, db: ResearchDatabase, api_key: str = None):
        self.db = db
        self.api_key = api_key  # Optional - for authenticated endpoints
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        }
        
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        
        self.client = httpx.AsyncClient(
            headers=headers,
            timeout=30.0
        )
    
    async def close(self):
        await self.client.aclose()
    
    def _map_category(self, market_data: dict) -> Category:
        """Map Kalshi market category to our category system"""
        # Try series_ticker first, then category
        category_str = market_data.get("category", "")
        series = market_data.get("series_ticker", "")
        title = market_data.get("title", "").lower()
        
        # Check series ticker patterns
        if any(x in series.upper() for x in ["PRES", "ELECT", "CONG", "GOV", "SENATE"]):
            return Category.POLITICS
        if any(x in series.upper() for x in ["BTC", "ETH", "CRYPTO"]):
            return Category.CRYPTO
        if any(x in series.upper() for x in ["NFL", "NBA", "MLB", "NHL", "UFC", "SPORT"]):
            return Category.SPORTS
        if any(x in series.upper() for x in ["OSCAR", "EMMY", "AWARD"]):
            return Category.ENTERTAINMENT
        
        # Check title keywords
        if any(x in title for x in ["trump", "biden", "president", "election", "congress", "senate"]):
            return Category.POLITICS
        if any(x in title for x in ["bitcoin", "crypto", "ethereum", "btc", "eth"]):
            return Category.CRYPTO
        if any(x in title for x in ["super bowl", "nfl", "nba", "mlb", "world series", "playoff"]):
            return Category.SPORTS
        if any(x in title for x in ["oscar", "emmy", "grammy", "box office", "movie", "album"]):
            return Category.ENTERTAINMENT
        
        # Try category map
        for key, cat in KALSHI_CATEGORY_MAP.items():
            if key.lower() in category_str.lower():
                return cat
        
        # Default to politics (most common on Kalshi)
        return Category.POLITICS
    
    async def fetch_markets(self, status: str = "open", limit: int = 200) -> List[Dict]:
        """Fetch markets from Kalshi API"""
        try:
            params = {
                "status": status,
                "limit": limit,
            }
            
            response = await self.client.get(
                f"{self.API_BASE}/markets",
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            return data.get("markets", [])
            
        except Exception as e:
            print(f"Error fetching Kalshi markets: {e}")
            return []
    
    async def fetch_events(self, status: str = "open", limit: int = 100) -> List[Dict]:
        """Fetch events (groups of related markets) from Kalshi"""
        try:
            params = {
                "status": status,
                "limit": limit,
            }
            
            response = await self.client.get(
                f"{self.API_BASE}/events",
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            return data.get("events", [])
            
        except Exception as e:
            print(f"Error fetching Kalshi events: {e}")
            return []
    
    def _parse_market(self, market: dict) -> Optional[ResearchItem]:
        """Parse a Kalshi market into a ResearchItem"""
        try:
            ticker = market.get("ticker", "")
            title = market.get("title", "")
            
            if not ticker or not title:
                return None
            
            # Get pricing - Kalshi uses cents (0-100)
            yes_price = market.get("yes_bid", 0) or market.get("last_price", 50)
            no_price = 100 - yes_price if yes_price else 50
            
            # Volume in dollars
            volume = market.get("volume", 0) or 0
            volume_24h = market.get("volume_24h", 0) or 0
            open_interest = market.get("open_interest", 0) or 0
            
            # Timestamps
            close_time = market.get("close_time", "")
            
            # Determine category
            category = self._map_category(market)
            
            # Build content
            subtitle = market.get("subtitle", "") or market.get("rules_primary", "")
            
            content = f"Question: {title}\n\n"
            if subtitle:
                content += f"{subtitle}\n\n"
            content += f"YES: {yes_price}¢ | NO: {no_price}¢\n"
            content += f"Volume: ${volume:,.0f}"
            if volume_24h > 0:
                content += f" (${volume_24h:,.0f} 24h)"
            content += f"\nOpen Interest: ${open_interest:,.0f}"
            
            if close_time:
                try:
                    close_dt = datetime.fromisoformat(close_time.replace('Z', '+00:00'))
                    days_left = (close_dt - datetime.now(timezone.utc)).days
                    if days_left >= 0:
                        content += f"\nCloses in: {days_left} days"
                except:
                    pass
            
            # Calculate engagement score
            # Kalshi volumes are typically lower than Polymarket
            engagement = calculate_engagement_score(
                upvotes=int(volume / 10),  # Scale down
                comments=int(open_interest / 100),
                hours_old=1,  # Recent
                source_weight=1.6  # Regulated market premium
            )
            
            # Sentiment based on yes price (>60 = bullish consensus, <40 = bearish)
            if yes_price > 60:
                sentiment = 0.3 + (yes_price - 60) / 100
            elif yes_price < 40:
                sentiment = -0.3 - (40 - yes_price) / 100
            else:
                sentiment = 0
            
            # Extract keywords from title
            keywords = ["kalshi", "prediction", "market"]
            title_lower = title.lower()
            if "trump" in title_lower:
                keywords.append("trump")
            if "biden" in title_lower:
                keywords.append("biden")
            if "bitcoin" in title_lower or "btc" in title_lower:
                keywords.append("bitcoin")
            if "fed" in title_lower or "rate" in title_lower:
                keywords.extend(["fed", "rates"])
            
            url = f"https://kalshi.com/markets/{ticker}"
            
            return ResearchItem(
                id=generate_item_id("kalshi", ticker, ""),
                source_type=SourceType.PREDICTION_MARKET,
                source_name="Kalshi",
                category=category,
                title=f"{title} (YES: {yes_price}¢)",
                content=content,
                url=url,
                author="Kalshi",
                timestamp=datetime.now(timezone.utc).isoformat(),
                upvotes=int(volume),
                comments=int(open_interest),
                engagement_score=engagement,
                sentiment=sentiment,
                keywords=keywords,
                raw_data={
                    "ticker": ticker,
                    "yes_price": yes_price,
                    "no_price": no_price,
                    "volume": volume,
                    "volume_24h": volume_24h,
                    "open_interest": open_interest,
                    "close_time": close_time,
                    "status": market.get("status"),
                }
            )
            
        except Exception as e:
            print(f"Error parsing Kalshi market: {e}")
            return None
    
    async def collect_category(self, category: Category) -> List[ResearchItem]:
        """Collect Kalshi markets for a specific category"""
        items = []
        
        # Fetch all open markets
        markets = await self.fetch_markets(status="open", limit=200)
        
        for market in markets:
            parsed = self._parse_market(market)
            if parsed and parsed.category == category:
                items.append(parsed)
        
        # Sort by engagement/volume
        items.sort(key=lambda x: x.engagement_score, reverse=True)
        
        return items[:50]  # Top 50 per category
    
    async def collect_all(self) -> Dict[Category, List[ResearchItem]]:
        """Collect all Kalshi markets"""
        results = {cat: [] for cat in Category}
        
        print("  Kalshi: Fetching markets...")
        markets = await self.fetch_markets(status="open", limit=500)
        print(f"    Found {len(markets)} open markets")
        
        for market in markets:
            parsed = self._parse_market(market)
            if parsed:
                results[parsed.category].append(parsed)
                self.db.store_research_item(parsed)
        
        # Print category counts
        for category in Category:
            # Sort by engagement
            results[category].sort(key=lambda x: x.engagement_score, reverse=True)
            results[category] = results[category][:50]  # Keep top 50
            print(f"    {category.value}: {len(results[category])} items")
        
        return results
    
    async def get_top_markets(self, limit: int = 20) -> List[ResearchItem]:
        """Get top markets by volume across all categories"""
        markets = await self.fetch_markets(status="open", limit=200)
        
        items = []
        for market in markets:
            parsed = self._parse_market(market)
            if parsed:
                items.append(parsed)
        
        # Sort by volume (stored in upvotes)
        items.sort(key=lambda x: x.upvotes, reverse=True)
        
        return items[:limit]
