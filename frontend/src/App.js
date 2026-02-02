import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, DollarSign, Activity, AlertCircle, Bot, BarChart3, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import './index.css';

// ==================== BLADE RUNNER COLOR THEME ====================
const THEME = {
  // Backgrounds
  bgPrimary: '#1A1412',      // Deep charcoal with warm undertone
  bgCard: '#261D1A',         // Smoky dark brown
  bgCardHover: '#332622',    // Slightly lighter on hover
  bgInput: '#1F1714',        // Dark input background
  
  // Primary colors
  primary: '#E85D04',        // Burnt orange (main accent)
  primaryGlow: '#FF6B0A',    // Brighter orange for glows
  secondary: '#DC2626',      // Crimson red
  accent: '#F59E0B',         // Amber/gold
  
  // Text colors
  textPrimary: '#F5E6D3',    // Warm off-white
  textSecondary: '#9A8478',  // Dusty rose-gray
  textMuted: '#6B5B54',      // Muted brown-gray
  
  // Borders
  border: '#3D2E28',         // Warm dark border
  borderLight: '#4A3830',    // Lighter border
  
  // Status colors
  success: '#22C55E',        // Green (keep for positive)
  danger: '#EF4444',         // Red (keep for negative)
  warning: '#F59E0B',        // Amber
  
  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #E85D04 0%, #DC2626 100%)',
  gradientCard: 'linear-gradient(180deg, #261D1A 0%, #1A1412 100%)',
};

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
    { id: 'all', label: 'All', icon: '📊', color: THEME.primary },
    { id: 'politics', label: 'Politics', icon: '🏛️', color: '#DC2626' },
    { id: 'sports', label: 'Sports', icon: '⚽', color: '#22C55E' },
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
        setTimeout(() => setLastCollection(null), 5000);
      }
    } catch (err) {
      console.error('Collection failed:', err);
    } finally {
      setIsCollecting(false);
    }
  };

  const getSentimentColor = (score) => {
    if (score > 0.2) return THEME.success;
    if (score < -0.2) return THEME.danger;
    return THEME.textSecondary;
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
          <h2 style={{ 
            margin: 0, 
            fontSize: '24px', 
            background: THEME.gradientPrimary, 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            textShadow: `0 0 40px ${THEME.primary}40`
          }}>
            🔬 Deep Research for Polymarket
          </h2>
          <p style={{ color: THEME.textSecondary, margin: '4px 0 0 0', fontSize: '14px' }}>AI-powered market intelligence from Reddit, News & Prediction Markets</p>
        </div>
        <button 
          onClick={runCollection}
          disabled={isCollecting}
          style={{ 
            opacity: isCollecting ? 0.7 : 1, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: THEME.gradientPrimary,
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: `0 0 20px ${THEME.primary}40`,
            transition: 'all 0.3s ease'
          }}
        >
          {isCollecting ? '⏳ Collecting...' : '🔄 Run Collection'}
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { value: stats.total_items || 0, label: 'Research Items', color: THEME.primary },
            { value: stats.active_signals || 0, label: 'Active Signals', color: THEME.success },
            { value: stats.sources_count || 0, label: 'Sources', color: THEME.accent },
            { value: stats.last_collection ? formatTimeAgo(stats.last_collection) : 'Never', label: 'Last Update', color: THEME.secondary },
          ].map((stat, idx) => (
            <div key={idx} style={{ 
              padding: '16px', 
              backgroundColor: THEME.bgCard, 
              borderRadius: '12px',
              border: `1px solid ${THEME.border}`,
              boxShadow: `0 0 20px ${THEME.primary}10`
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: THEME.textSecondary }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Category Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              backgroundColor: selectedCategory === cat.id ? cat.color : 'transparent',
              border: `2px solid ${cat.color}`,
              color: selectedCategory === cat.id ? '#fff' : cat.color,
              padding: '8px 16px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: '500',
              boxShadow: selectedCategory === cat.id ? `0 0 15px ${cat.color}50` : 'none'
            }}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: `1px solid ${THEME.border}`, marginBottom: '24px' }}>
        {[
          { id: 'signals', label: '📈 Trading Signals' },
          { id: 'feed', label: '📰 Research Feed' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveResearchTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeResearchTab === tab.id ? `3px solid ${THEME.primary}` : '3px solid transparent',
              color: activeResearchTab === tab.id ? THEME.primary : THEME.textSecondary,
              padding: '12px 0',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: THEME.textSecondary }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Loading research data...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px', color: THEME.danger }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <p>{error}</p>
          <button onClick={fetchData} style={{ 
            marginTop: '16px', 
            background: THEME.gradientPrimary,
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer'
          }}>Retry</button>
        </div>
      ) : activeResearchTab === 'signals' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {signals.length === 0 ? (
            <div style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '60px',
              backgroundColor: THEME.bgCard,
              borderRadius: '16px',
              border: `1px solid ${THEME.border}`
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
              <h3 style={{ color: THEME.textPrimary }}>No Signals Yet</h3>
              <p style={{ color: THEME.textSecondary }}>Run a collection to generate trading signals based on market research.</p>
              <button onClick={runCollection} style={{ 
                marginTop: '16px',
                background: THEME.gradientPrimary,
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: `0 0 20px ${THEME.primary}40`
              }}>Run Collection</button>
            </div>
          ) : (
            signals
              .filter(s => selectedCategory === 'all' || s.category === selectedCategory)
              .map((signal, idx) => (
                <div key={idx} style={{ 
                  padding: '20px',
                  backgroundColor: THEME.bgCard,
                  borderRadius: '16px',
                  border: `1px solid ${THEME.border}`,
                  boxShadow: `0 4px 20px ${THEME.primary}10`,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: THEME.textSecondary, textTransform: 'uppercase' }}>
                      {categories.find(c => c.id === signal.category)?.icon} {signal.category}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#fff',
                      backgroundColor: signal.side === 'YES' ? THEME.success : THEME.danger,
                      boxShadow: `0 0 10px ${signal.side === 'YES' ? THEME.success : THEME.danger}50`
                    }}>
                      {signal.side}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', color: THEME.textPrimary }}>
                    {signal.market_question}
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <div style={{ fontSize: '11px', color: THEME.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Confidence</div>
                      <div style={{ height: '6px', backgroundColor: THEME.bgPrimary, borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{
                          height: '100%',
                          width: getConfidenceWidth(signal.confidence),
                          background: signal.confidence > 0.7 ? THEME.success : signal.confidence > 0.5 ? THEME.accent : THEME.danger,
                          borderRadius: '3px',
                          boxShadow: `0 0 10px ${signal.confidence > 0.7 ? THEME.success : signal.confidence > 0.5 ? THEME.accent : THEME.danger}50`
                        }}></div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: THEME.textPrimary }}>{(signal.confidence * 100).toFixed(0)}%</span>
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <div style={{ fontSize: '11px', color: THEME.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Sentiment</div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: getSentimentColor(signal.sentiment_score) }}>
                        {signal.sentiment_score > 0 ? '↑' : signal.sentiment_score < 0 ? '↓' : '→'}
                        {' '}{(signal.sentiment_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <div style={{ fontSize: '11px', color: THEME.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Sources</div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: THEME.textPrimary }}>{signal.sources_count}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: THEME.textSecondary, lineHeight: '1.5', marginBottom: '16px' }}>
                    {signal.reasoning}
                  </p>

                  {signal.datapoints && signal.datapoints.length > 0 && (
                    <div style={{ backgroundColor: THEME.bgPrimary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '11px', color: THEME.textMuted, textTransform: 'uppercase', margin: '0 0 8px 0' }}>Key Datapoints</h4>
                      {signal.datapoints.slice(0, 3).map((dp, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ color: THEME.primary, fontWeight: '500', whiteSpace: 'nowrap' }}>{dp.source}</span>
                          <span style={{ color: THEME.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dp.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: '12px', marginTop: '12px' }}>
                    <span style={{ fontSize: '11px', color: THEME.textMuted }}>Generated {formatTimeAgo(signal.generated_at)}</span>
                  </div>
                </div>
              ))
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px',
              backgroundColor: THEME.bgCard,
              borderRadius: '16px',
              border: `1px solid ${THEME.border}`
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📰</div>
              <h3 style={{ color: THEME.textPrimary }}>No Research Items</h3>
              <p style={{ color: THEME.textSecondary }}>Run a collection to gather research from Reddit, news, and prediction markets.</p>
              <button onClick={runCollection} style={{ 
                marginTop: '16px',
                background: THEME.gradientPrimary,
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer'
              }}>Run Collection</button>
            </div>
          ) : (
            items.slice(0, 50).map((item, idx) => (
              <div key={idx} style={{ 
                padding: '16px',
                backgroundColor: THEME.bgCard,
                borderRadius: '12px',
                border: `1px solid ${THEME.border}`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: THEME.primary }}>{item.source_name}</span>
                  <span style={{ fontSize: '11px', color: THEME.textMuted }}>{formatTimeAgo(item.timestamp)}</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0', color: THEME.textPrimary }}>{item.title}</h4>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                  <span style={{ fontWeight: '500', color: getSentimentColor(item.sentiment) }}>
                    {item.sentiment > 0 ? '🟢 Bullish' : item.sentiment < 0 ? '🔴 Bearish' : '⚪ Neutral'}
                  </span>
                  <span style={{ color: THEME.textMuted }}>⬆️ {item.upvotes || 0} · 💬 {item.comments || 0}</span>
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ 
                    display: 'inline-block', 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    color: THEME.primary, 
                    textDecoration: 'none' 
                  }}>
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
          background: THEME.gradientPrimary,
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          boxShadow: `0 4px 30px ${THEME.primary}60`,
          animation: 'fadeIn 0.3s ease'
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
  
  const [orderForm, setOrderForm] = useState({
    symbol: 'AAPL',
    qty: '1',
    side: 'buy',
    orderType: 'market',
    limitPrice: ''
  });

  const [botStatus, setBotStatus] = useState({
    running: false,
    strategy: 'momentum',
    daily_pnl: 0,
    trades_today: 0,
    win_rate: 0
  });

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
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/health');
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
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/account');
      if (response.ok) setAccount(await response.json());
    } catch (err) {}
  };

  const fetchPositions = async () => {
    try {
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/positions');
      if (response.ok) setPositions(await response.json());
    } catch (err) {}
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/orders?status=open');
      if (response.ok) setOrders(await response.json());
    } catch (err) {}
  };

  const fetchTrades = async () => {
    try {
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/trades?limit=50');
      if (response.ok) {
        const data = await response.json();
        setTrades(data);
        calculateBotStats(data);
      }
    } catch (err) {}
  };

  const fetchAccountHistory = async () => {
    try {
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/account/history?limit=50');
      if (response.ok) {
        const data = await response.json();
        setAccountHistory(data.reverse());
      }
    } catch (err) {}
  };

  const fetchBotStatus = async () => {
    try {
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/bot/status');
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
        const response = await fetch(`https://plutus-trade-backend.onrender.com/api/quote/${orderForm.symbol.toUpperCase()}`);
        if (response.ok) setQuote(await response.json());
      } catch (err) {}
    }
  };

  const handlePlaceOrder = async () => {
    if (!orderForm.symbol || !orderForm.qty) {
      alert('Please enter symbol and quantity');
      return;
    }

    const endpoint = orderForm.orderType === 'market' ? 'https://plutus-trade-backend.onrender.com/api/orders/market' : 'https://plutus-trade-backend.onrender.com/api/orders/limit';
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
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/bot/start', { method: 'POST' });
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
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/bot/stop', { method: 'POST' });
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
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/bot/config', {
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
      const response = await fetch('https://plutus-trade-backend.onrender.com/api/intelligence/recommendations');
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
  const COLORS = [THEME.success, THEME.danger, THEME.textMuted];

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: THEME.bgPrimary, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: THEME.textPrimary
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <div>Loading Plutus Trade...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: THEME.bgPrimary, 
      color: THEME.textPrimary,
      padding: '24px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '32px',
            background: THEME.gradientPrimary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: `0 0 60px ${THEME.primary}50`
          }}>
            ⚡ Plutus Trade
          </h1>
          <p style={{ color: THEME.textSecondary, marginBottom: '12px' }}>Automated Paper Trading Platform</p>
          <span style={{
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: connected ? `${THEME.success}20` : `${THEME.danger}20`,
            color: connected ? THEME.success : THEME.danger,
            border: `1px solid ${connected ? THEME.success : THEME.danger}40`
          }}>
            {connected ? '● Connected' : '● Disconnected'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: THEME.textSecondary }}>Bot Status</div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: botStatus.running ? THEME.success : THEME.textMuted 
          }}>
            {botStatus.running ? '🟢 Running' : '⚪ Stopped'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: `${THEME.danger}20`,
          border: `1px solid ${THEME.danger}40`,
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: THEME.danger
        }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {connected && account && (
        <>
          {/* Navigation Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '24px', 
            borderBottom: `2px solid ${THEME.border}`, 
            paddingBottom: '8px',
            flexWrap: 'wrap'
          }}>
            {['dashboard', 'trading', 'bot', 'research', 'intelligence', 'analytics'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? THEME.gradientPrimary : THEME.bgCard,
                  border: activeTab === tab ? 'none' : `1px solid ${THEME.border}`,
                  padding: '10px 18px',
                  borderRadius: '8px',
                  color: activeTab === tab ? '#fff' : THEME.textSecondary,
                  fontWeight: '600',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === tab ? `0 0 20px ${THEME.primary}40` : 'none'
                }}
              >
                {tab === 'intelligence' ? '🧠 Intelligence' : tab === 'research' ? '🔬 Research' : tab}
              </button>
            ))}
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: THEME.bgCard, 
                  borderRadius: '16px',
                  border: `1px solid ${THEME.border}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: THEME.primary }}>
                    <DollarSign size={20} />
                    <span style={{ fontWeight: '600' }}>Account Balance</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Equity</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.textPrimary }}>{formatCurrency(account.equity)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Cash</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.textPrimary }}>{formatCurrency(account.cash)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Buying Power</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.textPrimary }}>{formatCurrency(account.buying_power)}</div>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  padding: '20px', 
                  backgroundColor: THEME.bgCard, 
                  borderRadius: '16px',
                  border: `1px solid ${THEME.border}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: THEME.primary }}>
                    <Bot size={20} />
                    <span style={{ fontWeight: '600' }}>Bot Performance Today</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Strategy</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: THEME.accent, textTransform: 'capitalize' }}>{botStatus.strategy}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Daily P&L</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: botStatus.daily_pnl >= 0 ? THEME.success : THEME.danger }}>
                        {formatCurrency(botStatus.daily_pnl)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Trades Today</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: THEME.textPrimary }}>{botStatus.trades_today}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              {accountHistory.length > 0 && (
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: THEME.bgCard, 
                  borderRadius: '16px',
                  border: `1px solid ${THEME.border}`,
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: THEME.primary }}>
                    <BarChart3 size={20} />
                    <span style={{ fontWeight: '600' }}>Account Equity Over Time</span>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={accountHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
                      <XAxis dataKey="timestamp" stroke={THEME.textMuted} tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                      <YAxis stroke={THEME.textMuted} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: THEME.bgCard, border: `1px solid ${THEME.border}`, borderRadius: '8px' }} 
                        labelFormatter={(v) => new Date(v).toLocaleString()} 
                        formatter={(v) => formatCurrency(v)} 
                      />
                      <Legend />
                      <Line type="monotone" dataKey="equity" stroke={THEME.primary} strokeWidth={2} name="Equity" dot={false} />
                      <Line type="monotone" dataKey="portfolio_value" stroke={THEME.success} strokeWidth={2} name="Portfolio" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Positions Table */}
              <div style={{ 
                padding: '20px', 
                backgroundColor: THEME.bgCard, 
                borderRadius: '16px',
                border: `1px solid ${THEME.border}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: THEME.primary }}>
                  <TrendingUp size={20} />
                  <span style={{ fontWeight: '600' }}>Open Positions ({positions.length})</span>
                </div>
                {positions.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                          {['Symbol', 'Qty', 'Avg Price', 'Current', 'Value', 'P&L', 'P&L %'].map(h => (
                            <th key={h} style={{ padding: '12px 8px', textAlign: 'left', color: THEME.textMuted, fontSize: '12px', fontWeight: '600' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((pos, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${THEME.border}20` }}>
                            <td style={{ padding: '12px 8px', fontWeight: 'bold', color: THEME.primary }}>{pos.symbol}</td>
                            <td style={{ padding: '12px 8px' }}>{pos.qty}</td>
                            <td style={{ padding: '12px 8px' }}>{formatCurrency(pos.avg_entry_price)}</td>
                            <td style={{ padding: '12px 8px' }}>{formatCurrency(pos.current_price)}</td>
                            <td style={{ padding: '12px 8px' }}>{formatCurrency(pos.market_value)}</td>
                            <td style={{ padding: '12px 8px', color: pos.unrealized_pl >= 0 ? THEME.success : THEME.danger, fontWeight: '600' }}>
                              {formatCurrency(pos.unrealized_pl)}
                            </td>
                            <td style={{ padding: '12px 8px', color: pos.unrealized_plpc >= 0 ? THEME.success : THEME.danger, fontWeight: '600' }}>
                              {formatPercent(pos.unrealized_plpc)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: THEME.textMuted }}>No open positions</div>
                )}
              </div>
            </>
          )}

          {/* Trading Tab */}
          {activeTab === 'trading' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
              <div style={{ 
                padding: '20px', 
                backgroundColor: THEME.bgCard, 
                borderRadius: '16px',
                border: `1px solid ${THEME.border}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: THEME.primary }}>
                  <Activity size={20} />
                  <span style={{ fontWeight: '600' }}>Place Order</span>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: THEME.textMuted, marginBottom: '4px' }}>Symbol</label>
                  <input 
                    type="text" 
                    name="symbol" 
                    value={orderForm.symbol} 
                    onChange={handleOrderFormChange}
                    placeholder="AAPL"
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: THEME.bgInput,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: '8px',
                      color: THEME.textPrimary,
                      fontSize: '14px',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>

                <button 
                  onClick={handleGetQuote}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '16px',
                    background: THEME.gradientPrimary,
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Get Quote
                </button>

                {quote && (
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: THEME.bgPrimary, 
                    borderRadius: '8px', 
                    marginBottom: '16px',
                    border: `1px solid ${THEME.primary}40`
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: THEME.primary, marginBottom: '8px' }}>{quote.symbol}</div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                      <span style={{ color: THEME.success }}>Bid: {formatCurrency(quote.bid)} × {quote.bid_size}</span>
                      <span style={{ color: THEME.danger }}>Ask: {formatCurrency(quote.ask)} × {quote.ask_size}</span>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: THEME.textMuted, marginBottom: '4px' }}>Order Type</label>
                  <select 
                    name="orderType" 
                    value={orderForm.orderType} 
                    onChange={handleOrderFormChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: THEME.bgInput,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: '8px',
                      color: THEME.textPrimary,
                      fontSize: '14px'
                    }}
                  >
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                  </select>
                </div>

                {orderForm.orderType === 'limit' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: THEME.textMuted, marginBottom: '4px' }}>Limit Price</label>
                    <input 
                      type="number" 
                      name="limitPrice" 
                      value={orderForm.limitPrice} 
                      onChange={handleOrderFormChange}
                      placeholder="0.00"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: THEME.bgInput,
                        border: `1px solid ${THEME.border}`,
                        borderRadius: '8px',
                        color: THEME.textPrimary,
                        fontSize: '14px'
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: THEME.textMuted, marginBottom: '4px' }}>Quantity</label>
                  <input 
                    type="number" 
                    name="qty" 
                    value={orderForm.qty} 
                    onChange={handleOrderFormChange}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: THEME.bgInput,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: '8px',
                      color: THEME.textPrimary,
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: THEME.textMuted, marginBottom: '4px' }}>Side</label>
                  <select 
                    name="side" 
                    value={orderForm.side} 
                    onChange={handleOrderFormChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: THEME.bgInput,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: '8px',
                      color: THEME.textPrimary,
                      fontSize: '14px'
                    }}
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>

                <button 
                  onClick={handlePlaceOrder}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: orderForm.side === 'buy' ? THEME.success : THEME.danger,
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '16px',
                    cursor: 'pointer',
                    boxShadow: `0 0 20px ${orderForm.side === 'buy' ? THEME.success : THEME.danger}40`
                  }}
                >
                  {orderForm.side === 'buy' ? 'Buy' : 'Sell'} {orderForm.symbol.toUpperCase() || 'Stock'}
                </button>
              </div>

              <div style={{ 
                padding: '20px', 
                backgroundColor: THEME.bgCard, 
                borderRadius: '16px',
                border: `1px solid ${THEME.border}`
              }}>
                <div style={{ fontWeight: '600', color: THEME.primary, marginBottom: '16px' }}>Open Orders ({orders.length})</div>
                {orders.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                          {['Symbol', 'Side', 'Type', 'Qty', 'Status', 'Created'].map(h => (
                            <th key={h} style={{ padding: '12px 8px', textAlign: 'left', color: THEME.textMuted, fontSize: '12px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${THEME.border}20` }}>
                            <td style={{ padding: '12px 8px', fontWeight: 'bold', color: THEME.primary }}>{order.symbol}</td>
                            <td style={{ padding: '12px 8px', color: order.side === 'buy' ? THEME.success : THEME.danger, fontWeight: '600' }}>{order.side.toUpperCase()}</td>
                            <td style={{ padding: '12px 8px' }}>{order.type}</td>
                            <td style={{ padding: '12px 8px' }}>{order.qty}</td>
                            <td style={{ padding: '12px 8px' }}>{order.status}</td>
                            <td style={{ padding: '12px 8px', fontSize: '12px', color: THEME.textMuted }}>{formatDate(order.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: THEME.textMuted }}>No open orders</div>
                )}
              </div>
            </div>
          )}

          {/* Bot Tab */}
          {activeTab === 'bot' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: THEME.bgCard, 
                  borderRadius: '16px',
                  border: `1px solid ${THEME.border}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: THEME.primary }}>
                    <Bot size={20} />
                    <span style={{ fontWeight: '600' }}>Bot Controls</span>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', color: THEME.textMuted, marginBottom: '8px' }}>Current Status</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: botStatus.running ? THEME.success : THEME.textMuted, marginBottom: '16px' }}>
                      {botStatus.running ? '🟢 Running' : '⚪ Stopped'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <button
                      onClick={handleStartBot}
                      disabled={botStatus.running}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: THEME.success,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: botStatus.running ? 'not-allowed' : 'pointer',
                        opacity: botStatus.running ? 0.5 : 1
                      }}
                    >
                      ▶️ Start Bot
                    </button>
                    <button
                      onClick={handleStopBot}
                      disabled={!botStatus.running}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: THEME.danger,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: !botStatus.running ? 'not-allowed' : 'pointer',
                        opacity: !botStatus.running ? 0.5 : 1
                      }}
                    >
                      ⏸️ Stop Bot
                    </button>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: THEME.bgPrimary, borderRadius: '8px', border: `1px solid ${THEME.border}` }}>
                    <div style={{ fontSize: '12px', color: THEME.textMuted, marginBottom: '4px' }}>Quick Info</div>
                    <div style={{ fontSize: '14px', color: THEME.textSecondary, lineHeight: '1.6' }}>
                      • Strategy: <span style={{ color: THEME.accent, textTransform: 'capitalize' }}>{botStatus.strategy}</span><br/>
                      • Check interval: 60 seconds<br/>
                      • Auto stop loss: -2%<br/>
                      • Auto take profit: +5%
                    </div>
                  </div>
                </div>

                <div style={{ 
                  padding: '20px', 
                  backgroundColor: THEME.bgCard, 
                  borderRadius: '16px',
                  border: `1px solid ${THEME.border}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: THEME.primary }}>
                    <Target size={20} />
                    <span style={{ fontWeight: '600' }}>Strategy Settings</span>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: THEME.textMuted, marginBottom: '4px' }}>Select Strategy</label>
                    <select
                      value={botStatus.strategy}
                      onChange={(e) => handleChangeStrategy(e.target.value)}
                      disabled={botStatus.running}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: THEME.bgInput,
                        border: `1px solid ${THEME.border}`,
                        borderRadius: '8px',
                        color: THEME.textPrimary,
                        fontSize: '14px',
                        opacity: botStatus.running ? 0.5 : 1
                      }}
                    >
                      <option value="momentum">Momentum - Ride trends with volume</option>
                      <option value="mean_reversion">Mean Reversion - Buy dips, sell rallies</option>
                      <option value="rsi">RSI - Oversold/overbought signals</option>
                      <option value="ma_crossover">MA Crossover - Golden/death crosses</option>
                    </select>
                  </div>

                  {botStatus.running && (
                    <div style={{ padding: '8px 12px', backgroundColor: `${THEME.warning}20`, color: THEME.warning, borderRadius: '6px', fontSize: '12px', marginBottom: '16px' }}>
                      ⚠️ Stop the bot to change strategy
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Active Strategy</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: THEME.textPrimary, textTransform: 'capitalize' }}>{botStatus.strategy}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Win Rate</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: THEME.textPrimary }}>{botStatus.win_rate.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Trades */}
              <div style={{ 
                padding: '20px', 
                backgroundColor: THEME.bgCard, 
                borderRadius: '16px',
                border: `1px solid ${THEME.border}`
              }}>
                <div style={{ fontWeight: '600', color: THEME.primary, marginBottom: '16px' }}>Recent Trades ({trades.length})</div>
                {trades.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                          {['Time', 'Symbol', 'Side', 'Qty', 'Price', 'Type', 'Status'].map(h => (
                            <th key={h} style={{ padding: '12px 8px', textAlign: 'left', color: THEME.textMuted, fontSize: '12px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trades.slice(0, 20).map((trade, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${THEME.border}20` }}>
                            <td style={{ padding: '12px 8px', fontSize: '12px', color: THEME.textMuted }}>{formatDate(trade.created_at)}</td>
                            <td style={{ padding: '12px 8px', fontWeight: 'bold', color: THEME.primary }}>{trade.symbol}</td>
                            <td style={{ padding: '12px 8px', color: trade.side === 'buy' ? THEME.success : THEME.danger, fontWeight: '600' }}>{trade.side.toUpperCase()}</td>
                            <td style={{ padding: '12px 8px' }}>{trade.qty}</td>
                            <td style={{ padding: '12px 8px' }}>{trade.price > 0 ? formatCurrency(trade.price) : 'Market'}</td>
                            <td style={{ padding: '12px 8px' }}>{trade.order_type}</td>
                            <td style={{ padding: '12px 8px' }}>{trade.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: THEME.textMuted }}>No trades yet</div>
                )}
              </div>
            </>
          )}

          {/* Research Tab */}
          {activeTab === 'research' && (
            <ResearchDashboard />
          )}

          {/* Intelligence Tab */}
          {activeTab === 'intelligence' && (
            <>
              <div style={{ 
                padding: '20px', 
                backgroundColor: THEME.bgCard, 
                borderRadius: '16px',
                border: `1px solid ${THEME.border}`,
                marginBottom: '24px'
              }}>
                <div style={{ fontWeight: '600', color: THEME.primary, marginBottom: '8px', fontSize: '20px' }}>
                  🧠 AI-Powered Market Intelligence
                </div>
                <p style={{ color: THEME.textSecondary, marginBottom: '16px' }}>
                  Top buying opportunities based on market sentiment, news analysis, and technical indicators
                </p>
                
                <button
                  onClick={fetchRecommendations}
                  disabled={loadingIntelligence}
                  style={{
                    padding: '12px 24px',
                    background: THEME.gradientPrimary,
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: loadingIntelligence ? 'not-allowed' : 'pointer',
                    opacity: loadingIntelligence ? 0.7 : 1,
                    boxShadow: `0 0 20px ${THEME.primary}40`
                  }}
                >
                  {loadingIntelligence ? '🔍 Analyzing Markets...' : '🚀 Get Recommendations'}
                </button>

                {loadingIntelligence && (
                  <div style={{ textAlign: 'center', padding: '40px', color: THEME.textSecondary }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                    <div>AI is analyzing market data from multiple sources...</div>
                    <div style={{ fontSize: '14px', marginTop: '8px', color: THEME.textMuted }}>This may take 10-20 seconds</div>
                  </div>
                )}

                {!loadingIntelligence && recommendations.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    {recommendations.map((rec, idx) => (
                      <div key={idx} style={{
                        padding: '20px',
                        backgroundColor: THEME.bgPrimary,
                        borderRadius: '12px',
                        border: `1px solid ${THEME.border}`,
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: THEME.primary }}>
                              #{idx + 1} {rec.symbol}
                            </span>
                            <span style={{ marginLeft: '12px', fontSize: '14px', color: THEME.textSecondary }}>
                              {rec.company}
                            </span>
                          </div>
                          <div style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: rec.rating === 'Strong Buy' ? THEME.success : rec.rating === 'Buy' ? '#3b82f6' : THEME.textMuted,
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}>
                            {rec.rating}
                          </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '14px', color: THEME.textSecondary, lineHeight: '1.6' }}>
                            {rec.reason}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ padding: '8px', backgroundColor: THEME.bgCard, borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', color: THEME.textMuted }}>Target Price</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: THEME.success }}>{rec.target_price}</div>
                          </div>
                          <div style={{ padding: '8px', backgroundColor: THEME.bgCard, borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', color: THEME.textMuted }}>Upside Potential</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: THEME.success }}>{rec.upside}</div>
                          </div>
                          <div style={{ padding: '8px', backgroundColor: THEME.bgCard, borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', color: THEME.textMuted }}>Confidence</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: THEME.accent }}>{rec.confidence}</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: THEME.textMuted, borderTop: `1px solid ${THEME.border}`, paddingTop: '8px' }}>
                          Sources: {rec.sources}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loadingIntelligence && recommendations.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: THEME.textMuted }}>
                    Click "Get Recommendations" to analyze current market opportunities
                  </div>
                )}
              </div>

              <div style={{ 
                padding: '20px', 
                backgroundColor: THEME.bgCard, 
                borderRadius: '16px',
                border: `1px solid ${THEME.border}`
              }}>
                <div style={{ fontWeight: '600', color: THEME.warning, marginBottom: '8px' }}>⚠️ Disclaimer</div>
                <div style={{ fontSize: '14px', color: THEME.textSecondary, lineHeight: '1.6' }}>
                  These recommendations are generated by AI analyzing market data, news sentiment, and technical indicators.
                  They are <strong style={{ color: THEME.textPrimary }}>NOT</strong> financial advice. Always do your own research and consult with a financial
                  advisor before making investment decisions. Past performance does not guarantee future results.
                </div>
              </div>
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: THEME.bgCard, 
                  borderRadius: '16px',
                  border: `1px solid ${THEME.border}`
                }}>
                  <div style={{ fontWeight: '600', color: THEME.primary, marginBottom: '16px' }}>Position Distribution</div>
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
                        <Tooltip contentStyle={{ backgroundColor: THEME.bgCard, border: `1px solid ${THEME.border}`, borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: THEME.textMuted }}>No positions to analyze</div>
                  )}
                </div>

                <div style={{ 
                  padding: '20px', 
                  backgroundColor: THEME.bgCard, 
                  borderRadius: '16px',
                  border: `1px solid ${THEME.border}`
                }}>
                  <div style={{ fontWeight: '600', color: THEME.primary, marginBottom: '16px' }}>Performance Metrics</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Total P&L</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: totalPnL >= 0 ? THEME.success : THEME.danger }}>{formatCurrency(totalPnL)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Open Positions</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.textPrimary }}>{positions.length}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted }}>Total Trades</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.textPrimary }}>{trades.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: '20px', 
                backgroundColor: THEME.bgCard, 
                borderRadius: '16px',
                border: `1px solid ${THEME.border}`
              }}>
                <div style={{ fontWeight: '600', color: THEME.primary, marginBottom: '16px' }}>Trades by Symbol</div>
                {trades.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(trades.reduce((acc, trade) => {
                      acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
                      return acc;
                    }, {})).map(([symbol, count]) => ({ symbol, count }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
                      <XAxis dataKey="symbol" stroke={THEME.textMuted} />
                      <YAxis stroke={THEME.textMuted} />
                      <Tooltip contentStyle={{ backgroundColor: THEME.bgCard, border: `1px solid ${THEME.border}`, borderRadius: '8px' }} />
                      <Bar dataKey="count" fill={THEME.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: THEME.textMuted }}>No trade data yet</div>
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
