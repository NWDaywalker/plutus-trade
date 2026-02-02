import React, { useState, useEffect, useCallback } from 'react';

// API Configuration - Update this to match your backend URL
const API_BASE = 'https://plutus-trade-backend.onrender.com/api/research';

const ResearchDashboard = () => {
  const [activeTab, setActiveTab] = useState('signals');
  const [signals, setSignals] = useState([]);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCollecting, setIsCollecting] = useState(false);
  const [lastCollection, setLastCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categories = [
    { id: 'all', label: 'All', icon: '📊', color: '#8B5CF6' },
    { id: 'politics', label: 'Politics', icon: '🏛️', color: '#EF4444' },
    { id: 'sports', label: 'Sports', icon: '⚽', color: '#10B981' },
    { id: 'crypto', label: 'Crypto', icon: '₿', color: '#F59E0B' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#EC4899' },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [signalsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/signals`),
        fetch(`${API_BASE}/stats`),
      ]);

      if (signalsRes.ok) {
        const signalsData = await signalsRes.json();
        setSignals(signalsData.signals || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch items based on category
      const itemsUrl = selectedCategory === 'all' 
        ? `${API_BASE}/items`
        : `${API_BASE}/items/${selectedCategory}`;
      
      const itemsRes = await fetch(itemsUrl);
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData.items || []);
      }

    } catch (err) {
      setError('Failed to fetch research data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const runCollection = async () => {
    setIsCollecting(true);
    try {
      const res = await fetch(`${API_BASE}/collect`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLastCollection(data);
        // Refresh data after collection
        setTimeout(fetchData, 2000);
      }
    } catch (err) {
      console.error('Collection failed:', err);
    } finally {
      setIsCollecting(false);
    }
  };

  const getSentimentColor = (score) => {
    if (score > 0.2) return '#10B981';
    if (score < -0.2) return '#EF4444';
    return '#6B7280';
  };

  const getConfidenceWidth = (confidence) => {
    return `${Math.min(confidence * 100, 100)}%`;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>
            <span style={styles.titleIcon}>🔬</span>
            Deep Research
          </h1>
          <p style={styles.subtitle}>AI-powered market intelligence for Polymarket</p>
        </div>
        <button 
          style={{
            ...styles.collectButton,
            opacity: isCollecting ? 0.7 : 1,
          }}
          onClick={runCollection}
          disabled={isCollecting}
        >
          {isCollecting ? (
            <>
              <span style={styles.spinner}></span>
              Collecting...
            </>
          ) : (
            <>
              <span>🔄</span>
              Run Collection
            </>
          )}
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{stats.total_items || 0}</span>
            <span style={styles.statLabel}>Research Items</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{stats.active_signals || 0}</span>
            <span style={styles.statLabel}>Active Signals</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{stats.sources_count || 0}</span>
            <span style={styles.statLabel}>Sources</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>
              {stats.last_collection ? formatTimeAgo(stats.last_collection) : 'Never'}
            </span>
            <span style={styles.statLabel}>Last Update</span>
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div style={styles.categoryBar}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            style={{
              ...styles.categoryButton,
              backgroundColor: selectedCategory === cat.id ? cat.color : 'transparent',
              borderColor: cat.color,
              color: selectedCategory === cat.id ? '#fff' : cat.color,
            }}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            borderBottom: activeTab === 'signals' ? '3px solid #8B5CF6' : '3px solid transparent',
            color: activeTab === 'signals' ? '#8B5CF6' : '#9CA3AF',
          }}
          onClick={() => setActiveTab('signals')}
        >
          📈 Trading Signals
        </button>
        <button
          style={{
            ...styles.tab,
            borderBottom: activeTab === 'feed' ? '3px solid #8B5CF6' : '3px solid transparent',
            color: activeTab === 'feed' ? '#8B5CF6' : '#9CA3AF',
          }}
          onClick={() => setActiveTab('feed')}
        >
          📰 Research Feed
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.loadingSpinner}></div>
            <p>Loading research data...</p>
          </div>
        ) : error ? (
          <div style={styles.errorState}>
            <span>⚠️</span>
            <p>{error}</p>
            <button style={styles.retryButton} onClick={fetchData}>
              Retry
            </button>
          </div>
        ) : activeTab === 'signals' ? (
          <div style={styles.signalsGrid}>
            {signals.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📊</span>
                <h3>No Signals Yet</h3>
                <p>Run a collection to generate trading signals based on market research.</p>
                <button style={styles.collectButtonSmall} onClick={runCollection}>
                  Run Collection
                </button>
              </div>
            ) : (
              signals
                .filter(s => selectedCategory === 'all' || s.category === selectedCategory)
                .map((signal, idx) => (
                  <div key={idx} style={styles.signalCard}>
                    <div style={styles.signalHeader}>
                      <span style={styles.signalCategory}>
                        {categories.find(c => c.id === signal.category)?.icon}
                        {signal.category?.toUpperCase()}
                      </span>
                      <span style={{
                        ...styles.signalSide,
                        backgroundColor: signal.side === 'YES' ? '#10B981' : '#EF4444',
                      }}>
                        {signal.side}
                      </span>
                    </div>
                    
                    <h3 style={styles.signalQuestion}>{signal.market_question}</h3>
                    
                    <div style={styles.signalMetrics}>
                      <div style={styles.metric}>
                        <span style={styles.metricLabel}>Confidence</span>
                        <div style={styles.confidenceBar}>
                          <div style={{
                            ...styles.confidenceFill,
                            width: getConfidenceWidth(signal.confidence),
                            backgroundColor: signal.confidence > 0.7 ? '#10B981' : signal.confidence > 0.5 ? '#F59E0B' : '#EF4444',
                          }}></div>
                        </div>
                        <span style={styles.metricValue}>{(signal.confidence * 100).toFixed(0)}%</span>
                      </div>
                      
                      <div style={styles.metric}>
                        <span style={styles.metricLabel}>Sentiment</span>
                        <span style={{
                          ...styles.metricValue,
                          color: getSentimentColor(signal.sentiment_score),
                        }}>
                          {signal.sentiment_score > 0 ? '↑' : signal.sentiment_score < 0 ? '↓' : '→'}
                          {' '}{(signal.sentiment_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      <div style={styles.metric}>
                        <span style={styles.metricLabel}>Sources</span>
                        <span style={styles.metricValue}>{signal.sources_count}</span>
                      </div>
                    </div>

                    <p style={styles.signalReasoning}>{signal.reasoning}</p>

                    {signal.datapoints && signal.datapoints.length > 0 && (
                      <div style={styles.datapoints}>
                        <h4 style={styles.datapointsTitle}>Key Datapoints</h4>
                        {signal.datapoints.slice(0, 3).map((dp, i) => (
                          <div key={i} style={styles.datapoint}>
                            <span style={styles.dpSource}>{dp.source}</span>
                            <span style={styles.dpTitle}>{dp.title}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={styles.signalFooter}>
                      <span style={styles.signalTime}>
                        Generated {formatTimeAgo(signal.generated_at)}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        ) : (
          <div style={styles.feedList}>
            {items.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📰</span>
                <h3>No Research Items</h3>
                <p>Run a collection to gather research from Reddit, news, and prediction markets.</p>
                <button style={styles.collectButtonSmall} onClick={runCollection}>
                  Run Collection
                </button>
              </div>
            ) : (
              items.slice(0, 50).map((item, idx) => (
                <div key={idx} style={styles.feedItem}>
                  <div style={styles.feedItemHeader}>
                    <span style={styles.feedSource}>{item.source_name}</span>
                    <span style={styles.feedTime}>{formatTimeAgo(item.timestamp)}</span>
                  </div>
                  <h4 style={styles.feedTitle}>{item.title}</h4>
                  <div style={styles.feedMeta}>
                    <span style={{
                      ...styles.feedSentiment,
                      color: getSentimentColor(item.sentiment),
                    }}>
                      {item.sentiment > 0 ? '🟢 Bullish' : item.sentiment < 0 ? '🔴 Bearish' : '⚪ Neutral'}
                    </span>
                    <span style={styles.feedEngagement}>
                      ⬆️ {item.upvotes || 0} · 💬 {item.comments || 0}
                    </span>
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.feedLink}>
                      View Source →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Collection Result Toast */}
      {lastCollection && (
        <div style={styles.toast}>
          <span>✅ Collection complete!</span>
          <span>{lastCollection.total_items} items collected</span>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0F0F1A',
    color: '#E5E7EB',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerLeft: {},
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  titleIcon: {
    fontSize: '32px',
    WebkitTextFillColor: 'initial',
  },
  subtitle: {
    color: '#9CA3AF',
    margin: '4px 0 0 0',
    fontSize: '14px',
  },
  collectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#8B5CF6',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statItem: {
    backgroundColor: '#1A1A2E',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #2D2D44',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#8B5CF6',
  },
  statLabel: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginTop: '4px',
  },
  categoryBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  categoryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    border: '2px solid',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'transparent',
  },
  tabs: {
    display: 'flex',
    gap: '24px',
    borderBottom: '1px solid #2D2D44',
    marginBottom: '24px',
  },
  tab: {
    padding: '12px 0',
    background: 'none',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  content: {
    animation: 'fadeIn 0.3s ease',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#9CA3AF',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #2D2D44',
    borderTopColor: '#8B5CF6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: '16px',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px',
    color: '#EF4444',
    fontSize: '48px',
  },
  retryButton: {
    marginTop: '16px',
    padding: '8px 24px',
    backgroundColor: '#8B5CF6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  collectButtonSmall: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: '#8B5CF6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  signalsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  signalCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #2D2D44',
    transition: 'all 0.2s ease',
  },
  signalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  signalCategory: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  signalSide: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#fff',
  },
  signalQuestion: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 16px 0',
    color: '#F3F4F6',
    lineHeight: '1.4',
  },
  signalMetrics: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  metric: {
    flex: '1',
    minWidth: '80px',
  },
  metricLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#6B7280',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  metricValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#E5E7EB',
  },
  confidenceBar: {
    height: '6px',
    backgroundColor: '#2D2D44',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  signalReasoning: {
    fontSize: '13px',
    color: '#9CA3AF',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  datapoints: {
    backgroundColor: '#0F0F1A',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '12px',
  },
  datapointsTitle: {
    fontSize: '11px',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 8px 0',
  },
  datapoint: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    marginBottom: '6px',
  },
  dpSource: {
    color: '#8B5CF6',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  dpTitle: {
    color: '#9CA3AF',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signalFooter: {
    borderTop: '1px solid #2D2D44',
    paddingTop: '12px',
    marginTop: '12px',
  },
  signalTime: {
    fontSize: '11px',
    color: '#6B7280',
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  feedItem: {
    backgroundColor: '#1A1A2E',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #2D2D44',
  },
  feedItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  feedSource: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#8B5CF6',
  },
  feedTime: {
    fontSize: '11px',
    color: '#6B7280',
  },
  feedTitle: {
    fontSize: '14px',
    fontWeight: '500',
    margin: '0 0 8px 0',
    color: '#E5E7EB',
    lineHeight: '1.4',
  },
  feedMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
  },
  feedSentiment: {
    fontWeight: '500',
  },
  feedEngagement: {
    color: '#6B7280',
  },
  feedLink: {
    display: 'inline-block',
    marginTop: '8px',
    fontSize: '12px',
    color: '#8B5CF6',
    textDecoration: 'none',
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#10B981',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    animation: 'fadeIn 0.3s ease',
  },
};

export default ResearchDashboard;
