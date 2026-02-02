"""
Reddit Research Collector
Scrapes relevant subreddits for prediction market intelligence
Uses Reddit's public JSON API (no authentication required)
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


# Subreddit mappings by category
SUBREDDIT_CONFIG = {
    Category.POLITICS: [
        {"name": "politics", "weight": 1.0},
        {"name": "PoliticalDiscussion", "weight": 1.2},
        {"name": "news", "weight": 0.8},
        {"name": "worldnews", "weight": 0.8},
        {"name": "Conservative", "weight": 1.0},
        {"name": "Liberal", "weight": 1.0},
        {"name": "moderatepolitics", "weight": 1.3},
    ],
    Category.SPORTS: [
        {"name": "sports", "weight": 1.0},
        {"name": "nfl", "weight": 1.2},
        {"name": "nba", "weight": 1.2},
        {"name": "soccer", "weight": 1.2},
        {"name": "baseball", "weight": 1.1},
        {"name": "hockey", "weight": 1.1},
        {"name": "MMA", "weight": 1.3},
        {"name": "sportsbook", "weight": 1.5},
    ],
    Category.CRYPTO: [
        {"name": "CryptoCurrency", "weight": 1.2},
        {"name": "Bitcoin", "weight": 1.3},
        {"name": "ethereum", "weight": 1.2},
        {"name": "solana", "weight": 1.1},
        {"name": "CryptoMarkets", "weight": 1.4},
        {"name": "defi", "weight": 1.1},
    ],
    Category.ENTERTAINMENT: [
        {"name": "movies", "weight": 1.0},
        {"name": "television", "weight": 1.0},
        {"name": "Oscars", "weight": 1.5},
        {"name": "boxoffice", "weight": 1.4},
        {"name": "popheads", "weight": 1.0},
    ],
}

# Universal subreddits for prediction market discussions
UNIVERSAL_SUBREDDITS = [
    {"name": "polymarket", "weight": 2.0},
    {"name": "Metaculus", "weight": 1.8},
    {"name": "PredictionMarket", "weight": 1.8},
]


class RedditCollector:
    """
    Collects research data from Reddit using the public JSON API
    """
    
    BASE_URL = "https://www.reddit.com"
    
    def __init__(self, db: ResearchDatabase):
        self.db = db
        self.client = httpx.AsyncClient(
            headers={"User-Agent": "PolymarketResearch/1.0"},
            timeout=30.0
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def fetch_subreddit(self, subreddit: str, sort: str = "hot", 
                              limit: int = 25) -> List[Dict]:
        """Fetch posts from a subreddit"""
        url = f"{self.BASE_URL}/r/{subreddit}/{sort}.json"
        params = {"limit": limit, "raw_json": 1}
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            posts = []
            for child in data.get("data", {}).get("children", []):
                posts.append(child.get("data", {}))
            return posts
            
        except Exception as e:
            print(f"Error fetching r/{subreddit}: {e}")
            return []
    
    def _parse_post(self, post: Dict, category: Category, 
                    source_weight: float) -> Optional[ResearchItem]:
        """Parse a Reddit post into a ResearchItem"""
        try:
            # Skip removed/deleted posts
            if post.get("removed_by_category") or post.get("selftext") == "[removed]":
                return None
            
            # Calculate time since posting
            created_utc = post.get("created_utc", 0)
            post_time = datetime.fromtimestamp(created_utc, tz=timezone.utc)
            hours_old = (datetime.now(timezone.utc) - post_time).total_seconds() / 3600
            
            # Skip old posts (>7 days)
            if hours_old > 168:
                return None
            
            upvotes = post.get("ups", 0)
            comments = post.get("num_comments", 0)
            
            engagement = calculate_engagement_score(
                upvotes=upvotes,
                comments=comments,
                hours_old=hours_old,
                source_weight=source_weight
            )
            
            title = post.get("title", "")
            selftext = post.get("selftext", "")
            content = f"{title}\n\n{selftext}".strip() if selftext else title
            
            permalink = post.get("permalink", "")
            url = f"https://reddit.com{permalink}" if permalink else ""
            
            # Analyze sentiment and extract keywords
            sentiment = analyze_sentiment_keywords(content)
            keywords = extract_keywords(content, category)
            
            return ResearchItem(
                id=generate_item_id("reddit", url, title),
                source_type=SourceType.REDDIT,
                source_name=f"r/{post.get('subreddit', 'unknown')}",
                category=category,
                title=title,
                content=content[:5000],
                url=url,
                author=post.get("author", "unknown"),
                timestamp=post_time.isoformat(),
                upvotes=upvotes,
                comments=comments,
                engagement_score=engagement,
                sentiment=sentiment,
                keywords=keywords,
                raw_data={
                    "subreddit": post.get("subreddit"),
                    "post_id": post.get("id"),
                    "score": post.get("score"),
                    "upvote_ratio": post.get("upvote_ratio"),
                }
            )
            
        except Exception as e:
            print(f"Error parsing post: {e}")
            return None
    
    async def collect_category(self, category: Category) -> List[ResearchItem]:
        """Collect all research items for a category"""
        items = []
        
        # Get category-specific subreddits
        subreddits = SUBREDDIT_CONFIG.get(category, [])
        all_subreddits = subreddits + UNIVERSAL_SUBREDDITS
        
        for sub_config in all_subreddits:
            subreddit = sub_config["name"]
            weight = sub_config["weight"]
            
            # Fetch hot posts
            posts = await self.fetch_subreddit(subreddit, sort="hot", limit=15)
            for post in posts:
                item = self._parse_post(post, category, weight)
                if item:
                    items.append(item)
            
            # Fetch new posts (for breaking news)
            new_posts = await self.fetch_subreddit(subreddit, sort="new", limit=10)
            for post in new_posts:
                item = self._parse_post(post, category, weight * 1.2)
                if item:
                    items.append(item)
            
            await asyncio.sleep(0.5)  # Rate limiting
        
        # Deduplicate
        seen_ids = set()
        unique_items = []
        for item in items:
            if item.id not in seen_ids:
                seen_ids.add(item.id)
                unique_items.append(item)
        
        return unique_items
    
    async def collect_all(self) -> Dict[Category, List[ResearchItem]]:
        """Collect research items for all categories"""
        results = {}
        
        for category in Category:
            print(f"  Reddit: Collecting {category.value}...")
            items = await self.collect_category(category)
            results[category] = items
            
            for item in items:
                self.db.store_research_item(item)
            
            print(f"    Found {len(items)} items")
        
        return results
