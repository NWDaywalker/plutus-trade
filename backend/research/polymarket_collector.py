"""
Polymarket Collector
Direct integration with Polymarket's CLOB API for real-time market data
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


# Category keywords for Polymarket markets
CATEGORY_KEYWORDS = {
    Category.POLITICS: [
        "election", "trump", "biden", "harris", "president", "congress", 
        "senate", "governor", "democrat", "republican", "vote", "primary",
        "cabinet", "supreme court", "impeach"
    ],
    Category.SPORTS: [
        "nfl", "nba", "mlb", "nhl", "ufc", "super bowl", "playoffs", 
        "championship", "world series", "finals", "mvp", "win", "match",
        "boxing", "tennis", "golf"
    ],
    Category.CRYPTO: [
        "bitcoin", "btc", "ethereum", "eth", "crypto", "solana", "sol",
        "price", "etf", "sec", "binance", "coinbase", "defi", "memecoin"
    ],
    Category.ENTERTAINMENT: [
        "oscar", "emmy", "grammy", "golden globe", "movie", "film", 
        "netflix", "box office", "album", "taylor swift", "award"
    ],
}


class PolymarketCollector:
    """
    Collects market data directly from Polymarket's CLOB API
    """
    
    # Polymarket CLOB API
    CLOB_API = "https://clob.polymarket.com"
    GAMMA_API = "https://gamma-api.polymarket.com"
    
    def __init__(self, db: ResearchDatabase):
        self.db = db
        self.client = httpx.AsyncClient(
            headers={
                "User-Agent": "PlutusTerminal/1.0",
                "Accept": "application/json",
            },
            timeout=30.0
        )
    
    async def close(self):
        await self.client.aclose()
    
    def _categorize_market(self, question: str, description: str = "") -> Optional[Category]:
        """Determine category from market question"""
        text = (question + " " + description).lower()
        
        # Score each category
        scores = {}
        for category, keywords in CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                scores[category] = score
        
        if not scores:
            return None
        
        # Return highest scoring category
        return max(scores, key=scores.get)
    
    async def fetch_markets(self, limit: int = 100, active: bool = True) -> List[Dict]:
        """Fetch markets from Polymarket Gamma API"""
        try:
            url = f"{self.GAMMA_API}/markets"
            params = {
                "limit": limit,
                "active": str(active).lower(),
                "closed": "false",
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"Error fetching Polymarket markets: {e}")
            return []
    
    async def fetch_market_by_slug(self, slug: str) -> Optional[Dict]:
        """Fetch a specific market by slug"""
        try:
            url = f"{self.GAMMA_API}/markets/{slug}"
            response = await self.client.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching market {slug}: {e}")
            return None
    
    async def fetch_events(self, limit: int = 50) -> List[Dict]:
        """Fetch events (grouped markets) from Polymarket"""
        try:
            url = f"{self.GAMMA_API}/events"
            params = {
                "limit": limit,
                "active": "true",
                "closed": "false",
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"Error fetching Polymarket events: {e}")
            return []
    
    def _parse_market(self, market: Dict) -> Optional[ResearchItem]:
        """Parse a Polymarket market into a ResearchItem"""
        try:
            question = market.get("question", "")
            if not question:
                return None
            
            description = market.get("description", "") or ""
            category = self._categorize_market(question, description)
            if not category:
                return None
            
            # Market identifiers
            condition_id = market.get("conditionId", "")
            slug = market.get("slug", condition_id)
            
            # Construct URL
            url = f"https://polymarket.com/event/{slug}" if slug else ""
            
            # Get outcome prices
            outcomes = market.get("outcomes", [])
            outcome_prices = market.get("outcomePrices", [])
            
            yes_price = None
            no_price = None
            
            if outcome_prices:
                try:
                    prices = [float(p) for p in outcome_prices]
                    if len(prices) >= 2:
                        yes_price = prices[0]
                        no_price = prices[1]
                except:
                    pass
            
            # Volume and liquidity
            volume = float(market.get("volume", 0) or 0)
            liquidity = float(market.get("liquidity", 0) or 0)
            
            # Calculate engagement score
            engagement = calculate_engagement_score(
                upvotes=int(volume / 100),  # Normalize volume
                comments=int(liquidity / 50),
                hours_old=24,
                source_weight=2.0  # High weight for direct market data
            )
            
            # Build content
            content = f"Question: {question}\n\n"
            if yes_price is not None:
                content += f"YES: {yes_price*100:.1f}¢\n"
                content += f"NO: {no_price*100:.1f}¢\n"
            content += f"Volume: ${volume:,.0f}\n"
            content += f"Liquidity: ${liquidity:,.0f}\n"
            if description:
                content += f"\n{description[:500]}"
            
            # Sentiment from YES price (>50% = bullish sentiment on the question)
            sentiment = 0.0
            if yes_price is not None:
                sentiment = (yes_price - 0.5) * 2
            
            keywords = extract_keywords(question + " " + description, category)
            
            # Timestamps
            created_at = market.get("createdAt") or market.get("startDate")
            if created_at:
                try:
                    if isinstance(created_at, str):
                        created_at = created_at
                    else:
                        created_at = datetime.fromtimestamp(created_at/1000, tz=timezone.utc).isoformat()
                except:
                    created_at = datetime.now(timezone.utc).isoformat()
            else:
                created_at = datetime.now(timezone.utc).isoformat()
            
            return ResearchItem(
                id=generate_item_id("polymarket", url, question),
                source_type=SourceType.PREDICTION_MARKET,
                source_name="Polymarket",
                category=category,
                title=question,
                content=content,
                url=url,
                author="Polymarket",
                timestamp=created_at,
                upvotes=int(volume / 100),
                comments=int(liquidity / 50),
                engagement_score=engagement,
                sentiment=sentiment,
                keywords=keywords,
                raw_data={
                    "condition_id": condition_id,
                    "slug": slug,
                    "yes_price": yes_price,
                    "no_price": no_price,
                    "volume": volume,
                    "liquidity": liquidity,
                    "outcomes": outcomes,
                    "end_date": market.get("endDate"),
                }
            )
            
        except Exception as e:
            print(f"Error parsing Polymarket market: {e}")
            return None
    
    async def collect_all(self) -> Dict[Category, List[ResearchItem]]:
        """Collect all Polymarket data"""
        results = {cat: [] for cat in Category}
        
        print("  Polymarket: Fetching active markets...")
        
        # Fetch markets
        markets = await self.fetch_markets(limit=200)
        
        for market in markets:
            item = self._parse_market(market)
            if item:
                results[item.category].append(item)
                self.db.store_research_item(item)
        
        await asyncio.sleep(0.5)
        
        # Also fetch events for grouped markets
        print("  Polymarket: Fetching events...")
        events = await self.fetch_events(limit=100)
        
        for event in events:
            # Events contain multiple markets
            event_markets = event.get("markets", [])
            for market in event_markets:
                item = self._parse_market(market)
                if item:
                    # Check if not duplicate
                    if item.id not in [x.id for x in results[item.category]]:
                        results[item.category].append(item)
                        self.db.store_research_item(item)
        
        for category, items in results.items():
            print(f"    {category.value}: {len(items)} items")
        
        return results
