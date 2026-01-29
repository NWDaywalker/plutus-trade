"""
Sync trades from Alpaca to local database
This pulls all your Alpaca trade history and updates the database
"""

import os
from dotenv import load_dotenv
from alpaca_broker import AlpacaBroker
from database import Database

# Load environment variables
load_dotenv()

def sync_trades():
    """Sync all trades from Alpaca to database"""
    
    print("\n" + "="*60)
    print("🔄 SYNCING TRADES FROM ALPACA")
    print("="*60 + "\n")
    
    # Initialize
    api_key = os.getenv('ALPACA_API_KEY')
    secret_key = os.getenv('ALPACA_SECRET_KEY')
    
    if not api_key or not secret_key:
        print("❌ API keys not found in .env file")
        return
    
    broker = AlpacaBroker(api_key, secret_key)
    db = Database(os.getenv('DATABASE_PATH', '../data/trading.db'))
    
    try:
        # Get all orders from Alpaca
        print("📥 Fetching all orders from Alpaca...")
        orders = broker.get_orders(status='all')
        
        print(f"✅ Found {len(orders)} orders on Alpaca\n")
        
        synced = 0
        skipped = 0
        
        for order in orders:
            # Only sync filled orders
            if order.get('status') == 'filled':
                trade_data = {
                    'order_id': str(order.get('id')),
                    'symbol': order.get('symbol'),
                    'qty': float(order.get('filled_qty', order.get('qty', 0))),
                    'side': order.get('side'),
                    'order_type': order.get('type'),
                    'price': float(order.get('limit_price', 0)) if order.get('limit_price') else 0,
                    'filled_avg_price': float(order.get('filled_avg_price', 0)),
                    'status': order.get('status'),
                    'created_at': order.get('created_at'),
                    'filled_at': order.get('filled_at')
                }
                
                # Save to database
                result = db.save_trade(trade_data)
                
                if result:
                    synced += 1
                    print(f"✅ Synced: {trade_data['symbol']} {trade_data['side'].upper()} {trade_data['qty']} @ ${trade_data['filled_avg_price']:.2f}")
                else:
                    skipped += 1
            else:
                skipped += 1
        
        print(f"\n{'='*60}")
        print(f"✅ SYNC COMPLETE")
        print(f"   Synced: {synced} filled orders")
        print(f"   Skipped: {skipped} orders (pending/cancelled/already in DB)")
        print(f"{'='*60}\n")
        
        # Show current database stats
        all_trades = db.get_trades(500)
        print(f"📊 Total trades in database: {len(all_trades)}")
        
        # Show AAPL summary
        aapl_trades = [t for t in all_trades if t['symbol'] == 'AAPL']
        if aapl_trades:
            total_bought = sum(t['qty'] for t in aapl_trades if t['side'] == 'buy')
            print(f"   AAPL shares bought: {total_bought}")
        
    except Exception as e:
        print(f"❌ Error syncing trades: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    sync_trades()
