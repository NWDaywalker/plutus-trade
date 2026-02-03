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

# Detailed progress tracking for each collector
collection_progress = {
    "reddit": {"status": "pending", "count": 0, "label": "Reddit"},
    "news": {"status": "pending", "count": 0, "label": "News"},
    "prediction_markets": {"status": "pending", "count": 0, "label": "Prediction Markets"},
    "polymarket": {"status": "pending", "count": 0, "label": "Polymarket"},
    "kalshi": {"status": "pending", "count": 0, "label": "Kalshi"},
    "social": {"status": "pending", "count": 0, "label": "Social"},
}

# Collector order for progress calculation
COLLECTOR_ORDER = ["reddit", "news", "prediction_markets", "polymarket", "kalshi", "social"]


def reset_progress():
    """Reset all collector progress to pending"""
    global collection_progress
    for key in collection_progress:
        collection_progress[key] = {
            "status": "pending", 
            "count": 0, 
            "label": collection_progress[key]["label"]
        }


def update_progress(collector_name, status, count=0):
    """Update progress for a specific collector"""
    global collection_progress
    if collector_name in collection_progress:
        collection_progress[collector_name]["status"] = status
        collection_progress[collector_name]["count"] = count


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
        - source_type: reddit, news, prediction_market, social_media
        - hours: number of hours to look back (default 24)
        - limit: max items to return (default 50)
    """
    category = request.args.get('category')
    source_type = request.args.get('source_type')
    hours = request.args.get('hours', 24, type=int)
    limit = request.args.get('limit', 50, type=int)
    
    cat = Category(category) if category else None
    
    # If filtering by source_type, fetch more items first then filter
    if source_type:
        # Fetch more to ensure we get enough after filtering
        all_items = research_db.get_recent_research(category=cat, hours=hours, limit=5000)
        items = [item for item in all_items if item.get('source_type') == source_type][:limit]
    else:
        items = research_db.get_recent_research(category=cat, hours=hours, limit=limit)
    
    return jsonify({
        'items': items,
        'count': len(items),
        'category': category,
        'source_type': source_type,
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
    """Get current trading signals"""
    signals = research_db.get_recent_signals(hours=24)
    return jsonify({
        'signals': signals,
        'count': len(signals)
    })


@research_bp.route('/signals/<category>', methods=['GET'])
def get_category_signal(category):
    """Get trading signal for a specific category"""
    try:
        cat = Category(category)
    except ValueError:
        return jsonify({'error': f'Invalid category: {category}'}), 400
    
    orch = get_orchestrator()
    signal = orch.generate_signal_for_category(cat)
    
    if signal:
        return jsonify({
            'signal': signal.to_dict(),
            'has_signal': True
        })
    else:
        return jsonify({
            'signal': None,
            'has_signal': False,
            'message': 'Insufficient data for signal generation'
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
    """Run collection in background thread with progress tracking"""
    global collection_running, collection_result, collection_progress
    
    collection_running = True
    collection_result = None
    reset_progress()
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        orch = get_orchestrator()
        
        results = {
            "reddit": {},
            "news": {},
            "prediction_markets": {},
            "polymarket": {},
            "kalshi": {},
            "social": {},
            "total_items": 0,
            "by_category": {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Reddit
        print("\n📱 Collecting from Reddit...")
        update_progress("reddit", "running")
        try:
            reddit_results = loop.run_until_complete(orch.reddit.collect_all())
            reddit_count = sum(len(items) for items in reddit_results.values())
            for cat, items in reddit_results.items():
                results["reddit"][cat.value] = len(items)
                results["total_items"] += len(items)
            update_progress("reddit", "complete", reddit_count)
            print(f"  ✓ Reddit: {reddit_count} items")
        except Exception as e:
            print(f"  ✗ Reddit error: {e}")
            update_progress("reddit", "error")
        
        # News
        print("\n📰 Collecting from News Sources...")
        update_progress("news", "running")
        try:
            news_results = loop.run_until_complete(orch.news.collect_all())
            news_count = sum(len(items) for items in news_results.values())
            for cat, items in news_results.items():
                results["news"][cat.value] = len(items)
                results["total_items"] += len(items)
            update_progress("news", "complete", news_count)
            print(f"  ✓ News: {news_count} items")
        except Exception as e:
            print(f"  ✗ News error: {e}")
            update_progress("news", "error")
        
        # Prediction Markets (Metaculus, Manifold)
        print("\n🎯 Collecting from Prediction Markets...")
        update_progress("prediction_markets", "running")
        try:
            pm_results = loop.run_until_complete(orch.prediction_markets.collect_all())
            pm_count = sum(len(items) for items in pm_results.values())
            for cat, items in pm_results.items():
                results["prediction_markets"][cat.value] = len(items)
                results["total_items"] += len(items)
            update_progress("prediction_markets", "complete", pm_count)
            print(f"  ✓ Prediction Markets: {pm_count} items")
        except Exception as e:
            print(f"  ✗ Prediction Markets error: {e}")
            update_progress("prediction_markets", "error")
        
        # Polymarket
        print("\n💰 Collecting from Polymarket...")
        update_progress("polymarket", "running")
        try:
            poly_results = loop.run_until_complete(orch.polymarket.collect_all())
            poly_count = sum(len(items) for items in poly_results.values())
            for cat, items in poly_results.items():
                results["polymarket"][cat.value] = len(items)
                results["total_items"] += len(items)
            update_progress("polymarket", "complete", poly_count)
            print(f"  ✓ Polymarket: {poly_count} items")
        except Exception as e:
            print(f"  ✗ Polymarket error: {e}")
            update_progress("polymarket", "error")
        
        # Kalshi
        print("\n🏛️ Collecting from Kalshi...")
        update_progress("kalshi", "running")
        try:
            kalshi_results = loop.run_until_complete(orch.kalshi.collect_all())
            kalshi_count = sum(len(items) for items in kalshi_results.values())
            for cat, items in kalshi_results.items():
                results["kalshi"][cat.value] = len(items)
                results["total_items"] += len(items)
            update_progress("kalshi", "complete", kalshi_count)
            print(f"  ✓ Kalshi: {kalshi_count} items")
        except Exception as e:
            print(f"  ✗ Kalshi error (non-fatal): {e}")
            update_progress("kalshi", "error")
        
        # Social
        print("\n🐦 Collecting from Social Media...")
        update_progress("social", "running")
        try:
            social_results = loop.run_until_complete(orch.social.collect_all())
            social_count = sum(len(items) for items in social_results.values())
            for cat, items in social_results.items():
                results["social"][cat.value] = len(items)
                results["total_items"] += len(items)
            update_progress("social", "complete", social_count)
            print(f"  ✓ Social: {social_count} items")
        except Exception as e:
            print(f"  ✗ Social error: {e}")
            update_progress("social", "error")
        
        # Calculate totals by category
        for category in Category:
            cat_total = (
                results["reddit"].get(category.value, 0) +
                results["news"].get(category.value, 0) +
                results["prediction_markets"].get(category.value, 0) +
                results["polymarket"].get(category.value, 0) +
                results["kalshi"].get(category.value, 0) +
                results["social"].get(category.value, 0)
            )
            results["by_category"][category.value] = cat_total
        
        # Generate signals
        print("\n📊 Generating Signals...")
        signals = orch.generate_all_signals()
        results['signals_generated'] = len(signals)
        
        collection_result = results
        loop.close()
        print(f"\n✅ Collection complete! Total items: {results['total_items']}")
        
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
            'started_at': collection_started_at,
            'progress': collection_progress
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
def get_collection_status():
    """
    Check the status of background collection with detailed progress.
    Returns progress for each collector.
    """
    # Calculate overall progress
    completed = sum(1 for c in collection_progress.values() if c["status"] == "complete")
    errored = sum(1 for c in collection_progress.values() if c["status"] == "error")
    total = len(COLLECTOR_ORDER)
    
    # Calculate total items collected so far
    total_items = sum(c["count"] for c in collection_progress.values())
    
    # Determine current step
    current_step = None
    for collector in COLLECTOR_ORDER:
        if collection_progress[collector]["status"] == "running":
            current_step = collector
            break
    
    return jsonify({
        'running': collection_running,
        'started_at': collection_started_at,
        'progress': collection_progress,
        'collectors': COLLECTOR_ORDER,
        'completed_count': completed,
        'error_count': errored,
        'total_count': total,
        'percent_complete': int((completed / total) * 100) if total > 0 else 0,
        'current_step': current_step,
        'total_items': total_items,
        'result': collection_result if not collection_running else None
    })


# ============================================================
# MONITORING CONTROL
# ============================================================

@research_bp.route('/monitor/start', methods=['POST'])
def start_monitoring():
    """Start continuous monitoring"""
    global monitoring_thread, monitoring_running
    
    if monitoring_running:
        return jsonify({
            'status': 'already_running',
            'message': 'Monitoring is already active'
        })
    
    interval = request.args.get('interval', 15, type=int)
    
    def run_monitor():
        global monitoring_running
        monitoring_running = True
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(run_continuous_monitoring(interval))
        finally:
            monitoring_running = False
            loop.close()
    
    monitoring_thread = threading.Thread(target=run_monitor, daemon=True)
    monitoring_thread.start()
    
    return jsonify({
        'status': 'started',
        'interval_minutes': interval
    })


@research_bp.route('/monitor/stop', methods=['POST'])
def stop_monitoring():
    """Stop continuous monitoring"""
    global monitoring_running
    monitoring_running = False
    return jsonify({
        'status': 'stopping',
        'message': 'Monitoring will stop after current cycle'
    })


# ============================================================
# DASHBOARD ENDPOINT
# ============================================================

@research_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    """Get complete dashboard data in one call"""
    orch = get_orchestrator()
    
    # Get stats
    stats = research_db.get_research_stats()
    
    # Get signals
    signals = research_db.get_recent_signals(hours=24)
    
    # Get category summaries
    summaries = {}
    for category in Category:
        summaries[category.value] = orch.get_category_summary(category)
    
    # Get top items
    top_items = research_db.get_recent_research(hours=24, limit=20)
    
    return jsonify({
        'stats': stats,
        'signals': signals,
        'summaries': summaries,
        'top_items': top_items,
        'collection_running': collection_running,
        'collection_progress': collection_progress if collection_running else None,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
