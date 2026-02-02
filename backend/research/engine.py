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
