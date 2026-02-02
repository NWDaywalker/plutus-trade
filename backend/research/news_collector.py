"""
News Research Collector
Aggregates news from RSS feeds and Google News
"""

import httpx
import asyncio
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from urllib.parse import quote_plus

from .engine import (
    ResearchItem, ResearchDatabase, SourceType, Category,
    generate_item_id, calculate_engagement_score,
    analyze_sentiment_keywords, extract_keywords
)


# RSS feeds by category
RSS_FEEDS = {
    Category.POLITICS: [
        {"url": "https://feeds.bbci.co.uk/news/politics/rss.xml", "name": "BBC Politics", "weight": 1.5},
        {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", "name": "NYT Politics", "weight": 1.5},
        {"url": "https://www.politico.com/rss/politicopicks.xml", "name": "Politico", "weight": 1.6},
        {"url": "https://thehill.com/feed/", "name": "The Hill", "weight": 1.4},
    ],
    Category.SPORTS: [
        {"url": "https://www.espn.com/espn/rss/news", "name": "ESPN", "weight": 1.5},
        {"url": "https://sports.yahoo.com/rss/", "name": "Yahoo Sports", "weight": 1.3},
        {"url": "https://www.cbssports.com/rss/headlines/", "name": "CBS Sports", "weight": 1.3},
    ],
    Category.CRYPTO: [
        {"url": "https://cointelegraph.com/rss", "name": "CoinTelegraph", "weight": 1.5},
        {"url": "https://www.coindesk.com/arc/outboundfeeds/rss/", "name": "CoinDesk", "weight": 1.5},
        {"url": "https://decrypt.co/feed", "name": "Decrypt", "weight": 1.3},
    ],
    Category.ENTERTAINMENT: [
        {"url": "https://variety.com/feed/", "name": "Variety", "weight": 1.5},
        {"url": "https://www.hollywoodreporter.com/feed/", "name": "Hollywood Reporter", "weight": 1.5},
        {"url": "https://deadline.com/feed/", "name": "Deadline", "weight": 1.5},
    ],
}

# Google News search terms by category
GOOGLE_NEWS_TERMS = {
    Category.POLITICS: ["election prediction", "political odds", "congress vote"],
    Category.SPORTS: ["game prediction", "playoff odds", "championship favorite"],
    Category.CRYPTO: ["bitcoin price prediction", "crypto forecast", "eth outlook"],
    Category.ENTERTAINMENT: ["oscar prediction", "box office forecast", "emmy odds"],
}


class NewsCollector:
    """Collects news from RSS feeds and Google News"""
    
    GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"
    
    def __init__(self, db: ResearchDatabase):
        self.db = db
        self.client = httpx.AsyncClient(
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            timeout=30.0,
            follow_redirects=True
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def fetch_rss_feed(self, url: str) -> List[Dict]:
        """Fetch and parse an RSS feed"""
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            items = []
            
            # RSS format
            for item in root.findall('.//item'):
                entry = self._parse_rss_item(item)
                if entry:
                    items.append(entry)
            
            # Atom format
            for entry in root.findall('.//{http://www.w3.org/2005/Atom}entry'):
                parsed = self._parse_atom_entry(entry)
                if parsed:
                    items.append(parsed)
            
            return items
            
        except Exception as e:
            print(f"Error fetching RSS {url}: {e}")
            return []
    
    def _parse_rss_item(self, item) -> Optional[Dict]:
        """Parse an RSS item element"""
        try:
            title = item.findtext('title', '')
            link = item.findtext('link', '')
            description = item.findtext('description', '')
            pub_date = item.findtext('pubDate', '')
            author = item.findtext('author') or item.findtext('{http://purl.org/dc/elements/1.1/}creator', '')
            
            timestamp = self._parse_date(pub_date)
            
            return {
                "title": self._clean_text(title),
                "url": link,
                "content": self._clean_text(description),
                "timestamp": timestamp,
                "author": author or "Unknown",
            }
        except:
            return None
    
    def _parse_atom_entry(self, entry) -> Optional[Dict]:
        """Parse an Atom entry element"""
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        try:
            title = entry.findtext('atom:title', '', ns) or entry.findtext('title', '')
            link_elem = entry.find('atom:link[@rel="alternate"]', ns) or entry.find('atom:link', ns)
            link = link_elem.get('href', '') if link_elem is not None else ''
            content = entry.findtext('atom:content', '', ns) or entry.findtext('atom:summary', '', ns)
            updated = entry.findtext('atom:updated', '', ns) or entry.findtext('atom:published', '', ns)
            
            timestamp = self._parse_date(updated)
            
            return {
                "title": self._clean_text(title),
                "url": link,
                "content": self._clean_text(content),
                "timestamp": timestamp,
                "author": "Unknown",
            }
        except:
            return None
    
    def _parse_date(self, date_str: str) -> str:
        """Parse various date formats to ISO format"""
        if not date_str:
            return datetime.now(timezone.utc).isoformat()
        
        formats = [
            "%a, %d %b %Y %H:%M:%S %z",
            "%a, %d %b %Y %H:%M:%S %Z",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            except:
                continue
        
        return datetime.now(timezone.utc).isoformat()
    
    def _clean_text(self, text: str) -> str:
        """Clean HTML and whitespace from text"""
        if not text:
            return ""
        
        text = re.sub(r'<[^>]+>', '', text)
        text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        text = text.replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', ' ')
        return ' '.join(text.split()).strip()
    
    async def search_google_news(self, query: str, limit: int = 20) -> List[Dict]:
        """Search Google News via RSS"""
        try:
            url = f"{self.GOOGLE_NEWS_RSS}?q={quote_plus(query)}&hl=en-US&gl=US&ceid=US:en"
            
            response = await self.client.get(url)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            items = []
            
            for item in root.findall('.//item')[:limit]:
                entry = self._parse_rss_item(item)
                if entry:
                    title = entry.get("title", "")
                    if " - " in title:
                        parts = title.rsplit(" - ", 1)
                        entry["title"] = parts[0]
                        entry["author"] = parts[1] if len(parts) > 1 else "Unknown"
                    items.append(entry)
            
            return items
            
        except Exception as e:
            print(f"Error searching Google News for '{query}': {e}")
            return []
    
    def _parse_news_item(self, item: Dict, category: Category, 
                         source_name: str, source_weight: float) -> Optional[ResearchItem]:
        """Parse a news item into a ResearchItem"""
        try:
            title = item.get("title", "")
            if not title:
                return None
            
            timestamp = item.get("timestamp", datetime.now(timezone.utc).isoformat())
            try:
                pub_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except:
                pub_time = datetime.now(timezone.utc)
            
            hours_old = (datetime.now(timezone.utc) - pub_time).total_seconds() / 3600
            
            if hours_old > 48:
                return None
            
            engagement = calculate_engagement_score(
                upvotes=100,  # Base score for news
                comments=0,
                hours_old=hours_old,
                source_weight=source_weight
            )
            
            content = item.get("content", "") or title
            sentiment = analyze_sentiment_keywords(title + " " + content)
            keywords = extract_keywords(title + " " + content, category)
            
            url = item.get("url", "")
            
            return ResearchItem(
                id=generate_item_id("news", url, title),
                source_type=SourceType.NEWS,
                source_name=source_name,
                category=category,
                title=title,
                content=content[:2000],
                url=url,
                author=item.get("author", "Unknown"),
                timestamp=timestamp,
                upvotes=0,
                comments=0,
                engagement_score=engagement,
                sentiment=sentiment,
                keywords=keywords,
                raw_data={}
            )
            
        except Exception as e:
            print(f"Error parsing news item: {e}")
            return None
    
    async def collect_category(self, category: Category) -> List[ResearchItem]:
        """Collect all news items for a category"""
        items = []
        
        # Fetch RSS feeds
        feeds = RSS_FEEDS.get(category, [])
        
        for feed_config in feeds:
            url = feed_config["url"]
            name = feed_config["name"]
            weight = feed_config["weight"]
            
            feed_items = await self.fetch_rss_feed(url)
            
            for item in feed_items[:15]:
                parsed = self._parse_news_item(item, category, name, weight)
                if parsed:
                    items.append(parsed)
            
            await asyncio.sleep(0.3)
        
        # Search Google News
        search_terms = GOOGLE_NEWS_TERMS.get(category, [])
        
        for term in search_terms[:2]:
            search_results = await self.search_google_news(term, limit=10)
            
            for item in search_results:
                parsed = self._parse_news_item(item, category, "Google News", 1.2)
                if parsed:
                    items.append(parsed)
            
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
        """Collect news items for all categories"""
        results = {}
        
        for category in Category:
            print(f"  News: Collecting {category.value}...")
            items = await self.collect_category(category)
            results[category] = items
            
            for item in items:
                self.db.store_research_item(item)
            
            print(f"    Found {len(items)} items")
        
        return results
