"""
Trading Bot - Aggressive multi-strategy automated trading
Executes actual trades via Alpaca API
"""

import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import random

class TradingBot:
    """
    Multi-strategy trading bot that scans for opportunities and executes trades.
    Supports: Momentum, Mean Reversion, RSI, VWAP strategies
    """
    
    def __init__(self, broker, db, config: Dict):
        self.broker = broker
        self.db = db
        self.config = config
        self.running = False
        self.thread = None
        
        # Strategy (for status endpoint compatibility)
        self.strategy = config.get('strategy', 'all')
        
        # Strategy allocations (percentages)
        self.allocations = config.get('allocations', {
            'momentum': 25,
            'mean_reversion': 50,
            'rsi': 15,
            'vwap': 10
        })
        
        # Trading parameters
        self.symbols = config.get('symbols', [])
        self.max_position_size = config.get('max_position_size', 1000)  # Max $ per position
        self.max_positions = config.get('max_positions', 10)
        self.max_daily_loss = config.get('max_daily_loss', 500)
        self.check_interval = config.get('check_interval', 60)  # seconds
        
        # Risk management
        self.stop_loss_pct = config.get('stop_loss_pct', 0.02)  # 2%
        self.take_profit_pct = config.get('take_profit_pct', 0.05)  # 5%
        
        # Tracking
        self.trades_today = 0
        self.daily_pnl = 0
        self.start_equity = None
        self.last_scan_time = None
        self.win_rate = 0
        self.wins = 0
        self.losses = 0
        
        print(f"🤖 TradingBot initialized")
        print(f"   Symbols: {len(self.symbols)}")
        print(f"   Max position: ${self.max_position_size}")
        print(f"   Max positions: {self.max_positions}")
        print(f"   Check interval: {self.check_interval}s")
        print(f"   Allocations: {self.allocations}")
    
    def start(self):
        """Start the trading bot main loop"""
        self.running = True
        self.start_equity = self._get_current_equity()
        print(f"🚀 Trading bot started! Starting equity: ${self.start_equity:,.2f}")
        
        while self.running:
            try:
                self._trading_cycle()
                time.sleep(self.check_interval)
            except Exception as e:
                print(f"❌ Trading cycle error: {e}")
                time.sleep(5)  # Brief pause on error
    
    def stop(self):
        """Stop the trading bot"""
        self.running = False
        print("🛑 Trading bot stopped")
    
    def _trading_cycle(self):
        """Main trading cycle - scan and execute"""
        self.last_scan_time = datetime.now()
        
        # Check daily loss limit
        current_equity = self._get_current_equity()
        if self.start_equity:
            self.daily_pnl = current_equity - self.start_equity
            if self.daily_pnl <= -self.max_daily_loss:
                print(f"⚠️ Daily loss limit reached (${self.daily_pnl:.2f}). Pausing trades.")
                return
        
        # Get current positions
        positions = self.broker.get_positions() or []
        current_position_count = len(positions)
        
        # Check if we can open more positions
        if current_position_count >= self.max_positions:
            print(f"📊 Max positions reached ({current_position_count}/{self.max_positions})")
            self._manage_existing_positions(positions)
            return
        
        # Scan for opportunities with each active strategy
        print(f"\n🔍 Scanning {len(self.symbols)} symbols... ({datetime.now().strftime('%H:%M:%S')})")
        
        opportunities = []
        
        for symbol in self.symbols:
            # Skip if we already have a position
            if any(p['symbol'] == symbol for p in positions):
                continue
            
            # Get market data
            bars = self._get_bars(symbol, limit=50)
            if not bars or len(bars) < 20:
                continue
            
            # Run each strategy
            if self.allocations.get('momentum', 0) > 0:
                signal = self._momentum_strategy(symbol, bars)
                if signal:
                    signal['strategy'] = 'momentum'
                    opportunities.append(signal)
            
            if self.allocations.get('mean_reversion', 0) > 0:
                signal = self._mean_reversion_strategy(symbol, bars)
                if signal:
                    signal['strategy'] = 'mean_reversion'
                    opportunities.append(signal)
            
            if self.allocations.get('rsi', 0) > 0:
                signal = self._rsi_strategy(symbol, bars)
                if signal:
                    signal['strategy'] = 'rsi'
                    opportunities.append(signal)
            
            if self.allocations.get('vwap', 0) > 0:
                signal = self._vwap_strategy(symbol, bars)
                if signal:
                    signal['strategy'] = 'vwap'
                    opportunities.append(signal)
        
        # Sort by signal strength and execute top opportunities
        opportunities.sort(key=lambda x: x.get('strength', 0), reverse=True)
        
        slots_available = self.max_positions - current_position_count
        to_execute = opportunities[:slots_available]
        
        print(f"   Found {len(opportunities)} opportunities, executing top {len(to_execute)}")
        
        for opp in to_execute:
            self._execute_trade(opp)
        
        # Manage existing positions (check stop loss / take profit)
        self._manage_existing_positions(positions)
    
    def _get_bars(self, symbol: str, limit: int = 50) -> List[Dict]:
        """Get recent price bars for a symbol"""
        try:
            return self.broker.get_bars(symbol, timeframe='1Hour', limit=limit)
        except Exception as e:
            return None
    
    def _get_current_equity(self) -> float:
        """Get current account equity"""
        try:
            account = self.broker.get_account()
            return float(account.get('equity', 0)) if account else 0
        except:
            return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STRATEGIES
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _momentum_strategy(self, symbol: str, bars: List[Dict]) -> Optional[Dict]:
        """
        Momentum Breakout Strategy
        Buy when price breaks above 20-period high with volume confirmation
        """
        if len(bars) < 20:
            return None
        
        closes = [b['close'] for b in bars]
        volumes = [b['volume'] for b in bars]
        
        current_price = closes[-1]
        high_20 = max(closes[-20:])
        avg_volume = sum(volumes[-20:]) / 20
        current_volume = volumes[-1]
        
        # Breakout condition: price at/near 20-day high with above-average volume
        if current_price >= high_20 * 0.99 and current_volume > avg_volume * 1.2:
            strength = (current_volume / avg_volume) * (current_price / high_20)
            return {
                'symbol': symbol,
                'side': 'buy',
                'price': current_price,
                'strength': strength,
                'reason': f'Breakout above 20-period high (${high_20:.2f}) with {current_volume/avg_volume:.1f}x volume'
            }
        
        return None
    
    def _mean_reversion_strategy(self, symbol: str, bars: List[Dict]) -> Optional[Dict]:
        """
        Mean Reversion Strategy
        Buy when price is significantly below moving average, expecting bounce
        """
        if len(bars) < 20:
            return None
        
        closes = [b['close'] for b in bars]
        
        current_price = closes[-1]
        sma_20 = sum(closes[-20:]) / 20
        
        # Calculate how far below the MA we are
        deviation = (current_price - sma_20) / sma_20
        
        # Buy if price is 3%+ below 20-day MA
        if deviation < -0.03:
            strength = abs(deviation) * 10  # Higher deviation = stronger signal
            return {
                'symbol': symbol,
                'side': 'buy',
                'price': current_price,
                'strength': strength,
                'reason': f'Price {abs(deviation)*100:.1f}% below 20-SMA (${sma_20:.2f}), expecting reversion'
            }
        
        return None
    
    def _rsi_strategy(self, symbol: str, bars: List[Dict]) -> Optional[Dict]:
        """
        RSI Oversold Strategy
        Buy when RSI drops below 30 (oversold)
        """
        if len(bars) < 15:
            return None
        
        closes = [b['close'] for b in bars]
        
        # Calculate RSI
        rsi = self._calculate_rsi(closes, period=14)
        
        if rsi is None:
            return None
        
        current_price = closes[-1]
        
        # Buy if RSI is oversold (below 30)
        if rsi < 30:
            strength = (30 - rsi) / 10  # Lower RSI = stronger signal
            return {
                'symbol': symbol,
                'side': 'buy',
                'price': current_price,
                'strength': strength,
                'reason': f'RSI oversold at {rsi:.1f}'
            }
        
        return None
    
    def _vwap_strategy(self, symbol: str, bars: List[Dict]) -> Optional[Dict]:
        """
        VWAP Bounce Strategy
        Buy when price dips to or below VWAP
        """
        if len(bars) < 10:
            return None
        
        # Calculate VWAP (simplified - using available bars)
        total_volume = 0
        total_vp = 0  # volume * price
        
        for bar in bars[-10:]:
            typical_price = (bar['high'] + bar['low'] + bar['close']) / 3
            total_vp += typical_price * bar['volume']
            total_volume += bar['volume']
        
        if total_volume == 0:
            return None
        
        vwap = total_vp / total_volume
        current_price = bars[-1]['close']
        
        # Buy if price is at or below VWAP
        if current_price <= vwap * 1.005:  # Within 0.5% of VWAP
            deviation = (vwap - current_price) / vwap
            strength = max(0.5, deviation * 20)
            return {
                'symbol': symbol,
                'side': 'buy',
                'price': current_price,
                'strength': strength,
                'reason': f'Price at VWAP support (${vwap:.2f})'
            }
        
        return None
    
    def _calculate_rsi(self, closes: List[float], period: int = 14) -> Optional[float]:
        """Calculate RSI indicator"""
        if len(closes) < period + 1:
            return None
        
        gains = []
        losses = []
        
        for i in range(1, len(closes)):
            change = closes[i] - closes[i-1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        if len(gains) < period:
            return None
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TRADE EXECUTION
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _execute_trade(self, opportunity: Dict):
        """Execute a trade based on opportunity signal"""
        symbol = opportunity['symbol']
        side = opportunity['side']
        price = opportunity['price']
        strategy = opportunity.get('strategy', 'unknown')
        reason = opportunity.get('reason', '')
        
        # Calculate position size based on strategy allocation
        allocation_pct = self.allocations.get(strategy, 25) / 100
        position_value = min(self.max_position_size * allocation_pct * 2, self.max_position_size)
        
        # Calculate shares
        qty = int(position_value / price)
        if qty < 1:
            print(f"   ⚠️ {symbol}: Position too small (${position_value:.2f} / ${price:.2f})")
            return
        
        print(f"\n   📈 EXECUTING: {side.upper()} {qty} {symbol} @ ~${price:.2f}")
        print(f"      Strategy: {strategy}")
        print(f"      Reason: {reason}")
        
        try:
            # Place market order with extended hours enabled
            result = self.broker.place_market_order(symbol, qty, side, extended_hours=True)
            
            if result:
                self.trades_today += 1
                print(f"   ✅ Order placed! ID: {result.get('id', 'N/A')}")
                
                # Log to database
                self.db.save_trade({
                    'symbol': symbol,
                    'side': side,
                    'qty': qty,
                    'price': price,
                    'strategy': strategy,
                    'order_id': result.get('id'),
                    'status': 'submitted'
                })
            else:
                print(f"   ❌ Order failed")
                
        except Exception as e:
            print(f"   ❌ Trade execution error: {e}")
    
    def _manage_existing_positions(self, positions: List[Dict]):
        """Check existing positions for stop loss / take profit"""
        for pos in positions:
            symbol = pos['symbol']
            qty = float(pos['qty'])
            entry_price = float(pos['avg_entry_price'])
            current_price = float(pos['current_price'])
            unrealized_pnl_pct = float(pos.get('unrealized_plpc', 0))
            
            # Check stop loss
            if unrealized_pnl_pct <= -self.stop_loss_pct:
                print(f"\n   🛑 STOP LOSS: {symbol} at {unrealized_pnl_pct*100:.1f}%")
                self._close_position(symbol, qty, 'stop_loss')
            
            # Check take profit
            elif unrealized_pnl_pct >= self.take_profit_pct:
                print(f"\n   🎯 TAKE PROFIT: {symbol} at +{unrealized_pnl_pct*100:.1f}%")
                self._close_position(symbol, qty, 'take_profit')
    
    def _close_position(self, symbol: str, qty: float, reason: str):
        """Close a position"""
        try:
            result = self.broker.place_market_order(symbol, int(qty), 'sell')
            if result:
                print(f"   ✅ Closed {symbol} ({reason})")
                self.trades_today += 1
        except Exception as e:
            print(f"   ❌ Failed to close {symbol}: {e}")
    
    def get_status(self) -> Dict:
        """Get current bot status"""
        return {
            'running': self.running,
            'strategy': self.strategy,
            'trades_today': self.trades_today,
            'daily_pnl': self.daily_pnl,
            'win_rate': self.win_rate,
            'last_scan': self.last_scan_time.isoformat() if self.last_scan_time else None,
            'allocations': self.allocations
        }
