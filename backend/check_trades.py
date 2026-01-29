from database import Database

db = Database('../data/trading.db')
trades = db.get_trades(100)

print(f"\n{'='*60}")
print(f"TOTAL TRADES IN DATABASE: {len(trades)}")
print(f"{'='*60}\n")

aapl_trades = [t for t in trades if t['symbol'] == 'AAPL']
print(f"AAPL TRADES: {len(aapl_trades)}\n")

for t in aapl_trades:
    print(f"{t['created_at']} - {t['side'].upper()} {t['qty']} shares @ ${t.get('filled_avg_price', t.get('price', 'Market'))} - Status: {t['status']}")

print(f"\n{'='*60}")
total_aapl_bought = sum(t['qty'] for t in aapl_trades if t['side'] == 'buy')
print(f"TOTAL AAPL SHARES BOUGHT: {total_aapl_bought}")
print(f"{'='*60}\n")
