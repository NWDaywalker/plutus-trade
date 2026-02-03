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

# Background collection state
collection_thread = None
collection_running = False
collection_result = None
collection_started_at = None


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
        'collection_running': collection_running,
        'database': 'connected',
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


@research_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get overall research statistics"""
    stats = research_db.get_research_stats()
    stats['collection_running'] = collection_running
    if collection_started_at:
        stats['collection_started_at'] = collection_started_at
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

def run_collection_background():
    """Run collection in background thread"""
    global collection_running, collection_result
    
    collection_running = True
    collection_result = None
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        orch = get_orchestrator()
        result = loop.run_until_complete(orch.run_collection())
        
        # Also generate signals after collection
        print("\n📊 Generating Signals...")
        signals = orch.generate_all_signals()
        result['signals_generated'] = len(signals)
        
        collection_result = result
        loop.close()
        print(f"\n✅ Background collection complete!")
        
    except Exception as e:
        print(f"\n❌ Collection error: {e}")
        collection_result = {'error': str(e)}
    finally:
        collection_running = False


@research_bp.route('/collect', methods=['POST'])
def trigger_collection():
    """
    Trigger a collection run in the background.
    Returns immediately - check /collect/status for progress.
    """
    global collection_thread, collection_running, collection_started_at
    
    if collection_running:
        return jsonify({
            'status': 'already_running',
            'message': 'Collection is already in progress',
            'started_at': collection_started_at
        })
    
    collection_started_at = datetime.now(timezone.utc).isoformat()
    collection_thread = threading.Thread(target=run_collection_background, daemon=True)
    collection_thread.start()
    
    return jsonify({
        'status': 'started',
        'message': 'Collection started in background. Check /collect/status for progress.',
        'started_at': collection_started_at
    })


@research_bp.route('/collect/status', methods=['GET'])
def collection_status():
    """Check the status of background collection"""
    return jsonify({
        'running': collection_running,
        'started_at': collection_started_at,
        'result': collection_result,
        'timestamp': datetime.now(timezone.utc).isoformat()
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
        'collection_running': collection_running,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
