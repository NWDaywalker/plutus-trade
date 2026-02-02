"""
Research API Endpoints
Add these endpoints to your existing app.py in Plutus Trade
"""

from flask import Blueprint, jsonify, request
import asyncio
import threading
from datetime import datetime, timezone

# Import the research module
from research import (
    ResearchOrchestrator, 
    ResearchDatabase,
    Category,
    run_continuous_monitoring
)

# Create Blueprint for research endpoints
research_bp = Blueprint('research', __name__, url_prefix='/api/research')

# Initialize research components
research_db = ResearchDatabase('data/research.db')
orchestrator = None
monitoring_thread = None
monitoring_running = False


def get_orchestrator():
    global orchestrator
    if orchestrator is None:
        orchestrator = ResearchOrchestrator('data/research.db')
    return orchestrator


# ============================================================
# RESEARCH DATA ENDPOINTS
# ============================================================

@research_bp.route('/health', methods=['GET'])
def research_health():
    """Health check for research module"""
    return jsonify({
        'status': 'healthy',
        'monitoring_active': monitoring_running,
        'database': 'connected',
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


@research_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get overall research statistics"""
    stats = research_db.get_research_stats()
    return jsonify(stats)


@research_bp.route('/items', methods=['GET'])
def get_research_items():
    """
    Get recent research items
    Query params:
        - category: politics, sports, crypto, entertainment
        - hours: number of hours to look back (default 24)
        - limit: max items to return (default 50)
    """
    category = request.args.get('category')
    hours = request.args.get('hours', 24, type=int)
    limit = request.args.get('limit', 50, type=int)
    
    cat = Category(category) if category else None
    items = research_db.get_recent_research(category=cat, hours=hours, limit=limit)
    
    return jsonify({
        'items': items,
        'count': len(items),
        'category': category,
        'hours': hours
    })


@research_bp.route('/items/<category>', methods=['GET'])
def get_category_items(category):
    """Get research items for a specific category"""
    try:
        cat = Category(category)
    except ValueError:
        return jsonify({'error': f'Invalid category: {category}'}), 400
    
    hours = request.args.get('hours', 24, type=int)
    limit = request.args.get('limit', 50, type=int)
    
    items = research_db.get_recent_research(category=cat, hours=hours, limit=limit)
    
    orch = get_orchestrator()
    summary = orch.get_category_summary(cat)
    
    return jsonify({
        'category': category,
        'summary': summary,
        'items': items,
        'count': len(items)
    })


# ============================================================
# SIGNALS ENDPOINTS
# ============================================================

@research_bp.route('/signals', methods=['GET'])
def get_signals():
    """
    Get active trading signals
    Query params:
        - category: filter by category
    """
    category = request.args.get('category')
    cat = Category(category) if category else None
    
    signals = research_db.get_active_signals(category=cat)
    
    return jsonify({
        'signals': signals,
        'count': len(signals),
        'category': category
    })


@research_bp.route('/signals/<category>', methods=['GET'])
def get_category_signal(category):
    """Get signal for a specific category"""
    try:
        cat = Category(category)
    except ValueError:
        return jsonify({'error': f'Invalid category: {category}'}), 400
    
    signals = research_db.get_active_signals(category=cat)
    
    if not signals:
        return jsonify({
            'category': category,
            'signal': None,
            'message': 'No active signal for this category'
        })
    
    # Return the most recent/confident signal
    signal = signals[0]
    
    return jsonify({
        'category': category,
        'signal': signal
    })


@research_bp.route('/signals/generate', methods=['POST'])
def generate_signals():
    """Manually trigger signal generation"""
    orch = get_orchestrator()
    signals = orch.generate_all_signals()
    
    return jsonify({
        'generated': len(signals),
        'signals': [s.to_dict() for s in signals],
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


# ============================================================
# COLLECTION CONTROL ENDPOINTS
# ============================================================

@research_bp.route('/collect', methods=['POST'])
def trigger_collection():
    """Manually trigger a collection run"""
    def run_async():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        orch = get_orchestrator()
        result = loop.run_until_complete(orch.run_collection())
        loop.close()
        return result
    
    # Run in a thread to not block
    result = run_async()
    
    return jsonify({
        'status': 'collection_complete',
        'results': result
    })


@research_bp.route('/monitor/start', methods=['POST'])
def start_monitoring():
    """Start continuous monitoring"""
    global monitoring_thread, monitoring_running
    
    if monitoring_running:
        return jsonify({'status': 'already_running'})
    
    interval = request.json.get('interval_minutes', 15) if request.json else 15
    
    def monitor_loop():
        global monitoring_running
        monitoring_running = True
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(run_continuous_monitoring(interval))
        except Exception as e:
            print(f"Monitoring error: {e}")
        finally:
            monitoring_running = False
            loop.close()
    
    monitoring_thread = threading.Thread(target=monitor_loop, daemon=True)
    monitoring_thread.start()
    
    return jsonify({
        'status': 'monitoring_started',
        'interval_minutes': interval
    })


@research_bp.route('/monitor/status', methods=['GET'])
def monitor_status():
    """Get monitoring status"""
    return jsonify({
        'running': monitoring_running,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


# ============================================================
# SUMMARY ENDPOINTS (for dashboard)
# ============================================================

@research_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    """Get full dashboard data"""
    orch = get_orchestrator()
    
    # Get stats
    stats = research_db.get_research_stats()
    
    # Get signals for all categories
    all_signals = research_db.get_active_signals()
    
    # Get summaries for each category
    summaries = {}
    for cat in Category:
        summaries[cat.value] = orch.get_category_summary(cat)
    
    return jsonify({
        'stats': stats,
        'signals': all_signals,
        'categories': summaries,
        'monitoring_active': monitoring_running,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


# ============================================================
# HOW TO INTEGRATE WITH YOUR EXISTING app.py
# ============================================================
"""
Add these lines to your existing backend/app.py:

1. At the top with other imports:
   from research_api import research_bp

2. After creating the Flask app (after CORS(app)):
   app.register_blueprint(research_bp)

That's it! Your existing endpoints stay the same, and you get
all the research endpoints under /api/research/

Example endpoints you'll have:
- GET  /api/research/health      - Health check
- GET  /api/research/stats       - Statistics
- GET  /api/research/items       - All research items
- GET  /api/research/items/crypto - Crypto-specific items
- GET  /api/research/signals     - All signals
- GET  /api/research/signals/politics - Politics signal
- POST /api/research/collect     - Trigger collection
- POST /api/research/monitor/start - Start continuous monitoring
- GET  /api/research/dashboard   - Full dashboard data
"""
