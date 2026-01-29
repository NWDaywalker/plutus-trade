"""
Automated Trading Bot
Executes trades based on predefined strategies with risk management
"""

import time
import signal
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from alpaca_broker import AlpacaBroker
from database import Database
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class TradingBot:
    def __init__(self, broker: AlpacaBroker, db: Database, config: Dict):
        """Initialize trading bot with configuration"""
        self.broker = broker
        self.db = db
        self.config = config
        self.running = False
        self.positions = {}
        
        # Safety limits
        self.max_position_size = config.get('max_position_size', 1000)  # Max $ per position
        self.max_daily_loss = config.get('max_daily_loss', 500)  # Max $ loss per day
        self.max_positions = config.get('max_positions', 5)  # Max open positions
        self.daily_pnl = 0
        
        # Strategy settings
        self.strategy = config.get('strategy', 'momentum')
        self.symbols = config.get('symbols', ['AAPL', 'TSLA', 'NVDA', 'MSFT'])
        self.check_interval = config.get('check_interval', 60)  # Seconds between checks
        
        print(f"🤖 Trading Bot initialized")
        print(f"   Strategy: {self.strategy}")
        print(f"   Symbols: {', '.join(self.symbols)}")
        print(f"   Max Position Size: ${self.max_position_size}")
        print(f"   Max Daily Loss: ${self.max_daily_loss}")
        print(f"   Max Positions: {self.max_positions}")
    
    def start(self):
        """Start the trading bot"""
        self.running = True
        print("\n" + "="*60)
        print("🚀 TRADING BOT STARTING")
        print("="*60)
        print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Set up graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        
        try:
            while self.running:
                self.run_cycle()
                if self.running:
                    time.sleep(self.check_interval)
        except Exception as e:
            print(f"\n❌ Bot error: {e}")
        finally:
            self.stop()
    
    def signal_handler(self, sig, frame):
        """Handle Ctrl+C gracefully"""
        print("\n\n⚠️  Shutdown signal received...")
        self.stop()
    
    def stop(self):
        """Stop the trading bot"""
        self.running = False
        print("\n" + "="*60)
        print("🛑 TRADING BOT STOPPED")
        print("="*60)
        print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📊 Today's P&L: ${self.daily_pnl:.2f}")
        sys.exit(0)
    
    def run_cycle(self):
        """Run one trading cycle"""
        print(f"\n{'='*60}")
        print(f"🔄 Cycle at {datetime.now().strftime('%H:%M:%S')}")
        print(f"{'='*60}")
        
        # Check if we've hit daily loss limit
        if self.daily_pnl <= -self.max_daily_loss:
            print(f"⛔ Daily loss limit reached (${self.daily_pnl:.2f}). Stopping bot.")
            self.stop()
            return
        
        # Update positions
        self.update_positions()
        
        # Check existing positions for exit signals
        self.check_exit_signals()
        
        # Check for new entry signals
        if len(self.positions) < self.max_positions:
            self.check_entry_signals()
        else:
            print(f"⚠️  Max positions ({self.max_positions}) reached. Skipping entry signals.")
    
    def update_positions(self):
        """Update current positions from broker"""
        try:
            positions = self.broker.get_positions()
            self.positions = {pos['symbol']: pos for pos in positions}
            
            # Calculate daily P&L
            self.daily_pnl = sum(pos['unrealized_pl'] for pos in positions)
            
            print(f"\n📊 Current Status:")
            print(f"   Open Positions: {len(self.positions)}")
            print(f"   Daily P&L: ${self.daily_pnl:.2f}")
            
            if self.positions:
                for symbol, pos in self.positions.items():
                    pnl_pct = pos['unrealized_plpc'] * 100
                    print(f"   {symbol}: {pos['qty']} shares @ ${pos['current_price']:.2f} "
                          f"(P&L: ${pos['unrealized_pl']:.2f} / {pnl_pct:.2f}%)")
        except Exception as e:
            print(f"❌ Error updating positions: {e}")
    
    def check_exit_signals(self):
        """Check if any positions should be closed"""
        for symbol, position in list(self.positions.items()):
            try:
                # Get current data
                bars = self.broker.get_bars(symbol, "5Min", 20)
                if not bars or len(bars) < 10:
                    continue
                
                # Check stop loss (2% loss)
                pnl_pct = position['unrealized_plpc']
                if pnl_pct <= -0.02:  # -2%
                    print(f"\n🛑 STOP LOSS triggered for {symbol} at {pnl_pct*100:.2f}%")
                    self.close_position(symbol, position['qty'], "Stop Loss")
                    continue
                
                # Check take profit (5% gain)
                if pnl_pct >= 0.05:  # +5%
                    print(f"\n💰 TAKE PROFIT triggered for {symbol} at {pnl_pct*100:.2f}%")
                    self.close_position(symbol, position['qty'], "Take Profit")
                    continue
                
                # Strategy-specific exit signals
                if self.strategy == 'momentum':
                    if self.check_momentum_exit(symbol, bars):
                        print(f"\n📉 Momentum EXIT signal for {symbol}")
                        self.close_position(symbol, position['qty'], "Momentum Exit")
                
                elif self.strategy == 'mean_reversion':
                    if self.check_mean_reversion_exit(symbol, bars):
                        print(f"\n📉 Mean Reversion EXIT signal for {symbol}")
                        self.close_position(symbol, position['qty'], "Mean Reversion Exit")
                
            except Exception as e:
                print(f"❌ Error checking exit for {symbol}: {e}")
    
    def check_entry_signals(self):
        """Check for new entry opportunities"""
        for symbol in self.symbols:
            # Skip if already have position
            if symbol in self.positions:
                continue
            
            try:
                # Get market data
                bars = self.broker.get_bars(symbol, "5Min", 50)
                if not bars or len(bars) < 20:
                    continue
                
                # Check strategy signal
                signal = False
                if self.strategy == 'momentum':
                    signal = self.check_momentum_entry(symbol, bars)
                elif self.strategy == 'mean_reversion':
                    signal = self.check_mean_reversion_entry(symbol, bars)
                elif self.strategy == 'rsi':
                    signal = self.check_rsi_entry(symbol, bars)
                elif self.strategy == 'ma_crossover':
                    signal = self.check_ma_crossover_entry(symbol, bars)
                
                if signal:
                    print(f"\n✅ ENTRY signal for {symbol}")
                    self.open_position(symbol)
                    time.sleep(2)  # Brief pause between orders
                
            except Exception as e:
                print(f"❌ Error checking entry for {symbol}: {e}")
    
    def check_momentum_entry(self, symbol: str, bars: List[Dict]) -> bool:
        """Momentum strategy: Buy on strong upward movement"""
        if len(bars) < 20:
            return False
        
        prices = [bar['close'] for bar in bars[-20:]]
        
        # Calculate short-term momentum (last 5 bars)
        recent_change = (prices[-1] - prices[-6]) / prices[-6]
        
        # Calculate volume surge
        volumes = [bar['volume'] for bar in bars[-10:]]
        avg_volume = sum(volumes[:-1]) / len(volumes[:-1])
        current_volume = volumes[-1]
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 0
        
        # Entry: Price up 1%+ in last 5 bars with volume surge
        if recent_change > 0.01 and volume_ratio > 1.5:
            print(f"   📈 {symbol} momentum: +{recent_change*100:.2f}%, volume {volume_ratio:.1f}x")
            return True
        
        return False
    
    def check_momentum_exit(self, symbol: str, bars: List[Dict]) -> bool:
        """Momentum exit: Sell when momentum reverses"""
        if len(bars) < 10:
            return False
        
        prices = [bar['close'] for bar in bars[-10:]]
        recent_change = (prices[-1] - prices[-4]) / prices[-4]
        
        # Exit if losing momentum (down 0.5% in last 3 bars)
        return recent_change < -0.005
    
    def check_mean_reversion_entry(self, symbol: str, bars: List[Dict]) -> bool:
        """Mean Reversion: Buy dips from average"""
        if len(bars) < 20:
            return False
        
        prices = [bar['close'] for bar in bars[-20:]]
        avg_price = sum(prices) / len(prices)
        current_price = prices[-1]
        
        # Calculate standard deviation
        variance = sum((p - avg_price) ** 2 for p in prices) / len(prices)
        std_dev = variance ** 0.5
        
        # Entry: Price is 1.5 std devs below average
        z_score = (current_price - avg_price) / std_dev if std_dev > 0 else 0
        
        if z_score < -1.5:
            print(f"   📉 {symbol} oversold: Z-score {z_score:.2f}")
            return True
        
        return False
    
    def check_mean_reversion_exit(self, symbol: str, bars: List[Dict]) -> bool:
        """Mean Reversion exit: Sell when back to average"""
        if len(bars) < 20:
            return False
        
        prices = [bar['close'] for bar in bars[-20:]]
        avg_price = sum(prices) / len(prices)
        current_price = prices[-1]
        
        # Exit if price is back above average
        return current_price >= avg_price
    
    def check_rsi_entry(self, symbol: str, bars: List[Dict]) -> bool:
        """RSI Strategy: Buy when oversold"""
        if len(bars) < 15:
            return False
        
        # Calculate RSI
        rsi = self.calculate_rsi([bar['close'] for bar in bars], 14)
        
        if rsi < 30:  # Oversold
            print(f"   📊 {symbol} RSI: {rsi:.1f} (Oversold)")
            return True
        
        return False
    
    def check_ma_crossover_entry(self, symbol: str, bars: List[Dict]) -> bool:
        """Moving Average Crossover: Buy when fast MA crosses above slow MA"""
        if len(bars) < 50:
            return False
        
        prices = [bar['close'] for bar in bars]
        
        # Calculate MAs
        fast_ma = sum(prices[-10:]) / 10  # 10-period MA
        slow_ma = sum(prices[-30:]) / 30  # 30-period MA
        
        prev_fast_ma = sum(prices[-11:-1]) / 10
        prev_slow_ma = sum(prices[-31:-1]) / 30
        
        # Golden cross: fast MA crosses above slow MA
        if prev_fast_ma <= prev_slow_ma and fast_ma > slow_ma:
            print(f"   ✨ {symbol} Golden Cross: Fast MA ${fast_ma:.2f} > Slow MA ${slow_ma:.2f}")
            return True
        
        return False
    
    def calculate_rsi(self, prices: List[float], period: int = 14) -> float:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return 50
        
        gains = []
        losses = []
        
        for i in range(1, len(prices)):
            change = prices[i] - prices[i-1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def open_position(self, symbol: str):
        """Open a new position"""
        try:
            # Get current quote
            quote = self.broker.get_quote(symbol)
            if not quote:
                print(f"❌ Could not get quote for {symbol}")
                return
            
            ask_price = quote['ask']
            
            # Calculate position size (max $1000 per position)
            qty = int(self.max_position_size / ask_price)
            if qty < 1:
                qty = 1
            
            print(f"   💵 Opening {qty} shares of {symbol} @ ${ask_price:.2f}")
            
            # Place market order
            order = self.broker.place_market_order(symbol, qty, 'buy')
            
            if order:
                print(f"   ✅ Order placed: {order['order_id']}")
                
                # Save to database
                self.db.save_trade({
                    'symbol': symbol,
                    'side': 'buy',
                    'qty': qty,
                    'price': ask_price,
                    'order_type': 'market',
                    'status': order['status'],
                    'order_id': str(order['order_id'])
                })
            else:
                print(f"   ❌ Failed to place order")
                
        except Exception as e:
            print(f"❌ Error opening position for {symbol}: {e}")
    
    def close_position(self, symbol: str, qty: float, reason: str):
        """Close an existing position"""
        try:
            print(f"   💵 Closing {qty} shares of {symbol} - Reason: {reason}")
            
            # Place market sell order
            order = self.broker.place_market_order(symbol, qty, 'sell')
            
            if order:
                print(f"   ✅ Position closed: {order['order_id']}")
                
                # Save to database
                self.db.save_trade({
                    'symbol': symbol,
                    'side': 'sell',
                    'qty': qty,
                    'price': 0,
                    'order_type': 'market',
                    'status': order['status'],
                    'order_id': str(order['order_id'])
                })
                
                # Remove from positions
                if symbol in self.positions:
                    del self.positions[symbol]
            else:
                print(f"   ❌ Failed to close position")
                
        except Exception as e:
            print(f"❌ Error closing position for {symbol}: {e}")


def main():
    """Main bot entry point"""
    print("\n" + "="*60)
    print("🤖 AUTOMATED TRADING BOT")
    print("="*60)
    print("⚠️  PAPER TRADING MODE - No real money at risk")
    print("="*60 + "\n")
    
    # Load credentials
    api_key = os.getenv('ALPACA_API_KEY')
    secret_key = os.getenv('ALPACA_SECRET_KEY')
    
    if not api_key or not secret_key:
        print("❌ API keys not found. Please configure .env file.")
        return
    
    # Initialize components
    broker = AlpacaBroker(api_key, secret_key)
    db = Database(os.getenv('DATABASE_PATH', '../data/trading.db'))
    
    # Load bot configuration from bot_config.py
    try:
        import bot_config
        config = {
            'strategy': bot_config.STRATEGY,
            'symbols': bot_config.SYMBOLS,
            'max_position_size': bot_config.MAX_POSITION_SIZE,
            'max_daily_loss': bot_config.MAX_DAILY_LOSS,
            'max_positions': bot_config.MAX_POSITIONS,
            'check_interval': bot_config.CHECK_INTERVAL
        }
        print(f"✅ Loaded config: {len(config['symbols'])} symbols, max {config['max_positions']} positions")
    except ImportError:
        print("⚠️  bot_config.py not found, using defaults")
        config = {
            'strategy': 'momentum',
            'symbols': ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'],
            'max_position_size': 1000,
            'max_daily_loss': 500,
            'max_positions': 3,
            'check_interval': 60
        }
    
    # Create and start bot
    bot = TradingBot(broker, db, config)
    bot.start()


if __name__ == '__main__':
    main()
