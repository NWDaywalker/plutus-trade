"""
Social Media Collector
Aggregates sentiment from Twitter/X (via Nitter RSS), Crypto Fear & Greed, and other social signals
"""

import httpx
import asyncio
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional

from .engine import (
    ResearchItem, ResearchDatabase, SourceType, Category,
    generate_item_id, calculate_engagement_score,
    analyze_sentiment_keywords, extract_keywords
)


# Nitter instances (public Twitter mirrors with RSS feeds)
NITTER_INSTANCES = [
    "https://nitter.privacydev.net",
    "https://nitter.poast.org", 
    "https://nitter.cz",
]

# Influential accounts by category
TWITTER_ACCOUNTS = {
    Category.POLITICS: [
        "POTUS", "VP", "SpeakerJohnson", "AOC", "tedcruz",
        "RealClearNews", "politikiski", "PpolsciProffesr", 
        "nikiski", "NateSilver538", "Redistrict"
    ],
    Category.SPORTS: [
        "ESPN", "BleacherReport", "TheAthletic", "AdamSchefter",
        "wojespn", "ShamsCharania", "JeffPassan", "RapSheet"
    ],
    Category.CRYPTO: [
        "VitalikButerin", "saborinetti", "aantonop", "balajis",
        "CryptoHayes", "zaborin", "CoinDesk", "whale_alert"
    ],
    Category.ENTERTAINMENT: [
        "Variety", "THR", "Deadline", "FilmUpdates",
        "DiscussingFilm", "AwardsWatch", "GoldDerby"
    ],
}

# Crypto Fear & Greed API
FEAR_GREED_API = "https://api.alternative.me/fng/"


class SocialMediaCollector:
    """
    Collects social sentiment from various sources:
    - Twitter/X via Nitter RSS
    - Crypto Fear & Greed Index
    - Social trending topics
    """
    
    def __init__(self, db: ResearchDatabase):
        self.db = db
        self.client = httpx.AsyncClient(
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            timeout=30.0,
            follow_redirects=True
        )
        self.working_nitter = None
    
    async def close(self):
        await self.client.aclose()
    
    async def _find_working_nitter(self) -> Optional[str]:
        """Find a working Nitter instance"""
        if self.working_nitter:
            return self.working_nitter
        
        for instance in NITTER_INSTANCES:
            try:
                response = await self.client.get(f"{instance}/search", timeout=5.0)
                if response.status_code < 500:
                    self.working_nitter = instance
                    print(f"    Using Nitter instance: {instance}")
                    return instance
            except:
                continue
        
        print("    Warning: No working Nitter instance found")
        return None
    
    async def fetch_user_tweets(self, username: str, limit: int = 10) -> List[Dict]:
        """Fetch recent tweets from a user via Nitter RSS"""
        nitter = await self._find_working_nitter()
        if not nitter:
            return []
        
        try:
            url = f"{nitter}/{username}/rss"
            response = await self.client.get(url, timeout=10.0)
            
            if response.status_code != 200:
                return []
            
            root = ET.fromstring(response.content)
            items = []
            
            for item in root.findall('.//item')[:limit]:
                title = item.findtext('title', '')
                link = item.findtext('link', '')
                pub_date = item.findtext('pubDate', '')
                description = item.findtext('description', '')
                
                # Parse date
                timestamp = datetime.now(timezone.utc).isoformat()
                if pub_date:
                    try:
                        dt = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %Z")
                        timestamp = dt.replace(tzinfo=timezone.utc).isoformat()
                    except:
                        pass
                
                # Clean HTML from description
                clean_desc = re.sub(r'<[^>]+>', '', description)
                
                # Convert Nitter link back to Twitter
                twitter_link = link.replace(nitter, "https://twitter.com")
                
                items.append({
                    "title": title[:280] if title else clean_desc[:280],
                    "content": clean_desc,
                    "url": twitter_link,
                    "author": username,
                    "timestamp": timestamp,
                })
            
            return items
            
        except Exception as e:
            # Silently fail for individual accounts
            return []
    
    async def search_nitter(self, query: str, limit: int = 20) -> List[Dict]:
        """Search tweets via Nitter"""
        nitter = await self._find_working_nitter()
        if not nitter:
            return []
        
        try:
            url = f"{nitter}/search/rss"
            params = {"f": "tweets", "q": query}
            
            response = await self.client.get(url, params=params, timeout=10.0)
            
            if response.status_code != 200:
                return []
            
            root = ET.fromstring(response.content)
            items = []
            
            for item in root.findall('.//item')[:limit]:
                title = item.findtext('title', '')
                link = item.findtext('link', '')
                pub_date = item.findtext('pubDate', '')
                
                timestamp = datetime.now(timezone.utc).isoformat()
                if pub_date:
                    try:
                        dt = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %Z")
                        timestamp = dt.replace(tzinfo=timezone.utc).isoformat()
                    except:
                        pass
                
                twitter_link = link.replace(nitter, "https://twitter.com")
                
                # Extract username from URL
                username = "unknown"
                if "/status/" in twitter_link:
                    parts = twitter_link.split("/")
                    if len(parts) >= 4:
                        username = parts[3]
                
                items.append({
                    "title": title[:280],
                    "content": title,
                    "url": twitter_link,
                    "author": username,
                    "timestamp": timestamp,
                })
            
            return items
            
        except Exception as e:
            return []
    
    async def fetch_fear_greed_index(self) -> Optional[Dict]:
        """Fetch Crypto Fear & Greed Index"""
        try:
            response = await self.client.get(FEAR_GREED_API, params={"limit": 1})
            response.raise_for_status()
            
            data = response.json()
            if data.get("data"):
                return data["data"][0]
            return None
            
        except Exception as e:
            print(f"Error fetching Fear & Greed: {e}")
            return None
    
    def _parse_tweet(self, tweet: Dict, category: Category, 
                     source_weight: float = 1.0) -> Optional[ResearchItem]:
        """Parse a tweet into a ResearchItem"""
        try:
            title = tweet.get("title", "")
            if not title:
                return None
            
            content = tweet.get("content", title)
            url = tweet.get("url", "")
            author = tweet.get("author", "unknown")
            timestamp = tweet.get("timestamp", datetime.now(timezone.utc).isoformat())
            
            try:
                tweet_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                hours_old = (datetime.now(timezone.utc) - tweet_time).total_seconds() / 3600
            except:
                hours_old = 24
            
            # Skip old tweets
            if hours_old > 72:
                return None
            
            engagement = calculate_engagement_score(
                upvotes=50,  # Base score for tweets
                comments=10,
                hours_old=hours_old,
                source_weight=source_weight
            )
            
            sentiment = analyze_sentiment_keywords(title + " " + content)
            keywords = extract_keywords(title + " " + content, category)
            
            return ResearchItem(
                id=generate_item_id("twitter", url, title),
                source_type=SourceType.SOCIAL_MEDIA,
                source_name=f"@{author}",
                category=category,
                title=title,
                content=content[:1000],
                url=url,
                author=author,
                timestamp=timestamp,
                upvotes=0,
                comments=0,
                engagement_score=engagement,
                sentiment=sentiment,
                keywords=keywords,
                raw_data={"platform": "twitter"}
            )
            
        except Exception as e:
            return None
    
    def _parse_fear_greed(self, data: Dict) -> Optional[ResearchItem]:
        """Parse Fear & Greed data into a ResearchItem"""
        try:
            value = int(data.get("value", 50))
            classification = data.get("value_classification", "Neutral")
            timestamp = data.get("timestamp", "")
            
            if timestamp:
                timestamp = datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
            else:
                timestamp = datetime.now(timezone.utc).isoformat()
            
            title = f"Crypto Fear & Greed Index: {value} ({classification})"
            
            content = f"Current Index: {value}/100\n"
            content += f"Classification: {classification}\n\n"
            
            if value <= 25:
                content += "Market sentiment is in Extreme Fear. Historically, this has been a buying opportunity."
            elif value <= 45:
                content += "Market sentiment shows Fear. Investors are cautious."
            elif value <= 55:
                content += "Market sentiment is Neutral. Wait and see approach."
            elif value <= 75:
                content += "Market sentiment shows Greed. FOMO may be setting in."
            else:
                content += "Market sentiment is in Extreme Greed. Caution advised - potential correction ahead."
            
            # Convert to sentiment score (-1 to 1)
            sentiment = (value - 50) / 50
            
            url = "https://alternative.me/crypto/fear-and-greed-index/"
            
            return ResearchItem(
                id=generate_item_id("feargreed", url, title),
                source_type=SourceType.SOCIAL_MEDIA,
                source_name="Fear & Greed Index",
                category=Category.CRYPTO,
                title=title,
                content=content,
                url=url,
                author="Alternative.me",
                timestamp=timestamp,
                upvotes=value,  # Use value as pseudo-engagement
                comments=0,
                engagement_score=value * 2,  # High visibility indicator
                sentiment=sentiment,
                keywords=["bitcoin", "crypto", "sentiment", "fear", "greed"],
                raw_data={
                    "value": value,
                    "classification": classification,
                }
            )
            
        except Exception as e:
            print(f"Error parsing Fear & Greed: {e}")
            return None
    
    async def collect_category(self, category: Category) -> List[ResearchItem]:
        """Collect social media items for a category"""
        items = []
        
        accounts = TWITTER_ACCOUNTS.get(category, [])
        
        # Fetch from influential accounts
        for account in accounts[:5]:  # Limit to avoid rate limits
            tweets = await self.fetch_user_tweets(account, limit=5)
            
            for tweet in tweets:
                item = self._parse_tweet(tweet, category, source_weight=1.5)
                if item:
                    items.append(item)
            
            await asyncio.sleep(0.5)
        
        # Deduplicate
        seen_ids = set()
        unique_items = []
        for item in items:
            if item.id not in seen_ids:
                seen_ids.add(item.id)
                unique_items.append(item)
        
        return unique_items
    
    async def collect_all(self) -> Dict[Category, List[ResearchItem]]:
        """Collect from all social media sources"""
        results = {cat: [] for cat in Category}
        
        # Collect Fear & Greed Index first (always works)
        print("  Social: Fetching Crypto Fear & Greed Index...")
        fg_data = await self.fetch_fear_greed_index()
        if fg_data:
            item = self._parse_fear_greed(fg_data)
            if item:
                results[Category.CRYPTO].append(item)
                self.db.store_research_item(item)
                print(f"    Fear & Greed: {fg_data.get('value')} ({fg_data.get('value_classification')})")
        
        # Collect from Twitter/Nitter
        print("  Social: Fetching Twitter/X via Nitter...")
        
        for category in Category:
            items = await self.collect_category(category)
            
            for item in items:
                results[category].append(item)
                self.db.store_research_item(item)
            
            print(f"    {category.value}: {len(items)} items")
            await asyncio.sleep(0.3)
        
        return results
