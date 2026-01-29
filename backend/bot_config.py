# Trading Bot Configuration
# Edit these settings to customize your bot's behavior

# STRATEGY SELECTION
# Choose one: 'momentum', 'mean_reversion', 'rsi', 'ma_crossover'
STRATEGY = 'momentum'

# SYMBOLS TO TRADE - EXPANDED TO 100+ STOCKS
# More symbols = more opportunities across different sectors
SYMBOLS = [
    # Mega Cap Tech
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
    
    # Tech & Semiconductors
    'AMD', 'INTC', 'QCOM', 'AVGO', 'CSCO', 'ORCL', 'CRM', 'ADBE', 'NOW', 'SNOW',
    'MU', 'AMAT', 'LRCX', 'KLAC', 'ASML', 'TSM',
    
    # Social Media & Communication
    'NFLX', 'DIS', 'SNAP', 'PINS', 'SPOT', 'RBLX', 'U', 'ZM',
    
    # E-commerce & Retail
    'SHOP', 'ETSY', 'EBAY', 'WMT', 'TGT', 'COST', 'HD', 'LOW', 'NKE', 'LULU',
    
    # Finance & Fintech
    'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'V', 'MA', 'PYPL', 'SQ', 'COIN', 'HOOD',
    
    # EV & Auto
    'F', 'GM', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI',
    
    # Healthcare & Biotech
    'JNJ', 'PFE', 'UNH', 'ABBV', 'LLY', 'MRK', 'BMY', 'GILD', 'AMGN', 'BIIB',
    'MRNA', 'BNTX', 'REGN', 'VRTX',
    
    # Energy & Oil
    'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'OXY', 'PSX', 'MPC',
    
    # Aerospace & Defense
    'BA', 'LMT', 'RTX', 'NOC', 'GD',
    
    # Consumer & Food
    'KO', 'PEP', 'MCD', 'SBUX', 'CMG', 'YUM', 'DPZ',
    
    # Travel & Hospitality
    'ABNB', 'BKNG', 'MAR', 'HLT', 'UAL', 'DAL', 'AAL', 'LUV',
    
    # Industrial
    'CAT', 'DE', 'MMM', 'HON', 'UPS', 'FDX',
    
    # === PRECIOUS METALS & MINING ===
    # Gold Miners (Major)
    'NEM', 'GOLD', 'AEM', 'AU', 'FNV', 'WPM', 'KGC', 'HMY',
    
    # Silver Miners
    'PAAS', 'HL', 'CDE', 'AG', 'EXK',
    
    # Diversified Miners
    'FCX', 'SCCO', 'TECK', 'BHP', 'RIO', 'VALE',
    
    # Precious Metal ETFs
    'GLD', 'SLV', 'GDX', 'GDXJ', 'NUGT', 'JNUG', 'RING', 'GLTR',
    
    # Platinum/Palladium
    'SBSW', 'IMPUY',
    
    # === CRYPTO-RELATED ===
    'MSTR', 'MARA', 'RIOT', 'CLSK', 'CIFR',
]

# RISK MANAGEMENT - OPTIMIZED FOR MORE STOCKS
MAX_POSITION_SIZE = 500   # $500 per position for better diversification
MAX_DAILY_LOSS = 2000     # Higher limit for more positions
MAX_POSITIONS = 15        # Allow 15 positions (increased from 10)

# TIMING - FASTER SCANNING
CHECK_INTERVAL = 30  # Check every 30 seconds (2x faster!)

# STRATEGY DESCRIPTIONS:
#
# 1. MOMENTUM
#    - Buys stocks showing strong upward movement with high volume
#    - Exits when momentum reverses or hits stop loss/take profit
#    - Best for: Trending markets
#
# 2. MEAN_REVERSION
#    - Buys stocks that have dipped below their average price
#    - Exits when price returns to average
#    - Best for: Range-bound markets
#
# 3. RSI (Relative Strength Index)
#    - Buys when RSI < 30 (oversold)
#    - Exits when RSI > 70 (overbought) or hits stop loss
#    - Best for: Identifying reversals
#
# 4. MA_CROSSOVER (Moving Average Crossover)
#    - Buys when fast MA crosses above slow MA (golden cross)
#    - Exits when fast MA crosses below slow MA (death cross)
#    - Best for: Long-term trends

# AUTOMATIC STOP LOSS & TAKE PROFIT
# These are built-in and cannot be disabled:
# - Stop Loss: Automatically closes position at -2% loss
# - Take Profit: Automatically closes position at +5% gain
