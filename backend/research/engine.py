
"""
Deep Research Engine for Polymarket
Continuously monitors forums, social media, and news to generate trading signals
"""

import asyncio
import json
import sqlite3
import hashlib
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Literal
from enum import Enum
import os
import re


class Category(str, Enum):
    POLITICS = "politics"
    SPORTS = "sports"
    CRYPTO = "crypto"
    ENTERTAINMENT = "entertainment"


class SourceType(str, Enum):
    REDDIT = "reddit"
    TWITTER = "twitter"
    NEWS = "news"
    PREDICTION_MARKET = "prediction_market"


@dataclass
class ResearchItem:
    """A single piece of research data from any source"""
    id: str
    source_type: SourceType
    source_name: str  # e.g., "r/polymarket", "@elonmusk", "Reuters"
    category: Category
    title: str
    content: str
    url: str
    author: str
    timestamp: str
    upvotes: int = 0
    comments: int = 0
    engagement_score: float = 0.0
    sentiment: float = 0.0  # -1.0 to 1.0
    keywords: List[str] = field(default_factory=list)
    raw_data: Dict = field(default_factory=dict)
    
    def to_dict(self):
        d = asdict(self)
        d['source_type'] = self.source_type.value
        d['category'] = self.category.value
        return d


@dataclass
class MarketSignal:
    """A trading signal derived from research"""
    id: str
    market_id: str
    market_question: str
    category: Category
    side: Literal["YES", "NO"]
    sentiment_score: float  # -1.0 to 1.0
    confidence: float  # 0.0 to 1.0
    
    # Supporting evidence
    datapoints: List[Dict]  # List of evidence items
    sources_count: int
    total_engagement: int
    
    # Timing
    generated_at: str
    expires_at: str
    
    reasoning: str
    
    def to_dict(self):
        d = asdict(self)
        d['category'] = self.category.value
        return d


class ResearchDatabase:
    """SQLite database for storing research and signals"""
    
    def __init__(self, db_path: str = "data/research.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Research items table
        c.execute('''
            CREATE TABLE IF NOT EXISTS research_items (
                id TEXT PRIMARY KEY,
                source_type TEXT,
                source_name TEXT,
                category TEXT,
                title TEXT,
                content TEXT,
                url TEXT,
                author TEXT,
                timestamp TEXT,
                upvotes INTEGER,
                comments INTEGER,
                engagement_score REAL,
                sentiment REAL,
                keywords TEXT,
                raw_data TEXT,
                created_at TEXT
            )
        ''')
        
        # Market signals table
        c.execute('''
            CREATE TABLE IF NOT EXISTS market_signals (
                id TEXT PRIMARY KEY,
                market_id TEXT,
                market_question TEXT,
                category TEXT,
                side TEXT,
                sentiment_score REAL,
                confidence REAL,
                datapoints TEXT,
                sources_count INTEGER,
                total_engagement INTEGER,
                generated_at TEXT,
                expires_at TEXT,
                reasoning TEXT,
                status TEXT DEFAULT 'active'
            )
        ''')
        
        # Create indexes
        c.execute('CREATE INDEX IF NOT EXISTS idx_research_category ON research_items(category)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_research_timestamp ON research_items(timestamp)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_signals_category ON market_signals(category)')
        
        conn.commit()
        conn.close()
    
    def store_research_item(self, item: ResearchItem):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO research_items 
            (id, source_type, source_name, category, title, content, url, author,
             timestamp, upvotes, comments, engagement_score, sentiment, keywords, raw_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            item.id, item.source_type.value, item.source_name, item.category.value,
            item.title, item.content, item.url, item.author, item.timestamp,
            item.upvotes, item.comments, item.engagement_score, item.sentiment,
            json.dumps(item.keywords), json.dumps(item.raw_data),
            datetime.now(timezone.utc).isoformat()
        ))
        conn.commit()
        conn.close()
    
    def store_signal(self, signal: MarketSignal):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO market_signals
            (id, market_id, market_question, category, side, sentiment_score,
             confidence, datapoints, sources_count, total_engagement, 
             generated_at, expires_at, reasoning)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            signal.id, signal.market_id, signal.market_question, signal.category.value,
            signal.side, signal.sentiment_score, signal.confidence,
            json.dumps(signal.datapoints), signal.sources_count, signal.total_engagement,
            signal.generated_at, signal.expires_at, signal.reasoning
        ))
        conn.commit()
        conn.close()
    
    def get_recent_research(self, category: Optional[Category] = None, 
                           hours: int = 24, limit: int = 100) -> List[Dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        
        if category:
            c.execute('''
                SELECT * FROM research_items 
                WHERE category = ? AND created_at > ?
                ORDER BY engagement_score DESC
                LIMIT ?
            ''', (category.value, cutoff, limit))
        else:
            c.execute('''
                SELECT * FROM research_items 
                WHERE created_at > ?
                ORDER BY engagement_score DESC
                LIMIT ?
            ''', (cutoff, limit))
        
        rows = c.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_active_signals(self, category: Optional[Category] = None) -> List[Dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        now = datetime.now(timezone.utc).isoformat()
        
        if category:
            c.execute('''
                SELECT * FROM market_signals 
                WHERE category = ? AND status = 'active' AND expires_at > ?
                ORDER BY confidence DESC
            ''', (category.value, now))
        else:
            c.execute('''
                SELECT * FROM market_signals 
                WHERE status = 'active' AND expires_at > ?
                ORDER BY confidence DESC
            ''', (now,))
        
        rows = c.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_research_stats(self) -> Dict:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Get counts by category
        c.execute('''
            SELECT category, COUNT(*) as count 
            FROM research_items 
            WHERE created_at > datetime('now', '-24 hours')
            GROUP BY category
        ''')
        category_counts = {row[0]: row[1] for row in c.fetchall()}
        
        # Get counts by source
        c.execute('''
            SELECT source_type, COUNT(*) as count 
            FROM research_items 
            WHERE created_at > datetime('now', '-24 hours')
            GROUP BY source_type
        ''')
        source_counts = {row[0]: row[1] for row in c.fetchall()}
        
        # Get active signals count
        c.execute('''
            SELECT COUNT(*) FROM market_signals 
            WHERE status = 'active' AND expires_at > datetime('now')
        ''')
        active_signals = c.fetchone()[0]
        
        conn.close()
        
        return {
            "by_category": category_counts,
            "by_source": source_counts,
            "active_signals": active_signals,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }


def generate_item_id(source_type: str, url: str, title: str) -> str:
    """Generate a unique ID for a research item"""
    content = f"{source_type}:{url}:{title}"
    return hashlib.md5(content.encode()).hexdigest()[:16]


def calculate_engagement_score(upvotes: int, comments: int, 
                               hours_old: float, source_weight: float = 1.0) -> float:
    """
    Calculate engagement score with time decay
    Newer content with high engagement scores higher
    """
    # Base engagement
    base = (upvotes + comments * 2)  # Comments weighted 2x
    
    # Time decay - halves every 12 hours
    decay = 0.5 ** (hours_old / 12)
    
    return base * decay * source_weight


def analyze_sentiment_keywords(text: str) -> float:
    """Simple keyword-based sentiment analysis"""
    text_lower = text.lower()
    
    bullish_keywords = [
        'bullish', 'likely', 'expected', 'confirmed', 'winning', 'leading',
        'surge', 'rally', 'breakout', 'moon', 'pump', 'positive', 'strong',
        'up', 'gain', 'rise', 'soar', 'jump', 'boost', 'success'
    ]
    
    bearish_keywords = [
        'bearish', 'unlikely', 'doubt', 'failed', 'losing', 'trailing',
        'crash', 'dump', 'drop', 'negative', 'weak', 'down', 'fall',
        'decline', 'plunge', 'concern', 'risk', 'fear', 'worry'
    ]
    
    bullish_count = sum(1 for kw in bullish_keywords if kw in text_lower)
    bearish_count = sum(1 for kw in bearish_keywords if kw in text_lower)
    
    total = bullish_count + bearish_count
    if total == 0:
        return 0.0
    
    # Score from -1 to 1
    return (bullish_count - bearish_count) / total


def extract_keywords(text: str, category: Category) -> List[str]:
    """Extract relevant keywords based on category"""
    text_lower = text.lower()
    keywords = []
    
    # Category-specific patterns
    patterns = {
        Category.POLITICS: [
            r'\b(trump|biden|harris|election|vote|poll|congress|senate|house|democrat|republican|gop|president|governor)\b'
        ],
        Category.SPORTS: [
            r'\b(super bowl|world series|playoffs|championship|finals|mvp|trade|injury|draft|nfl|nba|mlb|nhl)\b'
        ],
        Category.CRYPTO: [
            r'\b(bitcoin|btc|ethereum|eth|solana|sol|crypto|defi|nft|bull|bear|pump|dump|ath|moon)\b'
        ],
        Category.ENTERTAINMENT: [
            r'\b(oscar|emmy|grammy|box office|rating|premiere|release|award|nomination|winner|netflix|disney)\b'
        ]
    }
    
    for pattern in patterns.get(category, []):
        matches = re.findall(pattern, text_lower)
        keywords.extend(matches)
    
    # General prediction keywords
    general = re.findall(r'\b(prediction|odds|chance|probability|likely|unlikely|bet|wager|forecast)\b', text_lower)
    keywords.extend(general)
    
    return list(set(keywords))

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
        
        # Signal generation thresholds
        self.min_sources = 3
        self.min_confidence = 0.5
    
    async def close(self):
        await self.reddit.close()
        await self.news.close()
        await self.prediction_markets.close()
    
    async def run_collection(self) -> Dict:
        """Run all collectors and return summary"""
        print("\n" + "="*60)
        print(f"Starting Research Collection - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        results = {
            "reddit": {},
            "news": {},
            "prediction_markets": {},
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
            
            # Prediction Markets
            print("\n🎯 Collecting from Prediction Markets...")
            pm_results = await self.prediction_markets.collect_all()
            for cat, items in pm_results.items():
                results["prediction_markets"][cat.value] = len(items)
                results["total_items"] += len(items)
            
            # Calculate totals by category
            for category in Category:
                cat_total = (
                    results["reddit"].get(category.value, 0) +
                    results["news"].get(category.value, 0) +
                    results["prediction_markets"].get(category.value, 0)
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

"""
Deep Research Module for Polymarket
"""

from .engine import (
    Category,
    SourceType,
    ResearchItem,
    MarketSignal,
    ResearchDatabase,
)

from .orchestrator import (
    ResearchOrchestrator,
    run_continuous_monitoring,
)

__all__ = [
    "Category",
    "SourceType", 
    "ResearchItem",
    "MarketSignal",
    "ResearchDatabase",
    "ResearchOrchestrator",
    "run_continuous_monitoring",
]
