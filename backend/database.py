"""
Database module for the trading app
Handles SQLite database setup and operations
"""

import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional

class Database:
    def __init__(self, db_path: str):
        """Initialize database connection"""
        self.db_path = db_path
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.init_db()
    
    def get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)
    
    def init_db(self):
        """Initialize database schema"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Create trades table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                qty REAL NOT NULL,
                price REAL NOT NULL,
                order_type TEXT NOT NULL,
                status TEXT NOT NULL,
                filled_qty REAL DEFAULT 0,
                filled_avg_price REAL DEFAULT 0,
                order_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create portfolio table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS portfolio (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT UNIQUE NOT NULL,
                qty REAL NOT NULL,
                avg_price REAL NOT NULL,
                current_price REAL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create account_history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS account_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                equity REAL NOT NULL,
                cash REAL NOT NULL,
                buying_power REAL NOT NULL,
                portfolio_value REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
        print(f"✅ Database initialized at {self.db_path}")
    
    def save_trade(self, trade_data: Dict):
        """Save a trade to the database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO trades (symbol, side, qty, price, order_type, status, order_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            trade_data['symbol'],
            trade_data['side'],
            trade_data['qty'],
            trade_data['price'],
            trade_data['order_type'],
            trade_data['status'],
            trade_data.get('order_id', '')
        ))
        
        conn.commit()
        trade_id = cursor.lastrowid
        conn.close()
        return trade_id
    
    def get_trades(self, limit: int = 100) -> List[Dict]:
        """Get recent trades"""
        conn = self.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM trades 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (limit,))
        
        trades = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return trades
    
    def update_portfolio(self, symbol: str, qty: float, avg_price: float, current_price: Optional[float] = None):
        """Update portfolio position"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO portfolio (symbol, qty, avg_price, current_price)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(symbol) DO UPDATE SET
                qty = ?,
                avg_price = ?,
                current_price = ?,
                updated_at = CURRENT_TIMESTAMP
        """, (symbol, qty, avg_price, current_price, qty, avg_price, current_price))
        
        conn.commit()
        conn.close()
    
    def get_portfolio(self) -> List[Dict]:
        """Get current portfolio positions"""
        conn = self.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM portfolio WHERE qty > 0")
        
        positions = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return positions
    
    def save_account_snapshot(self, account_data: Dict):
        """Save account snapshot for historical tracking"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO account_history (equity, cash, buying_power, portfolio_value)
            VALUES (?, ?, ?, ?)
        """, (
            account_data['equity'],
            account_data['cash'],
            account_data['buying_power'],
            account_data['portfolio_value']
        ))
        
        conn.commit()
        conn.close()
    
    def get_account_history(self, limit: int = 100) -> List[Dict]:
        """Get account history"""
        conn = self.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM account_history 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (limit,))
        
        history = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return history
