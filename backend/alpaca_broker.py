"""
Alpaca Broker - Interface for Alpaca Trading API
Supports extended hours trading
"""

import os
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from datetime import datetime, timedelta


class AlpacaBroker:
    """Alpaca trading broker with extended hours support"""
    
    def __init__(self, api_key: str, secret_key: str, base_url: str = None):
        self.api_key = api_key
        self.secret_key = secret_key
        self.paper = 'paper' in (base_url or '').lower() if base_url else True
        
        # Initialize trading client
        self.trading_client = TradingClient(
            api_key=api_key,
            secret_key=secret_key,
            paper=self.paper
        )
        
        # Initialize data client
        self.data_client = StockHistoricalDataClient(
            api_key=api_key,
            secret_key=secret_key
        )
        
        print(f"✅ Alpaca broker initialized ({'paper' if self.paper else 'live'} trading)")
    
    def get_account(self):
        """Get account information"""
        try:
            account = self.trading_client.get_account()
            return {
                'id': str(account.id),
                'status': account.status.value if hasattr(account.status, 'value') else str(account.status),
                'currency': account.currency,
                'cash': float(account.cash),
                'buying_power': float(account.buying_power),
                'equity': float(account.equity),
                'portfolio_value': float(account.portfolio_value),
                'last_equity': float(account.last_equity),
                'pattern_day_trader': account.pattern_day_trader,
                'trading_blocked': account.trading_blocked,
                'transfers_blocked': account.transfers_blocked,
                'account_blocked': account.account_blocked
            }
        except Exception as e:
            print(f"Error getting account: {e}")
            return None
    
    def get_positions(self):
        """Get all open positions"""
        try:
            positions = self.trading_client.get_all_positions()
            return [{
                'symbol': p.symbol,
                'qty': float(p.qty),
                'side': p.side.value if hasattr(p.side, 'value') else str(p.side),
                'avg_entry_price': float(p.avg_entry_price),
                'current_price': float(p.current_price),
                'market_value': float(p.market_value),
                'unrealized_pl': float(p.unrealized_pl),
                'unrealized_plpc': float(p.unrealized_plpc),
                'cost_basis': float(p.cost_basis)
            } for p in positions]
        except Exception as e:
            print(f"Error getting positions: {e}")
            return []
    
    def get_orders(self, status='all'):
        """Get orders"""
        try:
            if status == 'all':
                orders = self.trading_client.get_orders()
            else:
                orders = self.trading_client.get_orders(filter=status)
            
            return [{
                'id': str(o.id),
                'symbol': o.symbol,
                'qty': float(o.qty) if o.qty else 0,
                'filled_qty': float(o.filled_qty) if o.filled_qty else 0,
                'side': o.side.value if hasattr(o.side, 'value') else str(o.side),
                'type': o.type.value if hasattr(o.type, 'value') else str(o.type),
                'status': o.status.value if hasattr(o.status, 'value') else str(o.status),
                'created_at': o.created_at.isoformat() if o.created_at else None,
                'filled_at': o.filled_at.isoformat() if o.filled_at else None,
                'filled_avg_price': float(o.filled_avg_price) if o.filled_avg_price else 0
            } for o in orders]
        except Exception as e:
            print(f"Error getting orders: {e}")
            return []
    
    def place_market_order(self, symbol: str, qty: float, side: str, extended_hours: bool = False):
        """
        Place a market order
        
        Args:
            symbol: Stock symbol
            qty: Number of shares
            side: 'buy' or 'sell'
            extended_hours: If True, allow trading outside regular hours
        """
        try:
            order_side = OrderSide.BUY if side.lower() == 'buy' else OrderSide.SELL
            
            # For extended hours, we need to use limit orders (market orders not allowed)
            # So we'll get the current price and place a limit order slightly above/below
            if extended_hours:
                return self._place_extended_hours_order(symbol, qty, order_side)
            
            order_request = MarketOrderRequest(
                symbol=symbol,
                qty=qty,
                side=order_side,
                time_in_force=TimeInForce.DAY
            )
            
            order = self.trading_client.submit_order(order_request)
            
            return {
                'order_id': str(order.id),
                'symbol': order.symbol,
                'qty': float(order.qty) if order.qty else qty,
                'side': order.side.value if hasattr(order.side, 'value') else str(order.side),
                'type': 'market',
                'status': order.status.value if hasattr(order.status, 'value') else str(order.status),
                'created_at': order.created_at.isoformat() if order.created_at else None
            }
        except Exception as e:
            print(f"Error placing market order: {e}")
            return None
    
    def _place_extended_hours_order(self, symbol: str, qty: float, order_side: OrderSide):
        """
        Place an extended hours order using a limit order
        Alpaca requires limit orders for extended hours trading
        """
        try:
            # Get current/last price
            bars = self.get_bars(symbol, '1Min', 1)
            if not bars:
                print(f"Cannot get price for {symbol}")
                return None
            
            last_price = bars[0]['close']
            
            # Set limit price with small buffer
            # Buy slightly above, sell slightly below to ensure fill
            if order_side == OrderSide.BUY:
                limit_price = round(last_price * 1.002, 2)  # 0.2% above
            else:
                limit_price = round(last_price * 0.998, 2)  # 0.2% below
            
            order_request = LimitOrderRequest(
                symbol=symbol,
                qty=qty,
                side=order_side,
                time_in_force=TimeInForce.DAY,
                limit_price=limit_price,
                extended_hours=True
            )
            
            order = self.trading_client.submit_order(order_request)
            
            print(f"   📝 Extended hours limit order: {symbol} @ ${limit_price}")
            
            return {
                'order_id': str(order.id),
                'symbol': order.symbol,
                'qty': float(order.qty) if order.qty else qty,
                'side': order.side.value if hasattr(order.side, 'value') else str(order.side),
                'type': 'limit',
                'limit_price': limit_price,
                'status': order.status.value if hasattr(order.status, 'value') else str(order.status),
                'extended_hours': True,
                'created_at': order.created_at.isoformat() if order.created_at else None
            }
        except Exception as e:
            print(f"Error placing extended hours order: {e}")
            return None
    
    def place_limit_order(self, symbol: str, qty: float, side: str, limit_price: float, extended_hours: bool = False):
        """Place a limit order"""
        try:
            order_side = OrderSide.BUY if side.lower() == 'buy' else OrderSide.SELL
            
            order_request = LimitOrderRequest(
                symbol=symbol,
                qty=qty,
                side=order_side,
                time_in_force=TimeInForce.DAY,
                limit_price=limit_price,
                extended_hours=extended_hours
            )
            
            order = self.trading_client.submit_order(order_request)
            
            return {
                'order_id': str(order.id),
                'symbol': order.symbol,
                'qty': float(order.qty) if order.qty else qty,
                'side': order.side.value if hasattr(order.side, 'value') else str(order.side),
                'type': 'limit',
                'limit_price': limit_price,
                'status': order.status.value if hasattr(order.status, 'value') else str(order.status),
                'created_at': order.created_at.isoformat() if order.created_at else None
            }
        except Exception as e:
            print(f"Error placing limit order: {e}")
            return None
    
    def cancel_order(self, order_id: str):
        """Cancel an order"""
        try:
            self.trading_client.cancel_order_by_id(order_id)
            return True
        except Exception as e:
            print(f"Error canceling order: {e}")
            return False
    
    def get_bars(self, symbol: str, timeframe: str = '1Hour', limit: int = 100):
        """Get historical price bars"""
        try:
            # Map timeframe string to TimeFrame object
            tf_map = {
                '1Min': TimeFrame.Minute,
                '5Min': TimeFrame(5, 'Min'),
                '15Min': TimeFrame(15, 'Min'),
                '1Hour': TimeFrame.Hour,
                '1Day': TimeFrame.Day
            }
            tf = tf_map.get(timeframe, TimeFrame.Hour)
            
            # Request bars
            request = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=tf,
                start=datetime.now() - timedelta(days=30),
                limit=limit
            )
            
            bars_data = self.data_client.get_stock_bars(request)
            
            if symbol not in bars_data:
                return []
            
            bars = bars_data[symbol]
            return [{
                'timestamp': bar.timestamp.isoformat(),
                'open': float(bar.open),
                'high': float(bar.high),
                'low': float(bar.low),
                'close': float(bar.close),
                'volume': int(bar.volume),
                'vwap': float(bar.vwap) if bar.vwap else None
            } for bar in bars]
            
        except Exception as e:
            print(f"Error getting bars for {symbol}: {e}")
            return []
    
    def get_quote(self, symbol: str):
        """Get current quote for a symbol"""
        try:
            from alpaca.data.live import StockDataStream
            from alpaca.data.requests import StockLatestQuoteRequest
            
            request = StockLatestQuoteRequest(symbol_or_symbols=symbol)
            quotes = self.data_client.get_stock_latest_quote(request)
            
            if symbol in quotes:
                q = quotes[symbol]
                return {
                    'symbol': symbol,
                    'bid': float(q.bid_price),
                    'ask': float(q.ask_price),
                    'bid_size': int(q.bid_size),
                    'ask_size': int(q.ask_size),
                    'timestamp': q.timestamp.isoformat() if q.timestamp else None
                }
            return None
        except Exception as e:
            print(f"Error getting quote for {symbol}: {e}")
            return None
