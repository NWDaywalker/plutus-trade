"""
Alpaca broker integration module
Handles connection to Alpaca paper trading API
"""

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockLatestQuoteRequest, StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from typing import Dict, List, Optional
from datetime import datetime, timedelta

class AlpacaBroker:
    def __init__(self, api_key: str, secret_key: str, base_url: str = "https://paper-api.alpaca.markets"):
        """Initialize Alpaca broker connection"""
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url
        
        # Initialize trading client
        self.trading_client = TradingClient(api_key, secret_key, paper=True)
        
        # Initialize data client (no auth needed for market data)
        self.data_client = StockHistoricalDataClient(api_key, secret_key)
        
        print("✅ Connected to Alpaca (Paper Trading)")
    
    def get_account(self) -> Dict:
        """Get account information"""
        try:
            account = self.trading_client.get_account()
            return {
                'equity': float(account.equity),
                'cash': float(account.cash),
                'buying_power': float(account.buying_power),
                'portfolio_value': float(account.portfolio_value),
                'status': account.status
            }
        except Exception as e:
            print(f"❌ Error getting account: {e}")
            return {}
    
    def get_positions(self) -> List[Dict]:
        """Get current positions"""
        try:
            positions = self.trading_client.get_all_positions()
            return [{
                'symbol': pos.symbol,
                'qty': float(pos.qty),
                'avg_entry_price': float(pos.avg_entry_price),
                'current_price': float(pos.current_price),
                'market_value': float(pos.market_value),
                'unrealized_pl': float(pos.unrealized_pl),
                'unrealized_plpc': float(pos.unrealized_plpc)
            } for pos in positions]
        except Exception as e:
            print(f"❌ Error getting positions: {e}")
            return []
    
    def get_quote(self, symbol: str) -> Optional[Dict]:
        """Get latest quote for a symbol"""
        try:
            request = StockLatestQuoteRequest(symbol_or_symbols=symbol)
            quote = self.data_client.get_stock_latest_quote(request)
            
            if symbol in quote:
                q = quote[symbol]
                return {
                    'symbol': symbol,
                    'bid': float(q.bid_price),
                    'ask': float(q.ask_price),
                    'bid_size': int(q.bid_size),
                    'ask_size': int(q.ask_size),
                    'timestamp': q.timestamp.isoformat()
                }
            return None
        except Exception as e:
            print(f"❌ Error getting quote for {symbol}: {e}")
            return None
    
    def get_bars(self, symbol: str, timeframe: str = "1Min", limit: int = 100) -> List[Dict]:
        """Get historical bars for a symbol"""
        try:
            # Map timeframe string to TimeFrame enum
            timeframe_map = {
                "1Min": TimeFrame.Minute,
                "5Min": TimeFrame(5, "Min"),
                "15Min": TimeFrame(15, "Min"),
                "1Hour": TimeFrame.Hour,
                "1Day": TimeFrame.Day
            }
            
            tf = timeframe_map.get(timeframe, TimeFrame.Minute)
            
            request = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=tf,
                start=datetime.now() - timedelta(days=5),
                limit=limit
            )
            
            bars = self.data_client.get_stock_bars(request)
            
            if symbol in bars:
                return [{
                    'timestamp': bar.timestamp.isoformat(),
                    'open': float(bar.open),
                    'high': float(bar.high),
                    'low': float(bar.low),
                    'close': float(bar.close),
                    'volume': int(bar.volume)
                } for bar in bars[symbol]]
            return []
        except Exception as e:
            print(f"❌ Error getting bars for {symbol}: {e}")
            return []
    
    def place_market_order(self, symbol: str, qty: float, side: str) -> Optional[Dict]:
        """Place a market order"""
        try:
            order_side = OrderSide.BUY if side.upper() == 'BUY' else OrderSide.SELL
            
            order_data = MarketOrderRequest(
                symbol=symbol,
                qty=qty,
                side=order_side,
                time_in_force=TimeInForce.DAY
            )
            
            order = self.trading_client.submit_order(order_data)
            
            return {
                'order_id': order.id,
                'symbol': order.symbol,
                'qty': float(order.qty),
                'side': order.side.value,
                'type': order.type.value,
                'status': order.status.value,
                'created_at': order.created_at.isoformat()
            }
        except Exception as e:
            print(f"❌ Error placing market order: {e}")
            return None
    
    def place_limit_order(self, symbol: str, qty: float, side: str, limit_price: float) -> Optional[Dict]:
        """Place a limit order"""
        try:
            order_side = OrderSide.BUY if side.upper() == 'BUY' else OrderSide.SELL
            
            order_data = LimitOrderRequest(
                symbol=symbol,
                qty=qty,
                side=order_side,
                time_in_force=TimeInForce.DAY,
                limit_price=limit_price
            )
            
            order = self.trading_client.submit_order(order_data)
            
            return {
                'order_id': order.id,
                'symbol': order.symbol,
                'qty': float(order.qty),
                'side': order.side.value,
                'type': order.type.value,
                'limit_price': float(order.limit_price),
                'status': order.status.value,
                'created_at': order.created_at.isoformat()
            }
        except Exception as e:
            print(f"❌ Error placing limit order: {e}")
            return None
    
    def get_orders(self, status: str = "all") -> List[Dict]:
        """Get orders"""
        try:
            from alpaca.trading.enums import QueryOrderStatus
            from alpaca.trading.requests import GetOrdersRequest
            
            status_map = {
                "open": QueryOrderStatus.OPEN,
                "closed": QueryOrderStatus.CLOSED,
                "all": QueryOrderStatus.ALL
            }
            
            # Create proper request object
            request = GetOrdersRequest(
                status=status_map.get(status, QueryOrderStatus.ALL),
                limit=500
            )
            
            orders = self.trading_client.get_orders(filter=request)
            
            return [{
                'id': str(order.id),
                'order_id': str(order.id),
                'symbol': order.symbol,
                'qty': float(order.qty),
                'side': order.side.value,
                'type': order.type.value,
                'status': order.status.value,
                'filled_qty': float(order.filled_qty) if order.filled_qty else 0,
                'filled_avg_price': float(order.filled_avg_price) if order.filled_avg_price else 0,
                'limit_price': float(order.limit_price) if order.limit_price else None,
                'created_at': order.created_at.isoformat(),
                'filled_at': order.filled_at.isoformat() if order.filled_at else None
            } for order in orders]
        except Exception as e:
            print(f"❌ Error getting orders: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def cancel_order(self, order_id: str) -> bool:
        """Cancel an order"""
        try:
            self.trading_client.cancel_order_by_id(order_id)
            return True
        except Exception as e:
            print(f"❌ Error canceling order: {e}")
            return False
