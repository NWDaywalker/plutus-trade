import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, DollarSign, Activity, AlertCircle, Bot, BarChart3, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import './index.css';

// ==================== RESEARCH DASHBOARD COMPONENT ====================
const API_BASE = 'https://plutus-trade-backend.onrender.com/api/research';

const ResearchDashboard = () => {
  const [activeResearchTab, setActiveResearchTab] = useState('signals');
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

  const getConfidenceWidth = (confidence) => `${Math.min(confidence * 100, 100)}%`;

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
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🔬 Deep Research for Polymarket
          </h2>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '14px' }}>AI-powered market intelligence from Reddit, News & Prediction Markets</p>
        </div>
        <button 
          onClick={runCollection}
          disabled={isCollecting}
          className="btn btn-primary"
          style={{ opacity: isCollecting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isCollecting ? '⏳ Collecting...' : '🔄 Run Collection'}
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#8B5CF6' }}>{stats.total_items || 0}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Research Items</div>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>{stats.active_signals || 0}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Active Signals</div>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B' }}>{stats.sources_count || 0}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Sources</div>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#EC4899' }}>{stats.last_collection ? formatTimeAgo(stats.last_collection) : 'Never'}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Last Update</div>
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className="btn"
            style={{
              backgroundColor: selectedCategory === cat.id ? cat.color : '#1e293b',
              borderColor: cat.color,
              color: selectedCategory === cat.id ? '#fff' : cat.color,
              border: `2px solid ${cat.color}`,
              padding: '8px 16px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #334155', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveResearchTab('signals')}
          className="btn"
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeResearchTab === 'signals' ? '3px solid #8B5CF6' : '3px solid transparent',
            color: activeResearchTab === 'signals' ? '#8B5CF6' : '#94a3b8',
            padding: '12px 0',
            fontSize: '15px',
            fontWeight: '600',
            borderRadius: 0
          }}
        >
          📈 Trading Signals
        </button>
        <button
          onClick={() => setActiveResearchTab('feed')}
          className="btn"
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeResearchTab === 'feed' ? '3px solid #8B5CF6' : '3px solid transparent',
            color: activeResearchTab === 'feed' ? '#8B5CF6' : '#94a3b8',
            padding: '12px 0',
            fontSize: '15px',
            fontWeight: '600',
            borderRadius: 0
          }}
        >
          📰 Research Feed
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Loading research data...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#EF4444' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchData} style={{ marginTop: '16px' }}>Retry</button>
        </div>
      ) : activeResearchTab === 'signals' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {signals.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
              <h3>No Signals Yet</h3>
              <p style={{ color: '#94a3b8' }}>Run a collection to generate trading signals based on market research.</p>
              <button className="btn btn-primary" onClick={runCollection} style={{ marginTop: '16px' }}>Run Collection</button>
            </div>
          ) : (
            signals
              .filter(s => selectedCategory === 'all' || s.category === selectedCategory)
              .map((signal, idx) => (
                <div key={idx} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>
                      {categories.find(c => c.id === signal.category)?.icon} {signal.category}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#fff',
                      backgroundColor: signal.side === 'YES' ? '#10B981' : '#EF4444',
                    }}>
                      {signal.side}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', color: '#F3F4F6' }}>
                    {signal.market_question}
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Confidence</div>
                      <div style={{ height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{
                          height: '100%',
                          width: getConfidenceWidth(signal.confidence),
                          backgroundColor: signal.confidence > 0.7 ? '#10B981' : signal.confidence > 0.5 ? '#F59E0B' : '#EF4444',
                          borderRadius: '3px',
                        }}></div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{(signal.confidence * 100).toFixed(0)}%</span>
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Sentiment</div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: getSentimentColor(signal.sentiment_score) }}>
                        {signal.sentiment_score > 0 ? '↑' : signal.sentiment_score < 0 ? '↓' : '→'}
                        {' '}{(signal.sentiment_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Sources</div>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{signal.sources_count}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '16px' }}>
                    {signal.reasoning}
                  </p>

                  {signal.datapoints && signal.datapoints.length > 0 && (
                    <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Key Datapoints</h4>
                      {signal.datapoints.slice(0, 3).map((dp, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ color: '#8B5CF6', fontWeight: '500', whiteSpace: 'nowrap' }}>{dp.source}</span>
                          <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dp.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', marginTop: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>Generated {formatTimeAgo(signal.generated_at)}</span>
                  </div>
                </div>
              ))
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📰</div>
              <h3>No Research Items</h3>
              <p style={{ color: '#94a3b8' }}>Run a collection to gather research from Reddit, news, and prediction markets.</p>
              <button className="btn btn-primary" onClick={runCollection} style={{ marginTop: '16px' }}>Run Collection</button>
            </div>
          ) : (
            items.slice(0, 50).map((item, idx) => (
              <div key={idx} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#8B5CF6' }}>{item.source_name}</span>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>{formatTimeAgo(item.timestamp)}</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0', color: '#E5E7EB' }}>{item.title}</h4>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                  <span style={{ fontWeight: '500', color: getSentimentColor(item.sentiment) }}>
                    {item.sentiment > 0 ? '🟢 Bullish' : item.sentiment < 0 ? '🔴 Bearish' : '⚪ Neutral'}
                  </span>
                  <span style={{ color: '#6B7280' }}>⬆️ {item.upvotes || 0} · 💬 {item.comments || 0}</span>
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', color: '#8B5CF6', textDecoration: 'none' }}>
                    View Source →
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Collection Result Toast */}
      {lastCollection && (
        <div style={{
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
        }}>
          <span>✅ Collection complete!</span>
          <span>{lastCollection.total_items} items collected</span>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN APP COMPONENT ====================
function App() {
  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [quote, setQuote] = useState(null);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [accountHistory, setAccountHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Order form state
  const [orderForm, setOrderForm] = useState({
    symbol: 'AAPL',
    qty: '1',
    side: 'buy',
    orderType: 'market',
    limitPrice: ''
  });

  // Bot state
  const [botStatus, setBotStatus] = useState({
    running: false,
    strategy: 'momentum',
    daily_pnl: 0,
    trades_today: 0,
    win_rate: 0
  });

  // Market intelligence state
  const [recommendations, setRecommendations] = useState([]);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    if (connected) {
      fetchAllData();
      const interval = setInterval(() => {
        fetchAllData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setConnected(data.broker_connected);
      setLoading(false);
      if (!data.broker_connected) {
        setError('Broker not connected. Please configure your API keys.');
      }
    } catch (err) {
      setError('Failed to connect to backend.');
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    fetchAccount();
    fetchPositions();
    fetchOrders();
    fetchTrades();
    fetchAccountHistory();
    fetchBotStatus();
  };

  const fetchAccount = async () => {
    try {
      const response = await fetch('/api/account');
      if (response.ok) setAccount(await response.json());
    } catch (err) {}
  };

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/positions');
      if (response.ok) setPositions(await response.json());
    } catch (err) {}
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=open');
      if (response.ok) setOrders(await response.json());
    } catch (err) {}
  };

  const fetchTrades = async () => {
    try {
      const response = await fetch('/api/trades?limit=50');
      if (response.ok) {
        const data = await response.json();
        setTrades(data);
        calculateBotStats(data);
      }
    } catch (err) {}
  };

  const fetchAccountHistory = async () => {
    try {
      const response = await fetch('/api/account/history?limit=50');
      if (response.ok) {
        const data = await response.json();
        setAccountHistory(data.reverse());
      }
    } catch (err) {}
  };

  const fetchBotStatus = async () => {
    try {
      const response = await fetch('/api/bot/status');
      if (response.ok) {
        const data = await response.json();
        setBotStatus(prev => ({
          ...prev,
          running: data.running,
          strategy: data.strategy || prev.strategy
        }));
      }
    } catch (err) {}
  };

  const calculateBotStats = (tradeData) => {
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = tradeData.filter(t => t.created_at.startsWith(today));
    const dailyPnl = positions.reduce((sum, pos) => sum + pos.unrealized_pl, 0);
    const completedTrades = tradeData.filter(t => t.status === 'filled');
    const profitableTrades = completedTrades.filter(t => t.side === 'sell' && t.filled_avg_price > 0);
    const winRate = completedTrades.length > 0 ? (profitableTrades.length / completedTrades.length * 100) : 0;
    
    setBotStatus({
      running: false,
      strategy: 'momentum',
      daily_pnl: dailyPnl,
      trades_today: todayTrades.length,
      win_rate: winRate
    });
  };

  const handleOrderFormChange = (e) => {
    const { name, value } = e.target;
    setOrderForm(prev => ({ ...prev, [name]: value }));
  };

  const handleGetQuote = async () => {
    if (orderForm.symbol) {
      try {
        const response = await fetch(`/api/quote/${orderForm.symbol.toUpperCase()}`);
        if (response.ok) setQuote(await response.json());
      } catch (err) {}
    }
  };

  const handlePlaceOrder = async () => {
    if (!orderForm.symbol || !orderForm.qty) {
      alert('Please enter symbol and quantity');
      return;
    }

    const endpoint = orderForm.orderType === 'market' ? '/api/orders/market' : '/api/orders/limit';
    const orderData = {
      symbol: orderForm.symbol.toUpperCase(),
      qty: parseFloat(orderForm.qty),
      side: orderForm.side
    };

    if (orderForm.orderType === 'limit') {
      if (!orderForm.limitPrice) {
        alert('Please enter limit price');
        return;
      }
      orderData.limit_price = parseFloat(orderForm.limitPrice);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        alert('Order placed successfully!');
        fetchOrders();
        fetchPositions();
        setOrderForm({ symbol: '', qty: '1', side: 'buy', orderType: 'market', limitPrice: '' });
        setQuote(null);
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (err) {
      alert('Failed to place order');
    }
  };

  const handleStartBot = async () => {
    try {
      const response = await fetch('/api/bot/start', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        alert(`Bot started! Strategy: ${data.strategy}, Monitoring ${data.symbols_count} symbols`);
        fetchBotStatus();
      } else {
        alert(`Failed to start bot: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to start bot');
    }
  };

  const handleStopBot = async () => {
    try {
      const response = await fetch('/api/bot/stop', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        alert('Bot stopped successfully!');
        fetchBotStatus();
      } else {
        alert(`Failed to stop bot: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to stop bot');
    }
  };

  const handleChangeStrategy = async (newStrategy) => {
    if (botStatus.running) {
      alert('Please stop the bot before changing strategy');
      return;
    }
    
    try {
      const response = await fetch('/api/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: newStrategy })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setBotStatus(prev => ({ ...prev, strategy: newStrategy }));
        alert(`Strategy changed to ${newStrategy}!`);
      } else {
        alert(`Failed to change strategy: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to change strategy');
    }
  };

  const fetchRecommendations = async () => {
    setLoadingIntelligence(true);
    try {
      const response = await fetch('/api/intelligence/recommendations');
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoadingIntelligence(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;
  const formatDate = (dateString) => new Date(dateString).toLocaleString();

  const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealized_pl, 0);
  const winningPositions = positions.filter(p => p.unrealized_pl > 0).length;
  const losingPositions = positions.filter(p => p.unrealized_pl < 0).length;
  const COLORS = ['#10b981', '#ef4444', '#64748b'];

  if (loading) {
    return <div className="app-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="app-container">
      <div className="header">
        <div>
          <h1>⚡ Plutus Trade</h1>
          <p style={{ marginBottom: '12px' }}>Automated Paper Trading Platform</p>
          <span className={`status-badge ${connected ? 'status-connected' : 'status-disconnected'}`}>
            {connected ? '● Connected' : '● Disconnected'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>Bot Status</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: botStatus.running ? '#10b981' : '#64748b' }}>
              {botStatus.running ? '🟢 Running' : '⚪ Stopped'}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} style={{ marginRight: '8px', display: 'inline' }} />
          {error}
        </div>
      )}

      {connected && account && (
        <>
          {/* UPDATED TABS - Added 'research' tab */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #334155', paddingBottom: '8px', flexWrap: 'wrap' }}>
            {['dashboard', 'trading', 'bot', 'research', 'intelligence', 'analytics'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="btn"
                style={{
                  background: activeTab === tab ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#1e293b',
                  border: activeTab === tab ? 'none' : '1px solid #475569',
                  padding: '8px 16px',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'intelligence' ? '🧠 Intelligence' : tab === 'research' ? '🔬 Research' : tab}
              </button>
            ))}
          </div>

          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-2">
                <div className="card">
                  <div className="card-title">
                    <DollarSign size={20} style={{ display: 'inline', marginRight: '8px' }} />
                    Account Balance
                  </div>
                  <div className="stat-grid">
                    <div className="stat-item">
                      <div className="stat-label">Equity</div>
                      <div className="stat-value">{formatCurrency(account.equity)}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Cash</div>
                      <div className="stat-value">{formatCurrency(account.cash)}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Buying Power</div>
                      <div className="stat-value">{formatCurrency(account.buying_power)}</div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <Bot size={20} style={{ display: 'inline', marginRight: '8px' }} />
                    Bot Performance Today
                  </div>
                  <div className="stat-grid">
                    <div className="stat-item">
                      <div className="stat-label">Strategy</div>
                      <div className="stat-value" style={{ fontSize: '18px', textTransform: 'capitalize' }}>
                        {botStatus.strategy}
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Daily P&L</div>
                      <div className={`stat-value ${botStatus.daily_pnl >= 0 ? 'stat-positive' : 'stat-negative'}`}>
                        {formatCurrency(botStatus.daily_pnl)}
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Trades Today</div>
                      <div className="stat-value">{botStatus.trades_today}</div>
                    </div>
                  </div>
                </div>
              </div>

              {accountHistory.length > 0 && (
                <div className="card">
                  <div className="card-title">
                    <BarChart3 size={20} style={{ display: 'inline', marginRight: '8px' }} />
                    Account Equity Over Time
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={accountHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="timestamp" stroke="#94a3b8" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} labelFormatter={(v) => new Date(v).toLocaleString()} formatter={(v) => formatCurrency(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="equity" stroke="#667eea" strokeWidth={2} name="Equity" />
                      <Line type="monotone" dataKey="portfolio_value" stroke="#10b981" strokeWidth={2} name="Portfolio" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="card">
                <div className="card-title">
                  <TrendingUp size={20} style={{ display: 'inline', marginRight: '8px' }} />
                  Open Positions ({positions.length})
                </div>
                {positions.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Qty</th>
                          <th>Avg Price</th>
                          <th>Current</th>
                          <th>Value</th>
                          <th>P&L</th>
                          <th>P&L %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((pos, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 'bold' }}>{pos.symbol}</td>
                            <td>{pos.qty}</td>
                            <td>{formatCurrency(pos.avg_entry_price)}</td>
                            <td>{formatCurrency(pos.current_price)}</td>
                            <td>{formatCurrency(pos.market_value)}</td>
                            <td className={pos.unrealized_pl >= 0 ? 'stat-positive' : 'stat-negative'}>
                              {formatCurrency(pos.unrealized_pl)}
                            </td>
                            <td className={pos.unrealized_plpc >= 0 ? 'stat-positive' : 'stat-negative'}>
                              {formatPercent(pos.unrealized_plpc)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">No open positions</div>
                )}
              </div>
            </>
          )}

          {activeTab === 'trading' && (
            <div className="grid grid-2">
              <div className="card">
                <div className="card-title">
                  <Activity size={20} style={{ display: 'inline', marginRight: '8px' }} />
                  Place Order
                </div>
                <div className="input-group">
                  <label>Symbol</label>
                  <input type="text" name="symbol" value={orderForm.symbol} onChange={handleOrderFormChange} placeholder="AAPL" style={{ textTransform: 'uppercase' }} />
                </div>
                <button className="btn btn-primary" onClick={handleGetQuote} style={{ width: '100%', marginBottom: '16px' }}>Get Quote</button>
                {quote && (
                  <div className="quote-display">
                    <div className="quote-symbol">{quote.symbol}</div>
                    <div className="quote-prices">
                      <div className="quote-bid-ask">Bid: {formatCurrency(quote.bid)} × {quote.bid_size}</div>
                      <div className="quote-bid-ask">Ask: {formatCurrency(quote.ask)} × {quote.ask_size}</div>
                    </div>
                  </div>
                )}
                <div className="input-group">
                  <label>Order Type</label>
                  <select name="orderType" value={orderForm.orderType} onChange={handleOrderFormChange}>
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                  </select>
                </div>
                {orderForm.orderType === 'limit' && (
                  <div className="input-group">
                    <label>Limit Price</label>
                    <input type="number" name="limitPrice" value={orderForm.limitPrice} onChange={handleOrderFormChange} placeholder="0.00" step="0.01" />
                  </div>
                )}
                <div className="input-group">
                  <label>Quantity</label>
                  <input type="number" name="qty" value={orderForm.qty} onChange={handleOrderFormChange} min="1" />
                </div>
                <div className="input-group">
                  <label>Side</label>
                  <select name="side" value={orderForm.side} onChange={handleOrderFormChange}>
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>
                <button className={`btn ${orderForm.side === 'buy' ? 'btn-success' : 'btn-danger'}`} onClick={handlePlaceOrder} style={{ width: '100%' }}>
                  {orderForm.side === 'buy' ? 'Buy' : 'Sell'} {orderForm.symbol.toUpperCase() || 'Stock'}
                </button>
              </div>

              <div className="card">
                <div className="card-title">Open Orders ({orders.length})</div>
                {orders.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Status</th><th>Created</th></tr></thead>
                      <tbody>
                        {orders.map((order, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 'bold' }}>{order.symbol}</td>
                            <td className={order.side === 'buy' ? 'stat-positive' : 'stat-negative'}>{order.side.toUpperCase()}</td>
                            <td>{order.type}</td>
                            <td>{order.qty}</td>
                            <td>{order.status}</td>
                            <td>{formatDate(order.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">No open orders</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bot' && (
            <>
              <div className="grid grid-2">
                <div className="card">
                  <div className="card-title">
                    <Bot size={20} style={{ display: 'inline', marginRight: '8px' }} />
                    Bot Controls
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Current Status</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: botStatus.running ? '#10b981' : '#64748b', marginBottom: '16px' }}>
                      {botStatus.running ? '🟢 Running' : '⚪ Stopped'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <button
                      className="btn btn-success"
                      onClick={handleStartBot}
                      disabled={botStatus.running}
                      style={{ flex: 1, opacity: botStatus.running ? 0.5 : 1 }}
                    >
                      ▶️ Start Bot
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleStopBot}
                      disabled={!botStatus.running}
                      style={{ flex: 1, opacity: !botStatus.running ? 0.5 : 1 }}
                    >
                      ⏸️ Stop Bot
                    </button>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #475569' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Quick Info</div>
                    <div style={{ fontSize: '14px' }}>
                      • Strategy: <span style={{ color: '#667eea', textTransform: 'capitalize' }}>{botStatus.strategy}</span><br/>
                      • Check interval: 60 seconds<br/>
                      • Auto stop loss: -2%<br/>
                      • Auto take profit: +5%
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <Target size={20} style={{ display: 'inline', marginRight: '8px' }} />
                    Strategy Settings
                  </div>
                  
                  <div className="input-group">
                    <label>Select Strategy</label>
                    <select
                      value={botStatus.strategy}
                      onChange={(e) => handleChangeStrategy(e.target.value)}
                      disabled={botStatus.running}
                      style={{ opacity: botStatus.running ? 0.5 : 1 }}
                    >
                      <option value="momentum">Momentum - Ride trends with volume</option>
                      <option value="mean_reversion">Mean Reversion - Buy dips, sell rallies</option>
                      <option value="rsi">RSI - Oversold/overbought signals</option>
                      <option value="ma_crossover">MA Crossover - Golden/death crosses</option>
                    </select>
                  </div>

                  {botStatus.running && (
                    <div style={{ padding: '8px 12px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '6px', fontSize: '12px', marginTop: '12px' }}>
                      ⚠️ Stop the bot to change strategy
                    </div>
                  )}

                  <div className="stat-grid" style={{ marginTop: '16px' }}>
                    <div className="stat-item">
                      <div className="stat-label">Active Strategy</div>
                      <div className="stat-value" style={{ fontSize: '18px', textTransform: 'capitalize' }}>{botStatus.strategy}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Win Rate</div>
                      <div className="stat-value" style={{ fontSize: '18px' }}>{botStatus.win_rate.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Recent Trades ({trades.length})</div>
                {trades.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Type</th><th>Status</th></tr></thead>
                      <tbody>
                        {trades.slice(0, 20).map((trade, idx) => (
                          <tr key={idx}>
                            <td>{formatDate(trade.created_at)}</td>
                            <td style={{ fontWeight: 'bold' }}>{trade.symbol}</td>
                            <td className={trade.side === 'buy' ? 'stat-positive' : 'stat-negative'}>{trade.side.toUpperCase()}</td>
                            <td>{trade.qty}</td>
                            <td>{trade.price > 0 ? formatCurrency(trade.price) : 'Market'}</td>
                            <td>{trade.order_type}</td>
                            <td>{trade.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">No trades yet</div>
                )}
              </div>
            </>
          )}

          {/* NEW RESEARCH TAB */}
          {activeTab === 'research' && (
            <ResearchDashboard />
          )}

          {activeTab === 'intelligence' && (
            <>
              <div className="card">
                <div className="card-title">
                  🧠 AI-Powered Market Intelligence
                </div>
                <p style={{ color: '#94a3b8', marginBottom: '16px' }}>
                  Top 5 buying opportunities based on market sentiment, news analysis, and technical indicators
                </p>
                
                <button
                  className="btn btn-primary"
                  onClick={fetchRecommendations}
                  disabled={loadingIntelligence}
                  style={{ marginBottom: '24px' }}
                >
                  {loadingIntelligence ? '🔍 Analyzing Markets...' : '🚀 Get Recommendations'}
                </button>

                {loadingIntelligence && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                    <div>AI is analyzing market data from multiple sources...</div>
                    <div style={{ fontSize: '14px', marginTop: '8px' }}>This may take 10-20 seconds</div>
                  </div>
                )}

                {!loadingIntelligence && recommendations.length > 0 && (
                  <div>
                    {recommendations.map((rec, idx) => (
                      <div key={idx} style={{
                        padding: '20px',
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        border: '2px solid #334155',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                              #{idx + 1} {rec.symbol}
                            </span>
                            <span style={{ marginLeft: '12px', fontSize: '14px', color: '#94a3b8' }}>
                              {rec.company}
                            </span>
                          </div>
                          <div style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: rec.rating === 'Strong Buy' ? '#10b981' : rec.rating === 'Buy' ? '#3b82f6' : '#64748b',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}>
                            {rec.rating}
                          </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
                            {rec.reason}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ padding: '8px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Target Price</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{rec.target_price}</div>
                          </div>
                          <div style={{ padding: '8px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Upside Potential</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{rec.upside}</div>
                          </div>
                          <div style={{ padding: '8px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Confidence</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea' }}>{rec.confidence}</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: '#64748b', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                          Sources: {rec.sources}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loadingIntelligence && recommendations.length === 0 && (
                  <div className="empty-state">
                    Click "Get Recommendations" to analyze current market opportunities
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-title">⚠️ Disclaimer</div>
                <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6' }}>
                  These recommendations are generated by AI analyzing market data, news sentiment, and technical indicators.
                  They are <strong>NOT</strong> financial advice. Always do your own research and consult with a financial
                  advisor before making investment decisions. Past performance does not guarantee future results.
                </div>
              </div>
            </>
          )}

          {activeTab === 'analytics' && (
            <>
              <div className="grid grid-2">
                <div className="card">
                  <div className="card-title">Position Distribution</div>
                  {positions.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[{ name: 'Winning', value: winningPositions }, { name: 'Losing', value: losingPositions }]}
                          cx="50%" cy="50%" labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80} fill="#8884d8" dataKey="value"
                        >
                          {[{ name: 'Winning', value: winningPositions }, { name: 'Losing', value: losingPositions }].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state">No positions to analyze</div>
                  )}
                </div>

                <div className="card">
                  <div className="card-title">Performance Metrics</div>
                  <div className="stat-grid">
                    <div className="stat-item">
                      <div className="stat-label">Total P&L</div>
                      <div className={`stat-value ${totalPnL >= 0 ? 'stat-positive' : 'stat-negative'}`}>{formatCurrency(totalPnL)}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Open Positions</div>
                      <div className="stat-value">{positions.length}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Total Trades</div>
                      <div className="stat-value">{trades.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Trades by Symbol</div>
                {trades.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(trades.reduce((acc, trade) => {
                      acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
                      return acc;
                    }, {})).map(([symbol, count]) => ({ symbol, count }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="symbol" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Bar dataKey="count" fill="#667eea" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">No trade data yet</div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
