#!/usr/bin/env python3
"""
Polymarket Research Bot - CLI Runner
Run this to test the research module standalone
"""

import asyncio
import argparse
import json
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from research import (
    ResearchOrchestrator,
    ResearchDatabase,
    Category,
    run_continuous_monitoring
)


def print_banner():
    print("""
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗ ███████╗███████╗███████╗ █████╗ ██████╗  ██████╗██╗ ║
║   ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝██║ ║
║   ██████╔╝█████╗  ███████╗█████╗  ███████║██████╔╝██║     ███████║
║   ██╔══██╗██╔══╝  ╚════██║██╔══╝  ██╔══██║██╔══██╗██║     ██╔══██║
║   ██║  ██║███████╗███████║███████╗██║  ██║██║  ██║╚██████╗██║  ██║
║   ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
║                                                               ║
║         Deep Research Bot for Polymarket Trading              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    """)


async def cmd_collect(args):
    """Run a single collection"""
    orchestrator = ResearchOrchestrator()
    
    try:
        results = await orchestrator.run_collection()
        print(f"\n✅ Collection complete!")
        print(f"   Total items: {results['total_items']}")
        print(f"   By category: {json.dumps(results['by_category'], indent=2)}")
    finally:
        await orchestrator.close()


async def cmd_signals(args):
    """Generate and display signals"""
    orchestrator = ResearchOrchestrator()
    
    try:
        if not args.skip_collect:
            print("Running collection first...")
            await orchestrator.run_collection()
        
        print("\n" + "="*60)
        print("GENERATING SIGNALS")
        print("="*60)
        
        signals = orchestrator.generate_all_signals()
        
        if not signals:
            print("\n⚠️ No signals generated (insufficient data or confidence)")
            return
        
        for signal in signals:
            print(f"\n{'='*60}")
            print(f"📊 {signal.category.value.upper()} - {signal.side}")
            print(f"{'='*60}")
            print(f"Confidence:    {signal.confidence:.1%}")
            print(f"Sentiment:     {signal.sentiment_score:.2f}")
            print(f"Sources:       {signal.sources_count}")
            print(f"Engagement:    {signal.total_engagement:,}")
            print(f"\nReasoning:\n  {signal.reasoning}")
            print(f"\nTop Evidence:")
            for i, dp in enumerate(signal.datapoints[:5], 1):
                print(f"  {i}. [{dp['source']}] {dp['title'][:70]}...")
                print(f"     Sentiment: {dp['sentiment']} | Engagement: {dp['engagement']}")
    
    finally:
        await orchestrator.close()


async def cmd_summary(args):
    """Show category summaries"""
    orchestrator = ResearchOrchestrator()
    
    try:
        if not args.skip_collect:
            await orchestrator.run_collection()
        
        categories = [Category(args.category)] if args.category else list(Category)
        
        for cat in categories:
            summary = orchestrator.get_category_summary(cat)
            
            print(f"\n{'='*60}")
            print(f"📈 {cat.value.upper()} SUMMARY")
            print(f"{'='*60}")
            print(f"Total Items:   {summary['total_items']}")
            print(f"Sentiment:     {summary.get('sentiment_direction', 'N/A')} ({summary.get('average_sentiment', 0):.3f})")
            
            if summary.get('by_source'):
                print(f"By Source:     {summary['by_source']}")
            
            if summary.get('top_items'):
                print(f"\nTop Items:")
                for item in summary['top_items']:
                    print(f"  • [{item['source']}] {item['title'][:60]}...")
                    print(f"    Engagement: {item['engagement']} | Sentiment: {item['sentiment']:.2f}")
    
    finally:
        await orchestrator.close()


async def cmd_monitor(args):
    """Start continuous monitoring"""
    print_banner()
    await run_continuous_monitoring(interval_minutes=args.interval)


async def cmd_stats(args):
    """Show database statistics"""
    db = ResearchDatabase()
    stats = db.get_research_stats()
    
    print("\n📊 Research Database Statistics")
    print("="*40)
    print(f"Last Updated: {stats['last_updated']}")
    print(f"Active Signals: {stats['active_signals']}")
    print(f"\nBy Category (last 24h):")
    for cat, count in stats.get('by_category', {}).items():
        print(f"  {cat}: {count}")
    print(f"\nBy Source (last 24h):")
    for source, count in stats.get('by_source', {}).items():
        print(f"  {source}: {count}")


def main():
    parser = argparse.ArgumentParser(
        description='Polymarket Deep Research Bot',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run.py collect              # Run a single collection
  python run.py signals              # Generate trading signals
  python run.py summary --category crypto  # Show crypto summary
  python run.py monitor --interval 10      # Start monitoring (10 min interval)
  python run.py stats                # Show database statistics
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Collect command
    collect_parser = subparsers.add_parser('collect', help='Run a single collection')
    
    # Signals command
    signals_parser = subparsers.add_parser('signals', help='Generate trading signals')
    signals_parser.add_argument('--skip-collect', action='store_true',
                                help='Skip collection (use existing data)')
    
    # Summary command
    summary_parser = subparsers.add_parser('summary', help='Show category summaries')
    summary_parser.add_argument('--category', '-c', choices=['politics', 'sports', 'crypto', 'entertainment'],
                                help='Specific category to summarize')
    summary_parser.add_argument('--skip-collect', action='store_true',
                                help='Skip collection (use existing data)')
    
    # Monitor command
    monitor_parser = subparsers.add_parser('monitor', help='Start continuous monitoring')
    monitor_parser.add_argument('--interval', '-i', type=int, default=15,
                                help='Collection interval in minutes (default: 15)')
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show database statistics')
    
    args = parser.parse_args()
    
    if not args.command:
        print_banner()
        parser.print_help()
        return
    
    # Run the appropriate command
    if args.command == 'collect':
        asyncio.run(cmd_collect(args))
    elif args.command == 'signals':
        asyncio.run(cmd_signals(args))
    elif args.command == 'summary':
        asyncio.run(cmd_summary(args))
    elif args.command == 'monitor':
        asyncio.run(cmd_monitor(args))
    elif args.command == 'stats':
        asyncio.run(cmd_stats(args))


if __name__ == '__main__':
    main()
