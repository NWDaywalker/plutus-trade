"""
Bot Configuration - Aggressive Trading Settings
"""

# Active strategy (can be: momentum, mean_reversion, rsi, vwap, or 'all' for multi-strategy)
STRATEGY = 'all'

# Strategy allocations (percentages - should sum to 100 or less)
ALLOCATIONS = {
    'momentum': 25,
    'mean_reversion': 50,
    'rsi': 15,
    'vwap': 10
}

# Stock universe - diverse mix across sectors
SYMBOLS = [
    # Tech Giants
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'CRM',
    
    # Finance
    'JPM', 'BAC', 'GS', 'MS', 'V', 'MA', 'PYPL', 'SQ', 'COIN', 'HOOD',
    
    # Healthcare
    'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'LLY', 'BMY', 'AMGN', 'GILD', 'MRNA',
    
    # Consumer
    'WMT', 'COST', 'TGT', 'HD', 'LOW', 'NKE', 'SBUX', 'MCD', 'DIS', 'NFLX',
    
    # Energy
    'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'OXY', 'PSX', 'VLO', 'MPC', 'DVN',
    
    # Industrials
    'CAT', 'DE', 'BA', 'LMT', 'RTX', 'GE', 'HON', 'UPS', 'FDX', 'MMM',
    
    # Materials / Mining
    'FCX', 'NEM', 'GOLD', 'CLF', 'X', 'AA', 'NUE', 'STLD',
    
    # ETFs for broader exposure
    'SPY', 'QQQ', 'IWM', 'DIA', 'XLF', 'XLE', 'XLK', 'GLD', 'SLV', 'TLT',
    
    # High volatility / momentum plays
    'PLTR', 'SOFI', 'RIVN', 'LCID', 'NIO', 'PLUG', 'FCEL', 'SPCE',
    
    # Meme / retail favorites (high volume)
    'GME', 'AMC', 'BB', 'BBBY', 'WISH',
]

# Position sizing
MAX_POSITION_SIZE = 1000  # Max $ per single position
MAX_POSITIONS = 15        # Max concurrent positions
MAX_DAILY_LOSS = 500      # Stop trading if daily loss exceeds this

# Risk management
STOP_LOSS_PCT = 0.02      # 2% stop loss
TAKE_PROFIT_PCT = 0.05    # 5% take profit

# Timing
CHECK_INTERVAL = 60       # Scan every 60 seconds (aggressive)

# Market hours only (optional - set to False for extended hours)
MARKET_HOURS_ONLY = True
