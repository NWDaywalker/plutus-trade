"""
Trading Bot - Aggressive multi-strategy automated trading
Executes actual trades via Alpaca API

UPDATED: 5-minute bars, relaxed thresholds, market hours enforcement
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
        self.max_position_size = config.get('max_position_size', 1000)
        self.max_positions = config.get('max_positions', 10)
        self.max_daily_loss = config.get('max_daily_loss', 500)
        self.check_interval = config.get('check_interval', 60)
        
        # Market hours setting
        self.market_hours_only = config.get('market_hours_only', True)
        
        # Risk management
        self.stop_loss_pct = config.get('stop_loss_pct', 0.02)
        self.take_profit_pct = config.get('take_profit_pct', 0.05)
        
        # Tracking
        self.trades_today = 0
        self.daily_pnl = 0
        self.start_equity = None
        self.last_scan_time = None
        self.win_rate = 0
        self.wins = 0
        self.losses = 0
        self.signals_found = 0
        
        print(f"🤖 TradingBot initialized")
        print(f"   Symbols: {len(self.symbols)}")
        print(f"   Max position: ${self.max_position_size}")
        print(f"   Max positions: {self.max_positions}")
        print(f"   Check interval: {self.check_interval}s")
        print(f"   Market hours only: {self.market_hours_only}")
        print(f"   Allocations: {self.allocations}")
        print(f"   Using 5-minute bars with relaxed thresholds")
    
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
                time.sleep(5)
    
    def stop(self):
        """Stop the trading bot"""
        self.running = False
        print("🛑 Trading bot stopped")
    
    def _is_market_open(self) -> bool:
        """Check if market is open (or extended hours if enabled)"""
        try:
            clock = self.broker.api.get_clock()
            
            if self.market_hours_only:
                return clock.is_open
            else:
                # Extended hours: 4am - 8pm ET
                now = datetime.now()
                hour = now.hour
                # Rough check - 4am to 8pm ET (adjust for your timezone)
                return 4 <= hour <= 20
        except Exception as e:
            print(f"⚠️ Could not check market hours: {e}")
            return True  # Default to running
    
    def _trading_cycle(self):
        """Main trading cycle - scan and execute"""
        self.last_scan_time = datetime.now()
        
        # Check market hours
        if not self._is_market_open():
            print(f"💤 Market closed. Waiting... ({datetime.now().strftime('%H:%M:%S')})")
            return
        
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
        
        # Scan for opportunities
        print(f"\n🔍 Scanning {len(self.symbols)} symbols... ({datetime.now().strftime('%H:%M:%S')})")
        
        opportunities = []
        symbols_with_data = 0
        symbols_without_data = 0
        strategy_hits = {'momentum': 0, 'mean_reversion': 0, 'rsi': 0, 'vwap': 0}
        
        for symbol in self.symbols:
            # Skip if we already have a position
            if any(p['symbol'] == symbol for p in positions):
                continue
            
            # Get market data - NOW USING 5-MINUTE BARS
            bars = self._get_bars(symbol, limit=100)
            if not bars or len(bars) < 20:
                symbols_without_data += 1
                continue
            
            symbols_with_data += 1
            
            # Run each strategy with RELAXED thresholds
            if self.allocations.get('momentum', 0) > 0:
                signal = self._momentum_strategy(symbol, bars)
                if signal:
                    signal['strategy'] = 'momentum'
                    opportunities.append(signal)
                    strategy_hits['momentum'] += 1
            
            if self.allocations.get('mean_reversion', 0) > 0:
                signal = self._mean_reversion_strategy(symbol, bars)
                if signal:
                    signal['strategy'] = 'mean_reversion'
                    opportunities.append(signal)
                    strategy_hits['mean_reversion'] += 1
            
            if self.allocations.get('rsi', 0) > 0:
                signal = self._rsi_strategy(symbol, bars)
                if signal:
                    signal['strategy'] = 'rsi'
                    opportunities.append(signal)
                    strategy_hits['rsi'] += 1
            
            if self.allocations.get('vwap', 0) > 0:
                signal = self._vwap_strategy(symbol, bars)
                if signal:
                    signal['strategy'] = 'vwap'
                    opportunities.append(signal)
                    strategy_hits['vwap'] += 1
        
        # Sort by signal strength and execute top opportunities
        opportunities.sort(key=lambda x: x.get('strength', 0), reverse=True)
        
        slots_available = self.max_positions - current_position_count
        to_execute = opportunities[:slots_available]
        
        self.signals_found = len(opportunities)
        
        print(f"   📊 Data: {symbols_with_data} symbols, {symbols_without_data} skipped")
        print(f"   📈 Signals: {strategy_hits}")
        print(f"   🎯 Total opportunities: {len(opportunities)}, executing top {len(to_execute)}")
        
        for opp in to_execute:
            self._execute_trade(opp)
        
        # Manage existing positions
        self._manage_existing_positions(positions)
    
    def _get_bars(self, symbol: str, limit: int = 100) -> List[Dict]:
        """Get recent price bars - USING 5-MINUTE TIMEFRAME"""
        try:
            return self.broker.get_bars(symbol, timeframe='5Min', limit=limit)
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
    # STRATEGIES - RELAXED THRESHOLDS FOR MORE SIGNALS
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _momentum_strategy(self, symbol: str, bars: List[Dict]) -> Optional[Dict]:
        """
        Momentum Breakout Strategy
        RELAXED: 98% of 20-period high, 1.1x volume (was 99%, 1.2x)
        """
        if len(bars) < 20:
            return None
        
        closes = [b['close'] for b in bars]
        volumes = [b['volume'] for b in bars]
        
        current_price = closes[-1]
        high_20 = max(closes[-20:])
        avg_volume = sum(volumes[-20:]) / 20
        current_volume = volumes[-1]
        
        # RELAXED: 98% of high, 1.1x volume
        if current_price >= high_20 * 0.98 and current_volume > avg_volume * 1.1:
            strength = (current_volume / avg_volume) * (current_price / high_20)
            return {
                'symbol': symbol,
                'side': 'buy',
                'price': current_price,
                'strength': strength,
                'reason': f'Breakout near 20-bar high (${high_20:.2f}) with {current_volume/avg_volume:.1f}x vol'
            }
        
        return None
    
    def _mean_reversion_strategy(self, symbol: str, bars: List[Dict]) -> Optional[Dict]:
        """
        Mean Reversion Strategy
        RELAXED: 1.5% below SMA (was 2%)
        """
        if len(bars) < 20:
            return None
        
        closes = [b['close'] for b in bars]
        
        current_price = closes[-1]
        sma_20 = sum(closes[-20:]) / 20
        
        deviation = (current_price - sma_20) / sma_20
        
        # RELAXED: 1.5% below (was 2%)
        if deviation < -0.015:
            strength = abs(deviation) * 10
            return {
                'symbol': symbol,
                'side': 'buy',
                'price': current_price,
                'strength': strength,
                'reason': f'Price {abs(deviation)*100:.1f}% below 20-SMA (${sma_20:.2f})'
            }
        
        return None
    
    def _rsi_strategy(self, symbol: str, bars: List[Dict]) -> Optional[Dict]:
        """
        RSI Oversold Strategy
        RELAXED: RSI < 40 (was 35)
        """
        if len(bars) < 15:
            return None
        
        closes = [b['close'] for b in bars]
        rsi = self._calculate_rsi(closes, period=14)
        
        if rsi is None:
            return None
        
        current_price = closes[-1]
        
        # RELAXED: RSI < 40 (was 35)
        if rsi < 40:
            strength = (40 - rsi) / 10
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
        RELAXED: Price <= VWAP * 1.02 (was 1.01), using 20 bars (was 10)
        """
        if len(bars) < 20:
            return None
        
        # Calculate VWAP using more bars
        total_volume = 0
        total_vp = 0
        
        for bar in bars[-20:]:  # INCREASED from 10 to 20 bars
            typical_price = (bar['high'] + bar['low'] + bar['close']) / 3
            total_vp += typical_price * bar['volume']
            total_volume += bar['volume']
        
        if total_volume == 0:
            return None
        
        vwap = total_vp / total_volume
        current_price = bars[-1]['close']
        
        # RELAXED: 2% above VWAP (was 1%)
        if current_price <= vwap * 1.02:
            deviation = (vwap - current_price) / vwap
            strength = max(0.5, deviation * 15 + 0.4)
            return {
                'symbol': symbol,
                'side': 'buy',
                'price': current_price,
                'strength': strength,
                'reason': f'Price near VWAP (${vwap:.2f})'
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
                self.losses += 1
            
            # Check take profit
            elif unrealized_pnl_pct >= self.take_profit_pct:
                print(f"\n   🎯 TAKE PROFIT: {symbol} at +{unrealized_pnl_pct*100:.1f}%")
                self._close_position(symbol, qty, 'take_profit')
                self.wins += 1
        
        # Update win rate
        total = self.wins + self.losses
        self.win_rate = (self.wins / total * 100) if total > 0 else 0
    
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
            'wins': self.wins,
            'losses': self.losses,
            'signals_found': self.signals_found,
            'last_scan': self.last_scan_time.isoformat() if self.last_scan_time else None,
            'allocations': self.allocations,
            'market_hours_only': self.market_hours_only
        }
