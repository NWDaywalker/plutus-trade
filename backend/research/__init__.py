"""
Deep Research Module for Polymarket
"""

from .engine import (
    Category,
    SourceType,
    ResearchItem,
    MarketSignal,
    ResearchDatabase,
)

from .orchestrator import (
    ResearchOrchestrator,
    run_continuous_monitoring,
)

__all__ = [
    "Category",
    "SourceType", 
    "ResearchItem",
    "MarketSignal",
    "ResearchDatabase",
    "ResearchOrchestrator",
    "run_continuous_monitoring",
]
