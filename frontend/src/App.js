import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle, 
  Bot, BarChart3, Target, Zap, Radio, Crosshair, Database,
  ChevronRight, Clock, Globe, Shield, Cpu, Eye, Layers,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Terminal,
  PieChart, LineChart as LineChartIcon, Settings, Bell, Search,
  Menu, X, ExternalLink, Wifi, WifiOff, Flame, MessageSquare, ArrowUp
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart as RechartsPie, Pie, Cell 
} from 'recharts';
import './index.css';

// ═══════════════════════════════════════════════════════════════════════════════
// PLUTUS TERMINAL - DESIGN SYSTEM
// A command center for those who move markets
// ═══════════════════════════════════════════════════════════════════════════════

const DESIGN = {
  // Color System - Cinematic & Purposeful
  colors: {
    // Backgrounds - Layered depth
    bg: {
      void: '#09090B',        // Deepest black - the abyss
      primary: '#0C0C0F',     // Main background
      elevated: '#131316',    // Cards, panels
      surface: '#1A1A1F',     // Interactive surfaces
      hover: '#222228',       // Hover states
    },
    
    // Brand - Ember & Fire
    brand: {
      primary: '#F97316',     // Vivid orange - primary actions
      secondary: '#EA580C',   // Deeper orange
      tertiary: '#C2410C',    // Dark orange
      glow: 'rgba(249, 115, 22, 0.15)',  // Orange glow
      ember: 'rgba(249, 115, 22, 0.08)', // Subtle ember
    },
    
    // Accent - Electric Cyan (for contrast)
    accent: {
      cyan: '#22D3EE',
      cyanMuted: '#0E7490',
      cyanGlow: 'rgba(34, 211, 238, 0.12)',
    },
    
    // Semantic
    semantic: {
      profit: '#10B981',      // Emerald green
      profitMuted: '#059669',
      profitBg: 'rgba(16, 185, 129, 0.08)',
      loss: '#EF4444',        // Clear red
      lossMuted: '#DC2626',
      lossBg: 'rgba(239, 68, 68, 0.08)',
      warning: '#FBBF24',     // Amber
      neutral: '#6B7280',
    },
    
    // Text Hierarchy
    text: {
      primary: '#FAFAFA',     // Almost white
      secondary: '#A1A1AA',   // Muted
      tertiary: '#71717A',    // Very muted
      disabled: '#52525B',    // Disabled
    },
    
    // Borders & Dividers
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.1)',
      strong: 'rgba(255, 255, 255, 0.15)',
      profit: 'rgba(16, 185, 129, 0.3)',
      loss: 'rgba(239, 68, 68, 0.3)',
    },
  },
  
  // Typography - Sharp & Technical
  typography: {
    fontFamily: {
      display: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      mono: "'JetBrains Mono', 'SF Mono', monospace",
    },
    size: {
      xs: '0.6875rem',    // 11px
      sm: '0.75rem',      // 12px
      base: '0.875rem',   // 14px
      lg: '1rem',         // 16px
      xl: '1.125rem',     // 18px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
    },
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.05em',
      wider: '0.1em',
    },
  },
  
  // Spacing Scale
  spacing: {
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
  },
  
  // Border Radius
  radius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  // Shadows & Glows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
    glow: {
      orange: '0 0 20px rgba(249, 115, 22, 0.3)',
      cyan: '0 0 20px rgba(34, 211, 238, 0.2)',
      profit: '0 0 15px rgba(16, 185, 129, 0.3)',
      loss: '0 0 15px rgba(239, 68, 68, 0.3)',
    },
  },
  
  // Transitions
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

// API Configuration
const API_BASE = 'https://plutus-trade-backend.onrender.com/api';
const RESEARCH_API = `${API_BASE}/research`;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Radar Scanner Animation Component
const RadarScanner = ({ size = 120, scanning = false }) => (
  <div style={{
    position: 'relative',
    width: size,
    height: size,
    margin: '0 auto',
  }}>
    {[1, 2, 3].map((ring) => (
      <div
        key={ring}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${(ring / 3) * 100}%`,
          height: `${(ring / 3) * 100}%`,
          borderRadius: '50%',
          border: `1px solid ${DESIGN.colors.brand.primary}${ring === 3 ? '40' : '20'}`,
        }}
      />
    ))}
    {scanning && (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '50%',
          height: '2px',
          background: `linear-gradient(90deg, ${DESIGN.colors.brand.primary} 0%, transparent 100%)`,
          transformOrigin: 'left center',
          animation: 'radarSweep 2s linear infinite',
        }}
      />
    )}
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: DESIGN.colors.brand.primary,
        boxShadow: DESIGN.shadows.glow.orange,
      }}
    />
    {scanning && (
      <>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: `2px solid ${DESIGN.colors.brand.primary}`,
          animation: 'radarPulse 2s ease-out infinite',
          opacity: 0,
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: `2px solid ${DESIGN.colors.brand.primary}`,
          animation: 'radarPulse 2s ease-out infinite 0.5s',
          opacity: 0,
        }} />
      </>
    )}
  </div>
);

// Heat Badge for high engagement
const HeatBadge = ({ level }) => {
  if (level < 2) return null;
  const colors = {
    2: { bg: 'rgba(251, 191, 36, 0.15)', text: '#FBBF24', label: 'WARM' },
    3: { bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316', label: 'HOT' },
    4: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', label: '🔥' },
  };
  const style = colors[Math.min(level, 4)];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      backgroundColor: style.bg,
      color: style.text,
      fontSize: DESIGN.typography.size.xs,
      fontWeight: DESIGN.typography.weight.bold,
      borderRadius: DESIGN.radius.full,
      textTransform: 'uppercase',
      letterSpacing: DESIGN.typography.letterSpacing.wide,
    }}>
      {style.label}
    </span>
  );
};

// NEW badge for recent items
const NewBadge = () => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    backgroundColor: DESIGN.colors.accent.cyanGlow,
    color: DESIGN.colors.accent.cyan,
    fontSize: '10px',
    fontWeight: DESIGN.typography.weight.bold,
    borderRadius: DESIGN.radius.sm,
    textTransform: 'uppercase',
    letterSpacing: DESIGN.typography.letterSpacing.wider,
  }}>
    NEW
  </span>
);

// Collection Progress Modal - Shows detailed progress during data collection
const CollectionProgressModal = ({ progress, isVisible }) => {
  if (!isVisible || !progress) return null;
  
  const collectors = [
    { key: 'reddit', icon: '📱', label: 'Reddit' },
    { key: 'news', icon: '📰', label: 'News' },
    { key: 'prediction_markets', icon: '🎯', label: 'Prediction Markets' },
    { key: 'polymarket', icon: '💰', label: 'Polymarket' },
    { key: 'kalshi', icon: '🏛️', label: 'Kalshi' },
    { key: 'social', icon: '📊', label: 'Social & Sentiment' },
  ];
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete': return '✅';
      case 'running': return '⏳';
      case 'error': return '❌';
      default: return '⬚';
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return DESIGN.colors.semantic.profit;
      case 'running': return DESIGN.colors.brand.primary;
      case 'error': return DESIGN.colors.semantic.loss;
      default: return DESIGN.colors.text.tertiary;
    }
  };
  
  const completedCount = progress.completed_count || 0;
  const totalCount = progress.total_count || 6;
  const percentComplete = progress.percent_complete || 0;
  const totalItems = progress.total_items || 0;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: DESIGN.colors.bg.elevated,
        borderRadius: DESIGN.radius.xl,
        border: `1px solid ${DESIGN.colors.border.subtle}`,
        padding: '32px 40px',
        minWidth: '420px',
        maxWidth: '500px',
        boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${DESIGN.colors.brand.primary}20`,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: DESIGN.radius.lg,
            background: `linear-gradient(135deg, ${DESIGN.colors.brand.primary}20 0%, ${DESIGN.colors.brand.secondary}20 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${DESIGN.colors.brand.primary}30`,
          }}>
            <RefreshCw 
              size={24} 
              color={DESIGN.colors.brand.primary}
              style={{
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: DESIGN.typography.size.lg,
              fontWeight: DESIGN.typography.weight.bold,
              color: DESIGN.colors.text.primary,
              fontFamily: DESIGN.typography.fontFamily.display,
            }}>
              Collecting Intelligence
            </h3>
            <p style={{
              margin: 0,
              fontSize: DESIGN.typography.size.sm,
              color: DESIGN.colors.text.tertiary,
            }}>
              {totalItems > 0 ? `${totalItems.toLocaleString()} items collected` : 'Initializing collectors...'}
            </p>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div style={{ marginBottom: '24px' }}>
          {collectors.map((collector, idx) => {
            const collectorProgress = progress.progress?.[collector.key] || { status: 'pending', count: 0 };
            const status = collectorProgress.status;
            const count = collectorProgress.count || 0;
            
            return (
              <div 
                key={collector.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  marginBottom: '4px',
                  borderRadius: DESIGN.radius.md,
                  backgroundColor: status === 'running' 
                    ? `${DESIGN.colors.brand.primary}10` 
                    : 'transparent',
                  border: status === 'running' 
                    ? `1px solid ${DESIGN.colors.brand.primary}30`
                    : '1px solid transparent',
                  transition: DESIGN.transition.fast,
                }}
              >
                <span style={{ 
                  fontSize: '18px', 
                  marginRight: '12px',
                  opacity: status === 'pending' ? 0.4 : 1,
                }}>
                  {collector.icon}
                </span>
                <span style={{
                  flex: 1,
                  fontSize: DESIGN.typography.size.sm,
                  fontWeight: status === 'running' ? DESIGN.typography.weight.semibold : DESIGN.typography.weight.medium,
                  color: status === 'pending' 
                    ? DESIGN.colors.text.tertiary 
                    : DESIGN.colors.text.primary,
                }}>
                  {collector.label}
                </span>
                {count > 0 && (
                  <span style={{
                    fontSize: DESIGN.typography.size.xs,
                    color: DESIGN.colors.text.secondary,
                    fontFamily: DESIGN.typography.fontFamily.mono,
                    marginRight: '12px',
                  }}>
                    {count} items
                  </span>
                )}
                <span style={{
                  fontSize: '16px',
                  color: getStatusColor(status),
                }}>
                  {getStatusIcon(status)}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Progress Bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}>
            <span style={{
              fontSize: DESIGN.typography.size.xs,
              color: DESIGN.colors.text.tertiary,
              textTransform: 'uppercase',
              letterSpacing: DESIGN.typography.letterSpacing.wider,
            }}>
              Progress
            </span>
            <span style={{
              fontSize: DESIGN.typography.size.xs,
              color: DESIGN.colors.text.secondary,
              fontFamily: DESIGN.typography.fontFamily.mono,
            }}>
              {completedCount}/{totalCount} sources
            </span>
          </div>
          <div style={{
            height: '8px',
            backgroundColor: DESIGN.colors.bg.surface,
            borderRadius: DESIGN.radius.full,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${percentComplete}%`,
              background: `linear-gradient(90deg, ${DESIGN.colors.brand.primary} 0%, ${DESIGN.colors.brand.secondary} 100%)`,
              borderRadius: DESIGN.radius.full,
              transition: 'width 0.5s ease-out',
            }} />
          </div>
        </div>
        
        {/* Footer hint */}
        <p style={{
          margin: 0,
          fontSize: DESIGN.typography.size.xs,
          color: DESIGN.colors.text.tertiary,
          textAlign: 'center',
        }}>
          This typically takes 60-90 seconds
        </p>
      </div>
      
      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED TRADING TERMINAL - Consolidated Trading + Auto-Trade with Strategy Allocation
// ═══════════════════════════════════════════════════════════════════════════

// Strategy definitions with descriptions
const STRATEGIES = [
  {
    id: 'momentum',
    name: 'Momentum Breakout',
    description: 'Buys stocks breaking above 20-day highs with volume confirmation. Best in trending markets.',
    icon: '🚀',
    color: '#10B981',
    riskLevel: 'Medium-High',
  },
  {
    id: 'mean_reversion',
    name: 'Mean Reversion',
    description: 'Buys oversold stocks expecting bounce to moving average. Works best in ranging markets.',
    icon: '🔄',
    color: '#3B82F6',
    riskLevel: 'Medium',
  },
  {
    id: 'rsi',
    name: 'RSI Oversold',
    description: 'Buys when RSI drops below 30, sells above 70. Classic technical indicator strategy.',
    icon: '📊',
    color: '#8B5CF6',
    riskLevel: 'Low-Medium',
  },
  {
    id: 'vwap',
    name: 'VWAP Bounce',
    description: 'Buys dips to VWAP, sells at upper bands. Intraday institutional flow strategy.',
    icon: '📈',
    color: '#F59E0B',
    riskLevel: 'Medium',
  },
];

// Strategy Allocation Slider Component
const AllocationSlider = ({ strategy, allocation, onChange, disabled, botCapital }) => {
  const dollarAmount = (allocation / 100) * botCapital;
  
  return (
    <div style={{
      padding: '16px 20px',
      backgroundColor: DESIGN.colors.bg.surface,
      borderRadius: DESIGN.radius.lg,
      border: `1px solid ${allocation > 0 ? strategy.color + '40' : DESIGN.colors.border.subtle}`,
      marginBottom: '12px',
      opacity: disabled ? 0.6 : 1,
      transition: DESIGN.transition.fast,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{strategy.icon}</span>
          <div>
            <div style={{
              fontSize: DESIGN.typography.size.base,
              fontWeight: DESIGN.typography.weight.semibold,
              color: DESIGN.colors.text.primary,
            }}>
              {strategy.name}
            </div>
            <div style={{
              fontSize: DESIGN.typography.size.xs,
              color: DESIGN.colors.text.tertiary,
            }}>
              Risk: {strategy.riskLevel}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: DESIGN.typography.size.xl,
            fontWeight: DESIGN.typography.weight.bold,
            fontFamily: DESIGN.typography.fontFamily.mono,
            color: allocation > 0 ? strategy.color : DESIGN.colors.text.tertiary,
          }}>
            {allocation}%
          </div>
          <div style={{
            fontSize: DESIGN.typography.size.sm,
            fontFamily: DESIGN.typography.fontFamily.mono,
            color: DESIGN.colors.text.secondary,
          }}>
            ${dollarAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
      
      {/* Slider */}
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={allocation}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        style={{
          width: '100%',
          height: '8px',
          borderRadius: '4px',
          background: `linear-gradient(to right, ${strategy.color} 0%, ${strategy.color} ${allocation}%, ${DESIGN.colors.bg.elevated} ${allocation}%, ${DESIGN.colors.bg.elevated} 100%)`,
          WebkitAppearance: 'none',
          appearance: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
        }}
      />
      
      {/* Description */}
      <div style={{
        marginTop: '12px',
        fontSize: DESIGN.typography.size.xs,
        color: DESIGN.colors.text.tertiary,
        lineHeight: 1.5,
      }}>
        {strategy.description}
      </div>
    </div>
  );
};

// Allocation Summary Bar
const AllocationSummary = ({ allocations, botCapital }) => {
  const total = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const unallocated = Math.max(0, 100 - total);
  
  return (
    <div style={{
      padding: '20px',
      backgroundColor: DESIGN.colors.bg.elevated,
      borderRadius: DESIGN.radius.lg,
      border: `1px solid ${total === 100 ? DESIGN.colors.semantic.profit + '40' : total > 100 ? DESIGN.colors.semantic.loss + '40' : DESIGN.colors.border.subtle}`,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <span style={{
          fontSize: DESIGN.typography.size.sm,
          fontWeight: DESIGN.typography.weight.semibold,
          color: DESIGN.colors.text.primary,
          textTransform: 'uppercase',
          letterSpacing: DESIGN.typography.letterSpacing.wider,
        }}>
          Allocation Summary
        </span>
        <span style={{
          fontSize: DESIGN.typography.size.sm,
          fontFamily: DESIGN.typography.fontFamily.mono,
          color: total === 100 ? DESIGN.colors.semantic.profit : total > 100 ? DESIGN.colors.semantic.loss : DESIGN.colors.text.secondary,
        }}>
          Total: {total}% {total === 100 ? '✓' : total > 100 ? '⚠️ Over 100%' : `(${unallocated}% cash)`}
        </span>
      </div>
      
      {/* Stacked bar */}
      <div style={{
        height: '24px',
        backgroundColor: DESIGN.colors.bg.surface,
        borderRadius: DESIGN.radius.md,
        overflow: 'hidden',
        display: 'flex',
      }}>
        {STRATEGIES.map((strategy) => {
          const allocation = allocations[strategy.id] || 0;
          if (allocation === 0) return null;
          return (
            <div
              key={strategy.id}
              style={{
                width: `${Math.min(allocation, 100)}%`,
                height: '100%',
                backgroundColor: strategy.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'width 0.3s ease',
              }}
              title={`${strategy.name}: ${allocation}%`}
            >
              {allocation >= 15 && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: DESIGN.typography.weight.bold,
                  color: '#fff',
                }}>
                  {allocation}%
                </span>
              )}
            </div>
          );
        })}
        {unallocated > 0 && total <= 100 && (
          <div style={{
            width: `${unallocated}%`,
            height: '100%',
            backgroundColor: DESIGN.colors.bg.elevated,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unallocated >= 15 && (
              <span style={{ fontSize: '10px', color: DESIGN.colors.text.tertiary }}>
                Cash
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        marginTop: '16px',
      }}>
        {STRATEGIES.map((strategy) => {
          const allocation = allocations[strategy.id] || 0;
          if (allocation === 0) return null;
          return (
            <div key={strategy.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: strategy.color,
              }} />
              <span style={{ fontSize: DESIGN.typography.size.xs, color: DESIGN.colors.text.secondary }}>
                {strategy.name}: ${((allocation / 100) * botCapital).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Animated number display
const AnimatedValue = ({ value, prefix = '', suffix = '', color }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);
  
  return (
    <span style={{ 
      color: color || DESIGN.colors.text.primary,
      fontFamily: DESIGN.typography.fontFamily.mono,
      fontWeight: DESIGN.typography.weight.semibold,
      fontFeatureSettings: '"tnum" 1', // Tabular numbers
    }}>
      {prefix}{typeof displayValue === 'number' ? displayValue.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) : displayValue}{suffix}
    </span>
  );
};

// Status indicator with pulse
const StatusIndicator = ({ status, label, size = 'sm' }) => {
  const sizes = { sm: 6, md: 8, lg: 10 };
  const dotSize = sizes[size];
  
  const statusColors = {
    online: DESIGN.colors.semantic.profit,
    offline: DESIGN.colors.semantic.loss,
    warning: DESIGN.colors.semantic.warning,
    neutral: DESIGN.colors.semantic.neutral,
  };
  
  const color = statusColors[status] || statusColors.neutral;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: status === 'online' ? `0 0 ${dotSize}px ${color}` : 'none',
        }} />
        {status === 'online' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: color,
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            opacity: 0.75,
          }} />
        )}
      </div>
      {label && (
        <span style={{
          fontSize: DESIGN.typography.size.xs,
          color: DESIGN.colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: DESIGN.typography.letterSpacing.wider,
          fontWeight: DESIGN.typography.weight.medium,
        }}>
          {label}
        </span>
      )}
    </div>
  );
};

// Trend indicator
const TrendIndicator = ({ value, showIcon = true, size = 'sm' }) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const color = isNeutral 
    ? DESIGN.colors.text.tertiary 
    : isPositive 
      ? DESIGN.colors.semantic.profit 
      : DESIGN.colors.semantic.loss;
  
  const Icon = isNeutral ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 20;
  
  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '2px',
      color,
    }}>
      {showIcon && <Icon size={iconSize} />}
      <span style={{
        fontFamily: DESIGN.typography.fontFamily.mono,
        fontSize: size === 'sm' ? DESIGN.typography.size.sm : DESIGN.typography.size.base,
        fontWeight: DESIGN.typography.weight.medium,
      }}>
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  );
};

// Section Header
const SectionHeader = ({ icon: Icon, title, action, children }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {Icon && (
        <div style={{
          width: 32,
          height: 32,
          borderRadius: DESIGN.radius.md,
          background: DESIGN.colors.brand.ember,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${DESIGN.colors.brand.primary}20`,
        }}>
          <Icon size={16} color={DESIGN.colors.brand.primary} />
        </div>
      )}
      <h3 style={{
        margin: 0,
        fontSize: DESIGN.typography.size.sm,
        fontWeight: DESIGN.typography.weight.semibold,
        color: DESIGN.colors.text.primary,
        textTransform: 'uppercase',
        letterSpacing: DESIGN.typography.letterSpacing.wide,
      }}>
        {title}
      </h3>
    </div>
    {action && action}
    {children}
  </div>
);

// Card Component
const Card = ({ children, style = {}, hover = false, glow = false, sentiment = null, hot = false, onClick }) => {
  const getSentimentBorder = () => {
    if (sentiment === null || sentiment === undefined) return DESIGN.colors.border.subtle;
    if (sentiment > 0) return DESIGN.colors.border.profit;
    if (sentiment < 0) return DESIGN.colors.border.loss;
    return DESIGN.colors.border.subtle;
  };
  
  return (
    <div 
      onClick={onClick}
      style={{
        backgroundColor: hot ? 'rgba(249, 115, 22, 0.03)' : DESIGN.colors.bg.elevated,
        border: `1px solid ${getSentimentBorder()}`,
        borderLeft: sentiment !== null && sentiment !== undefined ? `3px solid ${sentiment > 0 ? DESIGN.colors.semantic.profit : sentiment < 0 ? DESIGN.colors.semantic.loss : DESIGN.colors.border.subtle}` : undefined,
        borderRadius: DESIGN.radius.lg,
        padding: '20px',
        transition: DESIGN.transition.base,
        cursor: onClick ? 'pointer' : 'default',
        ...(glow && {
          boxShadow: DESIGN.shadows.glow.orange,
          borderColor: `${DESIGN.colors.brand.primary}30`,
        }),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Button Component
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  loading = false,
  disabled = false,
  onClick,
  style = {}
}) => {
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${DESIGN.colors.brand.primary} 0%, ${DESIGN.colors.brand.secondary} 100%)`,
      color: '#fff',
      border: 'none',
      boxShadow: DESIGN.shadows.glow.orange,
    },
    secondary: {
      background: DESIGN.colors.bg.surface,
      color: DESIGN.colors.text.primary,
      border: `1px solid ${DESIGN.colors.border.default}`,
    },
    ghost: {
      background: 'transparent',
      color: DESIGN.colors.text.secondary,
      border: `1px solid transparent`,
    },
    danger: {
      background: DESIGN.colors.semantic.loss,
      color: '#fff',
      border: 'none',
    },
    success: {
      background: DESIGN.colors.semantic.profit,
      color: '#fff',
      border: 'none',
    },
  };
  
  const sizes = {
    sm: { padding: '6px 12px', fontSize: DESIGN.typography.size.xs },
    md: { padding: '10px 18px', fontSize: DESIGN.typography.size.sm },
    lg: { padding: '14px 24px', fontSize: DESIGN.typography.size.base },
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...variants[variant],
        ...sizes[size],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: DESIGN.radius.md,
        fontFamily: DESIGN.typography.fontFamily.body,
        fontWeight: DESIGN.typography.weight.semibold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: DESIGN.transition.fast,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {loading ? (
        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {children}
    </button>
  );
};

// Metric Display
const Metric = ({ label, value, prefix = '', suffix = '', trend, size = 'md', color, stacked = false }) => {
  const sizes = {
    sm: { value: DESIGN.typography.size.lg, label: DESIGN.typography.size.xs },
    md: { value: DESIGN.typography.size.xl, label: DESIGN.typography.size.xs },
    lg: { value: DESIGN.typography.size['2xl'], label: DESIGN.typography.size.sm },
    xl: { value: DESIGN.typography.size['3xl'], label: DESIGN.typography.size.sm },
  };
  
  return (
    <div>
      <div style={{
        fontSize: DESIGN.typography.size.xs,
        color: DESIGN.colors.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: DESIGN.typography.letterSpacing.wider,
        marginBottom: '4px',
        fontWeight: DESIGN.typography.weight.medium,
      }}>
        {label}
      </div>
      <div style={{ 
        display: 'flex', 
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'flex-start' : 'baseline', 
        gap: stacked ? '4px' : '8px' 
      }}>
        <span style={{
          fontSize: sizes[size].value,
          fontFamily: DESIGN.typography.fontFamily.mono,
          fontWeight: DESIGN.typography.weight.bold,
          color: color || DESIGN.colors.text.primary,
          fontFeatureSettings: '"tnum" 1',
        }}>
          {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) : value}{suffix}
        </span>
        {trend !== undefined && <TrendIndicator value={trend} size="sm" />}
      </div>
    </div>
  );
};

// Tab Navigation
const TabNav = ({ tabs, activeTab, onChange }) => (
  <div style={{
    display: 'flex',
    gap: '4px',
    padding: '4px',
    backgroundColor: DESIGN.colors.bg.primary,
    borderRadius: DESIGN.radius.lg,
    border: `1px solid ${DESIGN.colors.border.subtle}`,
  }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: activeTab === tab.id 
            ? `linear-gradient(135deg, ${DESIGN.colors.brand.primary} 0%, ${DESIGN.colors.brand.secondary} 100%)`
            : 'transparent',
          border: 'none',
          borderRadius: DESIGN.radius.md,
          color: activeTab === tab.id ? '#fff' : DESIGN.colors.text.secondary,
          fontSize: DESIGN.typography.size.sm,
          fontWeight: DESIGN.typography.weight.semibold,
          fontFamily: DESIGN.typography.fontFamily.body,
          cursor: 'pointer',
          transition: DESIGN.transition.fast,
          boxShadow: activeTab === tab.id ? DESIGN.shadows.glow.orange : 'none',
        }}
      >
        {tab.icon && <tab.icon size={16} />}
        {tab.label}
      </button>
    ))}
  </div>
);

// Subtle Tab Navigation (underline style)
const TabNavSubtle = ({ tabs, activeTab, onChange }) => (
  <div style={{
    display: 'flex',
    gap: '0',
    borderBottom: `1px solid ${DESIGN.colors.border.subtle}`,
  }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: 'transparent',
          border: 'none',
          borderBottom: activeTab === tab.id 
            ? `2px solid ${DESIGN.colors.brand.primary}`
            : '2px solid transparent',
          marginBottom: '-1px',
          color: activeTab === tab.id ? DESIGN.colors.brand.primary : DESIGN.colors.text.secondary,
          fontSize: DESIGN.typography.size.sm,
          fontWeight: DESIGN.typography.weight.semibold,
          fontFamily: DESIGN.typography.fontFamily.body,
          cursor: 'pointer',
          transition: DESIGN.transition.fast,
        }}
      >
        {tab.icon && <tab.icon size={16} />}
        {tab.label}
      </button>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE COMMAND CENTER - Multi-Column Layout with Priority Lane
// ═══════════════════════════════════════════════════════════════════════════════

const IntelligenceCommandCenter = () => {
  const [signals, setSignals] = useState([]);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionProgress, setCollectionProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categories = [
    { id: 'all', label: 'All Markets', icon: Globe },
    { id: 'politics', label: 'Politics', icon: Target },
    { id: 'sports', label: 'Sports', icon: Activity },
    { id: 'crypto', label: 'Crypto', icon: Database },
    { id: 'entertainment', label: 'Entertainment', icon: Radio },
  ];

  // Source type definitions for columns
  const sourceTypes = {
    reddit: {
      label: 'REDDIT',
      icon: MessageSquare,
      color: '#FF4500',
      match: (item) => item.source_type === 'reddit' || item.source_name?.startsWith('r/'),
    },
    news: {
      label: 'NEWS',
      icon: Globe,
      color: '#3B82F6',
      match: (item) => item.source_type === 'news' || ['BBC', 'NYT', 'Reuters', 'Politico', 'ESPN', 'CoinDesk', 'Variety', 'Google News', 'The Hill', 'CoinTelegraph', 'Decrypt', 'Hollywood Reporter', 'Deadline'].some(s => item.source_name?.includes(s)),
    },
    markets: {
      label: 'PREDICTION MARKETS',
      icon: TrendingUp,
      color: '#10B981',
      match: (item) => item.source_type === 'prediction_market' || ['Polymarket', 'Metaculus', 'Manifold', 'Kalshi'].some(s => item.source_name?.includes(s)),
    },
    social: {
      label: 'SOCIAL',
      icon: Zap,
      color: '#8B5CF6',
      match: (item) => item.source_type === 'social_media' || item.source_name?.startsWith('@') || item.source_name?.includes('Fear & Greed'),
    },
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch signals, stats, and items by source type in parallel
      const [signalsRes, statsRes, marketsRes, redditRes, newsRes, socialRes] = await Promise.all([
        fetch(`${RESEARCH_API}/signals`),
        fetch(`${RESEARCH_API}/stats`),
        fetch(`${RESEARCH_API}/items?source_type=prediction_market&limit=100`),
        fetch(`${RESEARCH_API}/items?source_type=reddit&limit=100`),
        fetch(`${RESEARCH_API}/items?source_type=news&limit=100`),
        fetch(`${RESEARCH_API}/items?source_type=social_media&limit=100`),
      ]);

      if (signalsRes.ok) {
        const data = await signalsRes.json();
        setSignals(data.signals || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Combine all items from different sources
      const allItems = [];
      let debugCounts = { markets: 0, reddit: 0, news: 0, social: 0 };
      
      if (marketsRes.ok) {
        const data = await marketsRes.json();
        debugCounts.markets = data.items?.length || 0;
        allItems.push(...(data.items || []));
      }
      
      if (redditRes.ok) {
        const data = await redditRes.json();
        debugCounts.reddit = data.items?.length || 0;
        allItems.push(...(data.items || []));
      }
      
      if (newsRes.ok) {
        const data = await newsRes.json();
        debugCounts.news = data.items?.length || 0;
        allItems.push(...(data.items || []));
      }
      
      if (socialRes.ok) {
        const data = await socialRes.json();
        debugCounts.social = data.items?.length || 0;
        allItems.push(...(data.items || []));
      }

      // Debug: Log what we got from each source
      console.log('Items by source:', { ...debugCounts, total: allItems.length });

      setItems(allItems);
    } catch (err) {
      setError('Failed to fetch intelligence data');
      console.error('Fetch error:', err);
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
    setCollectionProgress(null);
    
    try {
      const res = await fetch(`${RESEARCH_API}/collect`, { method: 'POST' });
      if (res.ok) {
        // Start polling for progress
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`${RESEARCH_API}/collect/status`);
            if (statusRes.ok) {
              const status = await statusRes.json();
              setCollectionProgress(status);
              
              // Check if collection is complete
              if (!status.running && status.result) {
                clearInterval(pollInterval);
                setIsCollecting(false);
                setCollectionProgress(null);
                fetchData(); // Refresh data
              }
            }
          } catch (err) {
            console.error('Status poll failed:', err);
          }
        }, 2000); // Poll every 2 seconds
        
        // Safety timeout - stop polling after 3 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsCollecting(false);
          setCollectionProgress(null);
          fetchData();
        }, 180000);
      }
    } catch (err) {
      console.error('Collection failed:', err);
      setIsCollecting(false);
      setCollectionProgress(null);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMins = Math.floor((now - then) / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  const isRecent = (timestamp) => {
    const diffMins = Math.floor((new Date() - new Date(timestamp)) / 60000);
    return diffMins < 60;
  };

  const getHeatLevel = (upvotes, comments) => {
    const score = (upvotes || 0) + (comments || 0) * 2;
    if (score > 50000) return 4;
    if (score > 20000) return 3;
    if (score > 5000) return 2;
    return 1;
  };

  // Categorize items by source type
  const categorizeItems = useCallback(() => {
    const categorized = {
      reddit: [],
      news: [],
      markets: [],
      social: [],
    };

    // Debug: log unique source types
    const sourceTypesFound = [...new Set(items.map(i => i.source_type))];
    const sourceNamesFound = [...new Set(items.map(i => i.source_name))];
    console.log('Source types in data:', sourceTypesFound);
    console.log('Source names sample:', sourceNamesFound.slice(0, 20));

    items.forEach(item => {
      if (sourceTypes.markets.match(item)) {
        categorized.markets.push(item);
      } else if (sourceTypes.social.match(item)) {
        categorized.social.push(item);
      } else if (sourceTypes.news.match(item)) {
        categorized.news.push(item);
      } else if (sourceTypes.reddit.match(item)) {
        categorized.reddit.push(item);
      } else {
        // Default to reddit for unknown
        categorized.reddit.push(item);
      }
    });

    console.log('Categorized counts:', {
      markets: categorized.markets.length,
      reddit: categorized.reddit.length,
      news: categorized.news.length,
      social: categorized.social.length,
    });

    return categorized;
  }, [items]);

  // Get priority items (top by engagement across all sources)
  const getPriorityItems = useCallback(() => {
    return [...items]
      .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
      .slice(0, 8);
  }, [items]);

  const categorizedItems = categorizeItems();
  const priorityItems = getPriorityItems();

  // Compact item card for columns
  const CompactItemCard = ({ item, showSource = true }) => {
    const heatLevel = getHeatLevel(item.upvotes, item.comments);
    const itemIsRecent = isRecent(item.timestamp);
    const hasUrl = item.url && item.url.length > 0;

    return (
      <div style={{
        padding: '12px',
        backgroundColor: DESIGN.colors.bg.surface,
        borderRadius: DESIGN.radius.md,
        borderLeft: `3px solid ${item.sentiment > 0 ? DESIGN.colors.semantic.profit : item.sentiment < 0 ? DESIGN.colors.semantic.loss : DESIGN.colors.border.subtle}`,
        marginBottom: '8px',
        transition: DESIGN.transition.fast,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
            {showSource && (
              <span style={{
                fontSize: '10px',
                color: DESIGN.colors.brand.primary,
                fontWeight: DESIGN.typography.weight.bold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {item.source_name}
              </span>
            )}
            {itemIsRecent && <NewBadge />}
            {heatLevel >= 3 && <HeatBadge level={heatLevel} />}
          </div>
          <span style={{
            fontSize: '10px',
            color: DESIGN.colors.text.tertiary,
            fontFamily: DESIGN.typography.fontFamily.mono,
            whiteSpace: 'nowrap',
          }}>
            {formatTimeAgo(item.timestamp)}
          </span>
        </div>
        
        {hasUrl ? (
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'block',
              fontSize: DESIGN.typography.size.xs,
              fontWeight: DESIGN.typography.weight.medium,
              color: DESIGN.colors.text.primary,
              lineHeight: 1.4,
              textDecoration: 'none',
              marginBottom: '8px',
            }}
            onMouseOver={(e) => e.target.style.color = DESIGN.colors.brand.primary}
            onMouseOut={(e) => e.target.style.color = DESIGN.colors.text.primary}
          >
            {item.title?.length > 80 ? item.title.substring(0, 80) + '...' : item.title}
            <ExternalLink size={10} style={{ marginLeft: '4px', opacity: 0.5, verticalAlign: 'middle' }} />
          </a>
        ) : (
          <div style={{
            fontSize: DESIGN.typography.size.xs,
            fontWeight: DESIGN.typography.weight.medium,
            color: DESIGN.colors.text.primary,
            lineHeight: 1.4,
            marginBottom: '8px',
          }}>
            {item.title?.length > 80 ? item.title.substring(0, 80) + '...' : item.title}
          </div>
        )}
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '10px',
        }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            color: item.sentiment > 0 
              ? DESIGN.colors.semantic.profit 
              : item.sentiment < 0 
                ? DESIGN.colors.semantic.loss 
                : DESIGN.colors.text.tertiary,
            fontWeight: DESIGN.typography.weight.semibold,
          }}>
            {item.sentiment > 0 ? <TrendingUp size={10} /> : item.sentiment < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
            {item.sentiment > 0 ? 'Bull' : item.sentiment < 0 ? 'Bear' : 'Neut'}
          </span>
          {(item.upvotes > 0 || item.comments > 0) && (
            <span style={{ color: DESIGN.colors.text.tertiary }}>
              {item.upvotes > 0 && `↑${(item.upvotes / 1000).toFixed(1)}k`}
              {item.comments > 0 && ` · ${item.comments}`}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Priority item card (larger, more prominent)
  const PriorityItemCard = ({ item }) => {
    const heatLevel = getHeatLevel(item.upvotes, item.comments);
    const hasUrl = item.url && item.url.length > 0;
    
    // Determine source type for coloring
    let sourceColor = DESIGN.colors.text.tertiary;
    Object.values(sourceTypes).forEach(st => {
      if (st.match(item)) sourceColor = st.color;
    });

    return (
      <div style={{
        padding: '16px',
        backgroundColor: DESIGN.colors.bg.elevated,
        borderRadius: DESIGN.radius.lg,
        border: `1px solid ${DESIGN.colors.border.subtle}`,
        borderTop: `3px solid ${sourceColor}`,
        flex: '1 1 280px',
        minWidth: '280px',
        maxWidth: '350px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              color: sourceColor,
              fontWeight: DESIGN.typography.weight.bold,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {item.source_name}
            </span>
            {heatLevel >= 3 && <HeatBadge level={heatLevel} />}
          </div>
          <span style={{
            fontSize: '10px',
            color: DESIGN.colors.text.tertiary,
            fontFamily: DESIGN.typography.fontFamily.mono,
          }}>
            {formatTimeAgo(item.timestamp)}
          </span>
        </div>
        
        {hasUrl ? (
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'block',
              fontSize: DESIGN.typography.size.sm,
              fontWeight: DESIGN.typography.weight.semibold,
              color: DESIGN.colors.text.primary,
              lineHeight: 1.4,
              textDecoration: 'none',
              marginBottom: '12px',
            }}
            onMouseOver={(e) => e.target.style.color = DESIGN.colors.brand.primary}
            onMouseOut={(e) => e.target.style.color = DESIGN.colors.text.primary}
          >
            {item.title?.length > 100 ? item.title.substring(0, 100) + '...' : item.title}
            <ExternalLink size={12} style={{ marginLeft: '6px', opacity: 0.5, verticalAlign: 'middle' }} />
          </a>
        ) : (
          <div style={{
            fontSize: DESIGN.typography.size.sm,
            fontWeight: DESIGN.typography.weight.semibold,
            color: DESIGN.colors.text.primary,
            lineHeight: 1.4,
            marginBottom: '12px',
          }}>
            {item.title?.length > 100 ? item.title.substring(0, 100) + '...' : item.title}
          </div>
        )}
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: DESIGN.radius.sm,
            backgroundColor: item.sentiment > 0 
              ? DESIGN.colors.semantic.profitBg
              : item.sentiment < 0 
                ? DESIGN.colors.semantic.lossBg
                : DESIGN.colors.bg.surface,
            color: item.sentiment > 0 
              ? DESIGN.colors.semantic.profit 
              : item.sentiment < 0 
                ? DESIGN.colors.semantic.loss 
                : DESIGN.colors.text.tertiary,
            fontSize: '11px',
            fontWeight: DESIGN.typography.weight.semibold,
          }}>
            {item.sentiment > 0 ? <TrendingUp size={12} /> : item.sentiment < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {item.sentiment > 0 ? 'Bullish' : item.sentiment < 0 ? 'Bearish' : 'Neutral'}
          </span>
          
          <span style={{ 
            fontSize: '11px',
            color: DESIGN.colors.text.tertiary,
            fontFamily: DESIGN.typography.fontFamily.mono,
          }}>
            {item.upvotes > 0 && `↑${(item.upvotes / 1000).toFixed(1)}k`}
            {item.comments > 0 && ` · 💬${item.comments}`}
          </span>
        </div>
      </div>
    );
  };

  // Column component
  const SourceColumn = ({ sourceKey, items: columnItems }) => {
    const source = sourceTypes[sourceKey];
    const Icon = source.icon;
    
    return (
      <div style={{
        flex: '1 1 0',
        minWidth: '250px',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: DESIGN.colors.bg.primary,
        borderRadius: DESIGN.radius.lg,
        border: `1px solid ${DESIGN.colors.border.subtle}`,
        overflow: 'hidden',
      }}>
        {/* Column Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${DESIGN.colors.border.subtle}`,
          backgroundColor: DESIGN.colors.bg.elevated,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Icon size={16} color={source.color} />
          <span style={{
            fontSize: DESIGN.typography.size.xs,
            fontWeight: DESIGN.typography.weight.bold,
            color: DESIGN.colors.text.primary,
            textTransform: 'uppercase',
            letterSpacing: DESIGN.typography.letterSpacing.wider,
          }}>
            {source.label}
          </span>
          <span style={{
            marginLeft: 'auto',
            fontSize: '10px',
            color: DESIGN.colors.text.tertiary,
            fontFamily: DESIGN.typography.fontFamily.mono,
          }}>
            {columnItems.length}
          </span>
        </div>
        
        {/* Column Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          maxHeight: '500px',
        }}>
          {columnItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 12px',
              color: DESIGN.colors.text.tertiary,
              fontSize: DESIGN.typography.size.xs,
            }}>
              <Icon size={24} style={{ marginBottom: '8px', opacity: 0.3 }} />
              <div>No data yet</div>
              <div style={{ marginTop: '4px', opacity: 0.7 }}>Run a scan to collect</div>
            </div>
          ) : (
            columnItems.slice(0, 20).map((item, idx) => (
              <CompactItemCard key={idx} item={item} showSource={sourceKey === 'reddit' || sourceKey === 'news'} />
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
      }}>
        <RadarScanner size={120} scanning={true} />
        <p style={{ 
          color: DESIGN.colors.text.secondary, 
          marginTop: '24px',
          fontSize: DESIGN.typography.size.sm,
          textTransform: 'uppercase',
          letterSpacing: DESIGN.typography.letterSpacing.wider,
        }}>
          Scanning intelligence sources...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Card style={{ textAlign: 'center', padding: '60px' }}>
        <AlertCircle size={48} color={DESIGN.colors.semantic.loss} style={{ marginBottom: '16px' }} />
        <p style={{ color: DESIGN.colors.text.secondary, marginBottom: '16px' }}>{error}</p>
        <Button onClick={fetchData} variant="secondary">Retry</Button>
      </Card>
    );
  }

  return (
    <div>
      {/* Collection Progress Modal */}
      <CollectionProgressModal 
        progress={collectionProgress} 
        isVisible={isCollecting && collectionProgress !== null} 
      />
      
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: DESIGN.radius.lg,
              background: `linear-gradient(135deg, ${DESIGN.colors.brand.primary}20 0%, ${DESIGN.colors.brand.secondary}20 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${DESIGN.colors.brand.primary}30`,
            }}>
              <Crosshair size={20} color={DESIGN.colors.brand.primary} />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: DESIGN.typography.size['2xl'],
                fontWeight: DESIGN.typography.weight.bold,
                color: DESIGN.colors.text.primary,
                fontFamily: DESIGN.typography.fontFamily.display,
              }}>
                INTELLIGENCE COMMAND CENTER
              </h2>
              <p style={{
                margin: 0,
                color: DESIGN.colors.text.tertiary,
                fontSize: DESIGN.typography.size.sm,
              }}>
                Real-time signals from Reddit, News, Prediction Markets & Social
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Stats mini bar */}
          <div style={{
            display: 'flex',
            gap: '16px',
            padding: '8px 16px',
            backgroundColor: DESIGN.colors.bg.elevated,
            borderRadius: DESIGN.radius.md,
            border: `1px solid ${DESIGN.colors.border.subtle}`,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: DESIGN.colors.text.tertiary, textTransform: 'uppercase' }}>Items</div>
              <div style={{ fontSize: DESIGN.typography.size.lg, fontWeight: DESIGN.typography.weight.bold, fontFamily: DESIGN.typography.fontFamily.mono, color: DESIGN.colors.text.primary }}>{items.length}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: DESIGN.colors.text.tertiary, textTransform: 'uppercase' }}>Signals</div>
              <div style={{ fontSize: DESIGN.typography.size.lg, fontWeight: DESIGN.typography.weight.bold, fontFamily: DESIGN.typography.fontFamily.mono, color: DESIGN.colors.brand.primary }}>{signals.length}</div>
            </div>
          </div>
          
          <Button
            onClick={runCollection}
            loading={isCollecting}
            icon={isCollecting ? null : RefreshCw}
            variant="primary"
            size="lg"
          >
            {isCollecting ? 'Scanning...' : 'Run Scan'}
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: selectedCategory === cat.id 
                ? DESIGN.colors.brand.ember 
                : 'transparent',
              border: `1px solid ${selectedCategory === cat.id 
                ? DESIGN.colors.brand.primary + '40' 
                : DESIGN.colors.border.subtle}`,
              borderRadius: DESIGN.radius.full,
              color: selectedCategory === cat.id 
                ? DESIGN.colors.brand.primary 
                : DESIGN.colors.text.secondary,
              fontSize: DESIGN.typography.size.xs,
              fontWeight: DESIGN.typography.weight.medium,
              cursor: 'pointer',
              transition: DESIGN.transition.fast,
              textTransform: 'uppercase',
              letterSpacing: DESIGN.typography.letterSpacing.wide,
            }}
          >
            <cat.icon size={12} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Priority Lane */}
      {priorityItems.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}>
            <Flame size={18} color={DESIGN.colors.brand.primary} />
            <span style={{
              fontSize: DESIGN.typography.size.sm,
              fontWeight: DESIGN.typography.weight.bold,
              color: DESIGN.colors.text.primary,
              textTransform: 'uppercase',
              letterSpacing: DESIGN.typography.letterSpacing.wider,
            }}>
              High Priority Signals
            </span>
            <span style={{
              fontSize: '10px',
              color: DESIGN.colors.text.tertiary,
              fontFamily: DESIGN.typography.fontFamily.mono,
            }}>
              Top {priorityItems.length} by engagement
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}>
            {priorityItems.map((item, idx) => (
              <PriorityItemCard key={idx} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 ? (
        <div style={{ 
          backgroundColor: DESIGN.colors.bg.elevated,
          border: `1px solid ${DESIGN.colors.border.subtle}`,
          borderRadius: DESIGN.radius.xl,
          padding: '60px 40px',
          textAlign: 'center',
        }}>
          <RadarScanner size={140} scanning={isCollecting} />
          <h3 style={{ 
            color: DESIGN.colors.text.primary, 
            margin: '24px 0 8px 0',
            fontSize: DESIGN.typography.size.xl,
            fontFamily: DESIGN.typography.fontFamily.display,
            textTransform: 'uppercase',
            letterSpacing: DESIGN.typography.letterSpacing.wide,
          }}>
            {isCollecting ? 'SCANNING...' : 'AWAITING SCAN'}
          </h3>
          <p style={{ 
            color: DESIGN.colors.text.tertiary, 
            marginBottom: '24px',
            maxWidth: '400px',
            margin: '0 auto 24px auto',
          }}>
            {isCollecting 
              ? 'Collecting from Reddit, News, Polymarket, and Social sources...'
              : 'Initialize a scan to populate the intelligence feeds.'
            }
          </p>
          {!isCollecting && (
            <Button onClick={runCollection} icon={RefreshCw} size="lg">
              Initialize Scan
            </Button>
          )}
        </div>
      ) : (
        /* Four Column Layout */
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
        }}>
          <SourceColumn sourceKey="markets" items={categorizedItems.markets} />
          <SourceColumn sourceKey="reddit" items={categorizedItems.reddit} />
          <SourceColumn sourceKey="news" items={categorizedItems.news} />
          <SourceColumn sourceKey="social" items={categorizedItems.social} />
        </div>
      )}

      {/* Trading Signals Section */}
      {signals.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <Zap size={18} color={DESIGN.colors.brand.primary} />
            <span style={{
              fontSize: DESIGN.typography.size.sm,
              fontWeight: DESIGN.typography.weight.bold,
              color: DESIGN.colors.text.primary,
              textTransform: 'uppercase',
              letterSpacing: DESIGN.typography.letterSpacing.wider,
            }}>
              Active Trading Signals
            </span>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '16px',
          }}>
            {signals.map((signal, idx) => (
              <Card 
                key={idx} 
                style={{ padding: '0', overflow: 'hidden' }}
                sentiment={signal.sentiment_score}
                glow={signal.confidence > 0.8}
              >
                <div style={{
                  padding: '16px 20px',
                  borderBottom: `1px solid ${DESIGN.colors.border.subtle}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: signal.confidence > 0.8 ? DESIGN.colors.brand.ember : 'transparent',
                }}>
                  <span style={{
                    fontSize: DESIGN.typography.size.xs,
                    color: DESIGN.colors.text.tertiary,
                    textTransform: 'uppercase',
                    letterSpacing: DESIGN.typography.letterSpacing.wider,
                  }}>
                    {signal.category}
                  </span>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: DESIGN.radius.full,
                    fontSize: DESIGN.typography.size.xs,
                    fontWeight: DESIGN.typography.weight.bold,
                    fontFamily: DESIGN.typography.fontFamily.mono,
                    color: '#fff',
                    background: signal.side === 'YES' 
                      ? DESIGN.colors.semantic.profit 
                      : DESIGN.colors.semantic.loss,
                  }}>
                    {signal.side}
                  </div>
                </div>
                
                <div style={{ padding: '20px' }}>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: DESIGN.typography.size.base,
                    fontWeight: DESIGN.typography.weight.semibold,
                    color: DESIGN.colors.text.primary,
                  }}>
                    {signal.market_question}
                  </h4>
                  
                  <div style={{
                    display: 'flex',
                    gap: '24px',
                    marginBottom: '12px',
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: DESIGN.colors.text.tertiary, textTransform: 'uppercase' }}>Confidence</div>
                      <div style={{ fontSize: DESIGN.typography.size.lg, fontWeight: DESIGN.typography.weight.bold, fontFamily: DESIGN.typography.fontFamily.mono, color: DESIGN.colors.text.primary }}>
                        {(signal.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: DESIGN.colors.text.tertiary, textTransform: 'uppercase' }}>Sources</div>
                      <div style={{ fontSize: DESIGN.typography.size.lg, fontWeight: DESIGN.typography.weight.bold, fontFamily: DESIGN.typography.fontFamily.mono, color: DESIGN.colors.text.primary }}>
                        {signal.sources_count}
                      </div>
                    </div>
                  </div>
                  
                  <p style={{
                    margin: 0,
                    fontSize: DESIGN.typography.size.xs,
                    color: DESIGN.colors.text.secondary,
                    lineHeight: 1.5,
                  }}>
                    {signal.reasoning}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

function App() {
  // State
  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [accountHistory, setAccountHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quote, setQuote] = useState(null);
  
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

  // Strategy allocation state
  const [botCapital, setBotCapital] = useState(10000);
  const [strategyAllocations, setStrategyAllocations] = useState({
    momentum: 25,
    mean_reversion: 50,
    rsi: 15,
    vwap: 10,
  });
  const [tradingSubTab, setTradingSubTab] = useState('positions');

  const [recommendations, setRecommendations] = useState([]);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);

  // Market data state
  const [marketMovers, setMarketMovers] = useState({ gainers: [], losers: [] });
  const [marketIndices, setMarketIndices] = useState([]);
  const [marketStats, setMarketStats] = useState({});

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial load
  useEffect(() => {
    checkHealth();
  }, []);

  // Data polling
  useEffect(() => {
    if (connected) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 5000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      setConnected(data.broker_connected);
      setLoading(false);
      if (!data.broker_connected) {
        setError('Broker connection unavailable');
      }
    } catch (err) {
      setError('Failed to connect to backend');
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchAccount(),
      fetchPositions(),
      fetchOrders(),
      fetchTrades(),
      fetchAccountHistory(),
      fetchBotStatus(),
      fetchMarketData(),
    ]);
  };

  const fetchAccount = async () => {
    try {
      const res = await fetch(`${API_BASE}/account`);
      if (res.ok) setAccount(await res.json());
    } catch (err) {}
  };

  const fetchMarketData = async () => {
    try {
      const [moversRes, indicesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/market/movers`),
        fetch(`${API_BASE}/market/indices`),
        fetch(`${API_BASE}/market/stats`),
      ]);
      
      if (moversRes.ok) setMarketMovers(await moversRes.json());
      if (indicesRes.ok) setMarketIndices(await indicesRes.json());
      if (statsRes.ok) setMarketStats(await statsRes.json());
    } catch (err) {
      console.error('Error fetching market data:', err);
    }
  };

  const fetchPositions = async () => {
    try {
      const res = await fetch(`${API_BASE}/positions`);
      if (res.ok) setPositions(await res.json());
    } catch (err) {}
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders?status=open`);
      if (res.ok) setOrders(await res.json());
    } catch (err) {}
  };

  const fetchTrades = async () => {
    try {
      const res = await fetch(`${API_BASE}/trades?limit=50`);
      if (res.ok) setTrades(await res.json());
    } catch (err) {}
  };

  const fetchAccountHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/account/history?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setAccountHistory(data.reverse());
      }
    } catch (err) {}
  };

  const fetchBotStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/bot/status`);
      if (res.ok) {
        const data = await res.json();
        setBotStatus(prev => ({ ...prev, running: data.running, strategy: data.strategy || prev.strategy }));
      }
    } catch (err) {}
  };

  const handleGetQuote = async () => {
    if (!orderForm.symbol) return;
    try {
      const res = await fetch(`${API_BASE}/quote/${orderForm.symbol.toUpperCase()}`);
      if (res.ok) setQuote(await res.json());
    } catch (err) {}
  };

  const handlePlaceOrder = async () => {
    if (!orderForm.symbol || !orderForm.qty) return;
    
    const endpoint = orderForm.orderType === 'market' 
      ? `${API_BASE}/orders/market` 
      : `${API_BASE}/orders/limit`;
    
    const orderData = {
      symbol: orderForm.symbol.toUpperCase(),
      qty: parseFloat(orderForm.qty),
      side: orderForm.side,
      ...(orderForm.orderType === 'limit' && { limit_price: parseFloat(orderForm.limitPrice) }),
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (res.ok) {
        fetchOrders();
        fetchPositions();
        setQuote(null);
      }
    } catch (err) {}
  };

  const handleStartBot = async () => {
    try {
      console.log('Starting bot...');
      const res = await fetch(`${API_BASE}/bot/start`, { method: 'POST' });
      const data = await res.json();
      console.log('Bot start response:', data);
      if (res.ok) {
        fetchBotStatus();
      } else {
        alert(`Failed to start bot: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Bot start error:', err);
      alert(`Failed to start bot: ${err.message}`);
    }
  };

  const handleStopBot = async () => {
    try {
      console.log('Stopping bot...');
      const res = await fetch(`${API_BASE}/bot/stop`, { method: 'POST' });
      const data = await res.json();
      console.log('Bot stop response:', data);
      if (res.ok) {
        fetchBotStatus();
      } else {
        alert(`Failed to stop bot: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Bot stop error:', err);
      alert(`Failed to stop bot: ${err.message}`);
    }
  };

  const fetchRecommendations = async () => {
    setLoadingIntelligence(true);
    try {
      const res = await fetch(`${API_BASE}/intelligence/recommendations`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {}
    setLoadingIntelligence(false);
  };

  // Formatters
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatPercent = (val) => `${(val * 100).toFixed(2)}%`;
  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formatDate = (str) => new Date(str).toLocaleString();

  const totalPnL = positions.reduce((sum, p) => sum + (p.unrealized_pl || 0), 0);
  const totalPnLPercent = positions.reduce((sum, p) => sum + (p.unrealized_plpc || 0), 0);

  // Navigation tabs
  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'trading', label: 'Trading Terminal', icon: Activity },
    { id: 'research', label: 'Intelligence', icon: Crosshair },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
  ];

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: DESIGN.colors.bg.void,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px',
      }}>
        <RadarScanner size={100} scanning={true} />
        <div style={{
          fontFamily: DESIGN.typography.fontFamily.display,
          fontSize: DESIGN.typography.size.sm,
          color: DESIGN.colors.text.secondary,
          letterSpacing: DESIGN.typography.letterSpacing.wider,
          textTransform: 'uppercase',
        }}>
          INITIALIZING PLUTUS TERMINAL
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: DESIGN.colors.bg.void,
      color: DESIGN.colors.text.primary,
      fontFamily: DESIGN.typography.fontFamily.body,
    }}>
      {/* CSS Animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes radarPulse { 
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
      `}</style>

      {/* Top Bar */}
      <header style={{
        height: '56px',
        borderBottom: `1px solid ${DESIGN.colors.border.subtle}`,
        backgroundColor: DESIGN.colors.bg.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: DESIGN.radius.md,
            background: `linear-gradient(135deg, ${DESIGN.colors.brand.primary} 0%, ${DESIGN.colors.brand.secondary} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: DESIGN.shadows.glow.orange,
          }}>
            <Zap size={18} color="#fff" />
          </div>
          <span style={{
            fontFamily: DESIGN.typography.fontFamily.display,
            fontSize: DESIGN.typography.size.lg,
            fontWeight: DESIGN.typography.weight.bold,
            letterSpacing: DESIGN.typography.letterSpacing.wide,
            background: `linear-gradient(135deg, ${DESIGN.colors.brand.primary} 0%, ${DESIGN.colors.text.primary} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            PLUTUS
          </span>
        </div>

        {/* Center - Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <StatusIndicator 
            status={connected ? 'online' : 'offline'} 
            label={connected ? 'Connected' : 'Disconnected'} 
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: DESIGN.colors.bg.surface,
            borderRadius: DESIGN.radius.md,
            border: `1px solid ${DESIGN.colors.border.subtle}`,
          }}>
            <Clock size={14} color={DESIGN.colors.text.tertiary} />
            <span style={{
              fontFamily: DESIGN.typography.fontFamily.mono,
              fontSize: DESIGN.typography.size.sm,
              color: DESIGN.colors.text.secondary,
            }}>
              {formatTime(currentTime)}
            </span>
          </div>
        </div>

        {/* Right - Account */}
        {account && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: DESIGN.typography.size.xs,
                color: DESIGN.colors.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: DESIGN.typography.letterSpacing.wider,
              }}>
                Portfolio Value
              </div>
              <div style={{
                fontFamily: DESIGN.typography.fontFamily.mono,
                fontSize: DESIGN.typography.size.lg,
                fontWeight: DESIGN.typography.weight.bold,
                color: DESIGN.colors.text.primary,
              }}>
                {formatCurrency(account.equity)}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Layout */}
      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <nav style={{
          width: '240px',
          minHeight: 'calc(100vh - 56px)',
          borderRight: `1px solid ${DESIGN.colors.border.subtle}`,
          backgroundColor: DESIGN.colors.bg.primary,
          padding: '20px 12px',
          position: 'sticky',
          top: '56px',
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: activeTab === tab.id 
                    ? DESIGN.colors.brand.ember 
                    : 'transparent',
                  border: 'none',
                  borderRadius: DESIGN.radius.md,
                  color: activeTab === tab.id 
                    ? DESIGN.colors.brand.primary 
                    : DESIGN.colors.text.secondary,
                  fontSize: DESIGN.typography.size.sm,
                  fontWeight: activeTab === tab.id 
                    ? DESIGN.typography.weight.semibold 
                    : DESIGN.typography.weight.medium,
                  fontFamily: DESIGN.typography.fontFamily.body,
                  cursor: 'pointer',
                  transition: DESIGN.transition.fast,
                  textAlign: 'left',
                  width: '100%',
                  borderLeft: activeTab === tab.id 
                    ? `2px solid ${DESIGN.colors.brand.primary}` 
                    : '2px solid transparent',
                }}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bot Status Widget */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: DESIGN.colors.bg.elevated,
            borderRadius: DESIGN.radius.lg,
            border: `1px solid ${DESIGN.colors.border.subtle}`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <span style={{
                fontSize: DESIGN.typography.size.xs,
                color: DESIGN.colors.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: DESIGN.typography.letterSpacing.wider,
              }}>
                Auto-Trade
              </span>
              <StatusIndicator 
                status={botStatus.running ? 'online' : 'neutral'} 
                size="sm" 
              />
            </div>
            <div style={{
              fontSize: DESIGN.typography.size.sm,
              color: DESIGN.colors.text.secondary,
              marginBottom: '4px',
            }}>
              Strategy: <span style={{ color: DESIGN.colors.text.primary, textTransform: 'capitalize' }}>{botStatus.strategy}</span>
            </div>
            <div style={{
              fontSize: DESIGN.typography.size.xs,
              color: botStatus.running ? DESIGN.colors.semantic.profit : DESIGN.colors.text.tertiary,
            }}>
              {botStatus.running ? '● Running' : '○ Stopped'}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{
          flex: 1,
          padding: '24px',
          minHeight: 'calc(100vh - 56px)',
          backgroundColor: DESIGN.colors.bg.void,
        }}>
          {error && !connected ? (
            <Card style={{
              maxWidth: '500px',
              margin: '40px auto',
              textAlign: 'center',
              padding: '40px',
            }}>
              <WifiOff size={48} color={DESIGN.colors.semantic.loss} style={{ marginBottom: '16px' }} />
              <h2 style={{ 
                color: DESIGN.colors.text.primary, 
                marginBottom: '8px',
                fontSize: DESIGN.typography.size.xl,
              }}>
                Connection Failed
              </h2>
              <p style={{ 
                color: DESIGN.colors.text.secondary, 
                marginBottom: '24px',
                fontSize: DESIGN.typography.size.sm,
              }}>
                {error}
              </p>
              <Button onClick={checkHealth} icon={RefreshCw}>
                Retry Connection
              </Button>
            </Card>
          ) : (
            <>
              {/* Dashboard */}
              {activeTab === 'dashboard' && account && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  {/* Account Overview */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                    marginBottom: '24px',
                  }}>
                    <Card>
                      <Metric 
                        label="Total Equity" 
                        value={account.equity} 
                        prefix="$" 
                        size="lg"
                      />
                    </Card>
                    <Card>
                      <Metric 
                        label="Cash Available" 
                        value={account.cash} 
                        prefix="$" 
                        size="lg"
                      />
                    </Card>
                    <Card>
                      <Metric 
                        label="Buying Power" 
                        value={account.buying_power} 
                        prefix="$" 
                        size="lg"
                      />
                    </Card>
                    <Card glow={totalPnL > 0}>
                      <Metric 
                        label="Day P&L" 
                        value={totalPnL} 
                        prefix="$" 
                        trend={totalPnLPercent * 100}
                        size="lg"
                        color={totalPnL >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss}
                        stacked={true}
                      />
                    </Card>
                  </div>

                  {/* Portfolio Performance - Sparkline Small Multiples */}
                  <Card style={{ marginBottom: '24px' }}>
                    <SectionHeader icon={LineChartIcon} title="Portfolio Performance" />
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '16px',
                    }}>
                      {/* Today */}
                      <div style={{
                        padding: '16px',
                        backgroundColor: DESIGN.colors.bg.surface,
                        borderRadius: DESIGN.radius.lg,
                        border: `1px solid ${DESIGN.colors.border.subtle}`,
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px',
                        }}>
                          <div>
                            <div style={{
                              fontSize: DESIGN.typography.size.xs,
                              color: DESIGN.colors.text.tertiary,
                              textTransform: 'uppercase',
                              letterSpacing: DESIGN.typography.letterSpacing.wider,
                            }}>
                              Today
                            </div>
                            <div style={{
                              fontSize: DESIGN.typography.size.lg,
                              fontWeight: DESIGN.typography.weight.bold,
                              fontFamily: DESIGN.typography.fontFamily.mono,
                              color: (account.equity - account.last_equity) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                            }}>
                              {formatCurrency(account.equity - account.last_equity)}
                            </div>
                          </div>
                          <div style={{
                            fontSize: DESIGN.typography.size.sm,
                            fontWeight: DESIGN.typography.weight.semibold,
                            color: (account.equity - account.last_equity) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                          }}>
                            {((account.equity - account.last_equity) / account.last_equity * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div style={{ height: 50 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={accountHistory.slice(-24)}>
                              <defs>
                                <linearGradient id="sparkToday" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={(account.equity - account.last_equity) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={(account.equity - account.last_equity) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area 
                                type="monotone" 
                                dataKey="equity" 
                                stroke={(account.equity - account.last_equity) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss}
                                strokeWidth={2}
                                fill="url(#sparkToday)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* This Week */}
                      <div style={{
                        padding: '16px',
                        backgroundColor: DESIGN.colors.bg.surface,
                        borderRadius: DESIGN.radius.lg,
                        border: `1px solid ${DESIGN.colors.border.subtle}`,
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px',
                        }}>
                          <div>
                            <div style={{
                              fontSize: DESIGN.typography.size.xs,
                              color: DESIGN.colors.text.tertiary,
                              textTransform: 'uppercase',
                              letterSpacing: DESIGN.typography.letterSpacing.wider,
                            }}>
                              This Week
                            </div>
                            <div style={{
                              fontSize: DESIGN.typography.size.lg,
                              fontWeight: DESIGN.typography.weight.bold,
                              fontFamily: DESIGN.typography.fontFamily.mono,
                              color: (account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                            }}>
                              {formatCurrency(account.equity - 100000)}
                            </div>
                          </div>
                          <div style={{
                            fontSize: DESIGN.typography.size.sm,
                            fontWeight: DESIGN.typography.weight.semibold,
                            color: (account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                          }}>
                            {((account.equity - 100000) / 100000 * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div style={{ height: 50 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={accountHistory.slice(-168)}>
                              <defs>
                                <linearGradient id="sparkWeek" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={(account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={(account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area 
                                type="monotone" 
                                dataKey="equity" 
                                stroke={(account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss}
                                strokeWidth={2}
                                fill="url(#sparkWeek)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* This Month */}
                      <div style={{
                        padding: '16px',
                        backgroundColor: DESIGN.colors.bg.surface,
                        borderRadius: DESIGN.radius.lg,
                        border: `1px solid ${DESIGN.colors.border.subtle}`,
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px',
                        }}>
                          <div>
                            <div style={{
                              fontSize: DESIGN.typography.size.xs,
                              color: DESIGN.colors.text.tertiary,
                              textTransform: 'uppercase',
                              letterSpacing: DESIGN.typography.letterSpacing.wider,
                            }}>
                              This Month
                            </div>
                            <div style={{
                              fontSize: DESIGN.typography.size.lg,
                              fontWeight: DESIGN.typography.weight.bold,
                              fontFamily: DESIGN.typography.fontFamily.mono,
                              color: (account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                            }}>
                              {formatCurrency(account.equity - 100000)}
                            </div>
                          </div>
                          <div style={{
                            fontSize: DESIGN.typography.size.sm,
                            fontWeight: DESIGN.typography.weight.semibold,
                            color: (account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                          }}>
                            {((account.equity - 100000) / 100000 * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div style={{ height: 50 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={accountHistory}>
                              <defs>
                                <linearGradient id="sparkMonth" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={(account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={(account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area 
                                type="monotone" 
                                dataKey="equity" 
                                stroke={(account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss}
                                strokeWidth={2}
                                fill="url(#sparkMonth)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* All Time */}
                      <div style={{
                        padding: '16px',
                        backgroundColor: DESIGN.colors.bg.surface,
                        borderRadius: DESIGN.radius.lg,
                        border: `1px solid ${DESIGN.colors.border.subtle}`,
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px',
                        }}>
                          <div>
                            <div style={{
                              fontSize: DESIGN.typography.size.xs,
                              color: DESIGN.colors.text.tertiary,
                              textTransform: 'uppercase',
                              letterSpacing: DESIGN.typography.letterSpacing.wider,
                            }}>
                              All Time
                            </div>
                            <div style={{
                              fontSize: DESIGN.typography.size.lg,
                              fontWeight: DESIGN.typography.weight.bold,
                              fontFamily: DESIGN.typography.fontFamily.mono,
                              color: (account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                            }}>
                              {formatCurrency(account.equity - 100000)}
                            </div>
                          </div>
                          <div style={{
                            fontSize: DESIGN.typography.size.sm,
                            fontWeight: DESIGN.typography.weight.semibold,
                            color: (account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                          }}>
                            {((account.equity - 100000) / 100000 * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div style={{ height: 50 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={accountHistory}>
                              <defs>
                                <linearGradient id="sparkAll" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={(account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={(account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area 
                                type="monotone" 
                                dataKey="equity" 
                                stroke={(account.equity - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss}
                                strokeWidth={2}
                                fill="url(#sparkAll)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Market Analytics */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                  }}>
                    {/* Top Gainers */}
                    <Card>
                      <SectionHeader icon={TrendingUp} title="Top Gainers" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(marketMovers.gainers?.length > 0 ? marketMovers.gainers : [
                          { symbol: 'NVDA', price: 892.45, change_pct: 8.24 },
                          { symbol: 'AMD', price: 178.32, change_pct: 5.67 },
                          { symbol: 'TSLA', price: 248.50, change_pct: 4.32 },
                          { symbol: 'META', price: 524.18, change_pct: 3.89 },
                          { symbol: 'AAPL', price: 269.48, change_pct: 2.15 },
                        ]).map((stock, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            backgroundColor: DESIGN.colors.bg.surface,
                            borderRadius: DESIGN.radius.md,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                fontSize: DESIGN.typography.size.xs,
                                color: DESIGN.colors.text.tertiary,
                                width: '16px',
                              }}>
                                {idx + 1}
                              </span>
                              <span style={{
                                fontWeight: DESIGN.typography.weight.semibold,
                                color: DESIGN.colors.brand.primary,
                              }}>
                                {stock.symbol}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{
                                fontFamily: DESIGN.typography.fontFamily.mono,
                                fontSize: DESIGN.typography.size.sm,
                                color: DESIGN.colors.text.secondary,
                              }}>
                                ${stock.price?.toFixed(2) || '0.00'}
                              </span>
                              <span style={{
                                fontFamily: DESIGN.typography.fontFamily.mono,
                                fontSize: DESIGN.typography.size.sm,
                                fontWeight: DESIGN.typography.weight.semibold,
                                color: DESIGN.colors.semantic.profit,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                              }}>
                                <ArrowUpRight size={14} />
                                +{(stock.change_pct || stock.change || 0).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Top Losers */}
                    <Card>
                      <SectionHeader icon={TrendingDown} title="Top Losers" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(marketMovers.losers?.length > 0 ? marketMovers.losers : [
                          { symbol: 'INTC', price: 42.15, change_pct: -6.32 },
                          { symbol: 'BA', price: 178.90, change_pct: -4.87 },
                          { symbol: 'DIS', price: 98.45, change_pct: -3.45 },
                          { symbol: 'PYPL', price: 62.30, change_pct: -2.98 },
                          { symbol: 'NKE', price: 94.12, change_pct: -2.21 },
                        ]).map((stock, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            backgroundColor: DESIGN.colors.bg.surface,
                            borderRadius: DESIGN.radius.md,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                fontSize: DESIGN.typography.size.xs,
                                color: DESIGN.colors.text.tertiary,
                                width: '16px',
                              }}>
                                {idx + 1}
                              </span>
                              <span style={{
                                fontWeight: DESIGN.typography.weight.semibold,
                                color: DESIGN.colors.brand.primary,
                              }}>
                                {stock.symbol}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{
                                fontFamily: DESIGN.typography.fontFamily.mono,
                                fontSize: DESIGN.typography.size.sm,
                                color: DESIGN.colors.text.secondary,
                              }}>
                                ${stock.price?.toFixed(2) || '0.00'}
                              </span>
                              <span style={{
                                fontFamily: DESIGN.typography.fontFamily.mono,
                                fontSize: DESIGN.typography.size.sm,
                                fontWeight: DESIGN.typography.weight.semibold,
                                color: DESIGN.colors.semantic.loss,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                              }}>
                                <ArrowDownRight size={14} />
                                {(stock.change_pct || stock.change || 0).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Market Overview */}
                    <Card>
                      <SectionHeader icon={BarChart3} title="Market Overview" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Major Indices */}
                        {(marketIndices.length > 0 ? marketIndices : [
                          { name: 'S&P 500', value: 5892.45, change_pct: 0.87 },
                          { name: 'NASDAQ', value: 18924.32, change_pct: 1.24 },
                          { name: 'DOW', value: 43156.78, change_pct: 0.45 },
                        ]).map((index, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            backgroundColor: DESIGN.colors.bg.surface,
                            borderRadius: DESIGN.radius.md,
                          }}>
                            <span style={{
                              fontSize: DESIGN.typography.size.sm,
                              color: DESIGN.colors.text.secondary,
                            }}>
                              {index.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                fontFamily: DESIGN.typography.fontFamily.mono,
                                fontSize: DESIGN.typography.size.sm,
                                color: DESIGN.colors.text.primary,
                              }}>
                                {typeof index.value === 'number' ? index.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : index.value}
                              </span>
                              <span style={{
                                fontFamily: DESIGN.typography.fontFamily.mono,
                                fontSize: DESIGN.typography.size.xs,
                                fontWeight: DESIGN.typography.weight.semibold,
                                color: (index.change_pct || index.change || 0) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                              }}>
                                {(index.change_pct || index.change || 0) >= 0 ? '+' : ''}{(index.change_pct || index.change || 0).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* Divider */}
                        <div style={{ 
                          height: '1px', 
                          backgroundColor: DESIGN.colors.border.subtle,
                          margin: '4px 0',
                        }} />

                        {/* Volume & Stats */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '12px',
                        }}>
                          <div style={{
                            padding: '12px',
                            backgroundColor: DESIGN.colors.bg.surface,
                            borderRadius: DESIGN.radius.md,
                            textAlign: 'center',
                          }}>
                            <div style={{
                              fontSize: DESIGN.typography.size.xs,
                              color: DESIGN.colors.text.tertiary,
                              marginBottom: '4px',
                            }}>
                              Tracked Volume
                            </div>
                            <div style={{
                              fontSize: DESIGN.typography.size.base,
                              fontWeight: DESIGN.typography.weight.bold,
                              fontFamily: DESIGN.typography.fontFamily.mono,
                              color: DESIGN.colors.text.primary,
                            }}>
                              {marketStats.total_volume ? (marketStats.total_volume / 1000000000).toFixed(1) + 'B' : '—'}
                            </div>
                          </div>
                          <div style={{
                            padding: '12px',
                            backgroundColor: DESIGN.colors.bg.surface,
                            borderRadius: DESIGN.radius.md,
                            textAlign: 'center',
                          }}>
                            <div style={{
                              fontSize: DESIGN.typography.size.xs,
                              color: DESIGN.colors.text.tertiary,
                              marginBottom: '4px',
                            }}>
                              Advancers/Decliners
                            </div>
                            <div style={{
                              fontSize: DESIGN.typography.size.base,
                              fontWeight: DESIGN.typography.weight.bold,
                              fontFamily: DESIGN.typography.fontFamily.mono,
                            }}>
                              <span style={{ color: DESIGN.colors.semantic.profit }}>{marketStats.advancers || '—'}</span>
                              <span style={{ color: DESIGN.colors.text.tertiary }}> / </span>
                              <span style={{ color: DESIGN.colors.semantic.loss }}>{marketStats.decliners || '—'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Market Sentiment */}
                        <div style={{
                          padding: '12px',
                          backgroundColor: DESIGN.colors.bg.surface,
                          borderRadius: DESIGN.radius.md,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <span style={{
                            fontSize: DESIGN.typography.size.sm,
                            color: DESIGN.colors.text.secondary,
                          }}>
                            Market Sentiment
                          </span>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}>
                            <span style={{
                              fontFamily: DESIGN.typography.fontFamily.mono,
                              fontWeight: DESIGN.typography.weight.bold,
                              color: marketStats.advancers > marketStats.decliners ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                            }}>
                              {marketStats.advancers && marketStats.decliners 
                                ? ((marketStats.advancers / (marketStats.advancers + marketStats.decliners)) * 100).toFixed(0) + '%'
                                : '—'}
                            </span>
                            <span style={{
                              fontSize: DESIGN.typography.size.xs,
                              padding: '2px 6px',
                              backgroundColor: marketStats.advancers > marketStats.decliners ? DESIGN.colors.semantic.profitBg : DESIGN.colors.semantic.lossBg,
                              color: marketStats.advancers > marketStats.decliners ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                              borderRadius: DESIGN.radius.sm,
                            }}>
                              {marketStats.advancers > marketStats.decliners ? 'Bullish' : marketStats.advancers < marketStats.decliners ? 'Bearish' : 'Neutral'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}


              {/* Trading Terminal */}
              {activeTab === 'trading' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  {/* Portfolio Summary Bar */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                    marginBottom: '24px',
                  }}>
                    <Card style={{ padding: '20px' }}>
                      <div style={{
                        fontSize: DESIGN.typography.size.xs,
                        color: DESIGN.colors.text.tertiary,
                        textTransform: 'uppercase',
                        letterSpacing: DESIGN.typography.letterSpacing.wider,
                        marginBottom: '8px',
                      }}>
                        Portfolio Value
                      </div>
                      <div style={{
                        fontSize: DESIGN.typography.size['2xl'],
                        fontWeight: DESIGN.typography.weight.bold,
                        fontFamily: DESIGN.typography.fontFamily.mono,
                        color: DESIGN.colors.text.primary,
                      }}>
                        {formatCurrency(account?.portfolio_value || 0)}
                      </div>
                    </Card>
                    
                    <Card style={{ padding: '20px' }}>
                      <div style={{
                        fontSize: DESIGN.typography.size.xs,
                        color: DESIGN.colors.text.tertiary,
                        textTransform: 'uppercase',
                        letterSpacing: DESIGN.typography.letterSpacing.wider,
                        marginBottom: '8px',
                      }}>
                        Buying Power
                      </div>
                      <div style={{
                        fontSize: DESIGN.typography.size['2xl'],
                        fontWeight: DESIGN.typography.weight.bold,
                        fontFamily: DESIGN.typography.fontFamily.mono,
                        color: DESIGN.colors.brand.primary,
                      }}>
                        {formatCurrency(account?.buying_power || 0)}
                      </div>
                    </Card>
                    
                    <Card style={{ padding: '20px' }}>
                      <div style={{
                        fontSize: DESIGN.typography.size.xs,
                        color: DESIGN.colors.text.tertiary,
                        textTransform: 'uppercase',
                        letterSpacing: DESIGN.typography.letterSpacing.wider,
                        marginBottom: '12px',
                      }}>
                        Profit & Loss
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                      }}>
                        {/* Today */}
                        <div style={{
                          padding: '8px',
                          backgroundColor: DESIGN.colors.bg.surface,
                          borderRadius: DESIGN.radius.md,
                          textAlign: 'center',
                        }}>
                          <div style={{
                            fontSize: '10px',
                            color: DESIGN.colors.text.tertiary,
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                          }}>
                            Today
                          </div>
                          <div style={{
                            fontSize: DESIGN.typography.size.base,
                            fontWeight: DESIGN.typography.weight.bold,
                            fontFamily: DESIGN.typography.fontFamily.mono,
                            color: (account?.equity - account?.last_equity) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                          }}>
                            {formatCurrency((account?.equity || 0) - (account?.last_equity || 0))}
                          </div>
                        </div>
                        {/* This Week */}
                        <div style={{
                          padding: '8px',
                          backgroundColor: DESIGN.colors.bg.surface,
                          borderRadius: DESIGN.radius.md,
                          textAlign: 'center',
                        }}>
                          <div style={{
                            fontSize: '10px',
                            color: DESIGN.colors.text.tertiary,
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                          }}>
                            Week
                          </div>
                          <div style={{
                            fontSize: DESIGN.typography.size.base,
                            fontWeight: DESIGN.typography.weight.bold,
                            fontFamily: DESIGN.typography.fontFamily.mono,
                            color: ((account?.equity || 0) - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                          }}>
                            {formatCurrency((account?.equity || 0) - 100000)}
                          </div>
                        </div>
                        {/* All Time */}
                        <div style={{
                          padding: '8px',
                          backgroundColor: DESIGN.colors.bg.surface,
                          borderRadius: DESIGN.radius.md,
                          textAlign: 'center',
                        }}>
                          <div style={{
                            fontSize: '10px',
                            color: DESIGN.colors.text.tertiary,
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                          }}>
                            All Time
                          </div>
                          <div style={{
                            fontSize: DESIGN.typography.size.base,
                            fontWeight: DESIGN.typography.weight.bold,
                            fontFamily: DESIGN.typography.fontFamily.mono,
                            color: ((account?.equity || 0) - 100000) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                          }}>
                            {formatCurrency((account?.equity || 0) - 100000)}
                          </div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card style={{ padding: '20px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}>
                        <div>
                          <div style={{
                            fontSize: DESIGN.typography.size.xs,
                            color: DESIGN.colors.text.tertiary,
                            textTransform: 'uppercase',
                            letterSpacing: DESIGN.typography.letterSpacing.wider,
                            marginBottom: '8px',
                          }}>
                            Auto-Trade Bot
                          </div>
                          <div style={{
                            fontSize: DESIGN.typography.size.xl,
                            fontWeight: DESIGN.typography.weight.bold,
                            color: botStatus.running ? DESIGN.colors.semantic.profit : DESIGN.colors.text.tertiary,
                          }}>
                            {botStatus.running ? '● ACTIVE' : '○ STOPPED'}
                          </div>
                        </div>
                        <Button
                          variant={botStatus.running ? 'danger' : 'success'}
                          size="sm"
                          onClick={botStatus.running ? handleStopBot : handleStartBot}
                        >
                          {botStatus.running ? 'Stop' : 'Start'}
                        </Button>
                      </div>
                    </Card>
                  </div>
                  
                  {/* Main Content Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '340px 1fr',
                    gap: '24px',
                  }}>
                    {/* Left Column - Quick Trade + Bot Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Quick Trade Panel */}
                      <Card>
                        <SectionHeader icon={Activity} title="Quick Trade" />
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: DESIGN.typography.size.xs,
                              color: DESIGN.colors.text.tertiary,
                              textTransform: 'uppercase',
                              letterSpacing: DESIGN.typography.letterSpacing.wider,
                              marginBottom: '6px',
                            }}>
                              Symbol
                            </label>
                            <input
                              type="text"
                              value={orderForm.symbol}
                              onChange={(e) => setOrderForm(p => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                              placeholder="AAPL"
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: DESIGN.colors.bg.surface,
                                border: `1px solid ${DESIGN.colors.border.default}`,
                                borderRadius: DESIGN.radius.md,
                                color: DESIGN.colors.text.primary,
                                fontSize: DESIGN.typography.size.base,
                                fontFamily: DESIGN.typography.fontFamily.mono,
                                outline: 'none',
                              }}
                            />
                          </div>

                          <Button onClick={handleGetQuote} variant="secondary" style={{ width: '100%' }}>
                            Get Quote
                          </Button>

                          {quote && (
                            <div style={{
                              padding: '16px',
                              backgroundColor: DESIGN.colors.bg.surface,
                              borderRadius: DESIGN.radius.md,
                              border: `1px solid ${DESIGN.colors.brand.primary}30`,
                            }}>
                              <div style={{
                                fontSize: DESIGN.typography.size.xl,
                                fontWeight: DESIGN.typography.weight.bold,
                                fontFamily: DESIGN.typography.fontFamily.mono,
                                color: DESIGN.colors.brand.primary,
                                marginBottom: '8px',
                              }}>
                                {quote.symbol}
                              </div>
                              <div style={{ display: 'flex', gap: '16px', fontSize: DESIGN.typography.size.sm }}>
                                <span style={{ color: DESIGN.colors.semantic.profit }}>
                                  Bid: {formatCurrency(quote.bid)}
                                </span>
                                <span style={{ color: DESIGN.colors.semantic.loss }}>
                                  Ask: {formatCurrency(quote.ask)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: DESIGN.typography.size.xs,
                                color: DESIGN.colors.text.tertiary,
                                textTransform: 'uppercase',
                                letterSpacing: DESIGN.typography.letterSpacing.wider,
                                marginBottom: '6px',
                              }}>
                                Quantity
                              </label>
                              <input
                                type="number"
                                value={orderForm.qty}
                                onChange={(e) => setOrderForm(p => ({ ...p, qty: e.target.value }))}
                                min="1"
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  backgroundColor: DESIGN.colors.bg.surface,
                                  border: `1px solid ${DESIGN.colors.border.default}`,
                                  borderRadius: DESIGN.radius.md,
                                  color: DESIGN.colors.text.primary,
                                  fontSize: DESIGN.typography.size.base,
                                  fontFamily: DESIGN.typography.fontFamily.mono,
                                  outline: 'none',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: DESIGN.typography.size.xs,
                                color: DESIGN.colors.text.tertiary,
                                textTransform: 'uppercase',
                                letterSpacing: DESIGN.typography.letterSpacing.wider,
                                marginBottom: '6px',
                              }}>
                                Type
                              </label>
                              <select
                                value={orderForm.orderType}
                                onChange={(e) => setOrderForm(p => ({ ...p, orderType: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  backgroundColor: DESIGN.colors.bg.surface,
                                  border: `1px solid ${DESIGN.colors.border.default}`,
                                  borderRadius: DESIGN.radius.md,
                                  color: DESIGN.colors.text.primary,
                                  fontSize: DESIGN.typography.size.base,
                                  outline: 'none',
                                }}
                              >
                                <option value="market">Market</option>
                                <option value="limit">Limit</option>
                              </select>
                            </div>
                          </div>

                          {orderForm.orderType === 'limit' && (
                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: DESIGN.typography.size.xs,
                                color: DESIGN.colors.text.tertiary,
                                textTransform: 'uppercase',
                                letterSpacing: DESIGN.typography.letterSpacing.wider,
                                marginBottom: '6px',
                              }}>
                                Limit Price
                              </label>
                              <input
                                type="number"
                                value={orderForm.limitPrice}
                                onChange={(e) => setOrderForm(p => ({ ...p, limitPrice: e.target.value }))}
                                step="0.01"
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  backgroundColor: DESIGN.colors.bg.surface,
                                  border: `1px solid ${DESIGN.colors.border.default}`,
                                  borderRadius: DESIGN.radius.md,
                                  color: DESIGN.colors.text.primary,
                                  fontSize: DESIGN.typography.size.base,
                                  fontFamily: DESIGN.typography.fontFamily.mono,
                                  outline: 'none',
                                }}
                              />
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Button 
                              variant="success" 
                              style={{ width: '100%' }}
                              onClick={() => { setOrderForm(p => ({ ...p, side: 'buy' })); handlePlaceOrder(); }}
                            >
                              Buy
                            </Button>
                            <Button 
                              variant="danger" 
                              style={{ width: '100%' }}
                              onClick={() => { setOrderForm(p => ({ ...p, side: 'sell' })); handlePlaceOrder(); }}
                            >
                              Sell
                            </Button>
                          </div>
                        </div>
                      </Card>
                      
                      {/* Bot Status Panel */}
                      <Card>
                        <SectionHeader icon={Bot} title="Bot Status" />
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: botStatus.running ? DESIGN.colors.semantic.profitBg : DESIGN.colors.bg.surface,
                            borderRadius: DESIGN.radius.md,
                            border: `1px solid ${botStatus.running ? DESIGN.colors.semantic.profit + '40' : DESIGN.colors.border.subtle}`,
                          }}>
                            <span style={{ fontSize: DESIGN.typography.size.sm, color: DESIGN.colors.text.secondary }}>
                              Status
                            </span>
                            <span style={{
                              fontWeight: DESIGN.typography.weight.bold,
                              color: botStatus.running ? DESIGN.colors.semantic.profit : DESIGN.colors.text.tertiary,
                            }}>
                              {botStatus.running ? '● Running' : '○ Stopped'}
                            </span>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{
                              padding: '12px',
                              backgroundColor: DESIGN.colors.bg.surface,
                              borderRadius: DESIGN.radius.md,
                              textAlign: 'center',
                            }}>
                              <div style={{ fontSize: DESIGN.typography.size.xs, color: DESIGN.colors.text.tertiary, marginBottom: '4px' }}>
                                Trades Today
                              </div>
                              <div style={{
                                fontSize: DESIGN.typography.size.lg,
                                fontWeight: DESIGN.typography.weight.bold,
                                fontFamily: DESIGN.typography.fontFamily.mono,
                              }}>
                                {botStatus.trades_today || 0}
                              </div>
                            </div>
                            <div style={{
                              padding: '12px',
                              backgroundColor: DESIGN.colors.bg.surface,
                              borderRadius: DESIGN.radius.md,
                              textAlign: 'center',
                            }}>
                              <div style={{ fontSize: DESIGN.typography.size.xs, color: DESIGN.colors.text.tertiary, marginBottom: '4px' }}>
                                Win Rate
                              </div>
                              <div style={{
                                fontSize: DESIGN.typography.size.lg,
                                fontWeight: DESIGN.typography.weight.bold,
                                fontFamily: DESIGN.typography.fontFamily.mono,
                                color: (botStatus.win_rate || 0) >= 50 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                              }}>
                                {botStatus.win_rate || 0}%
                              </div>
                            </div>
                          </div>
                          
                          <div style={{
                            padding: '12px 16px',
                            backgroundColor: DESIGN.colors.bg.surface,
                            borderRadius: DESIGN.radius.md,
                          }}>
                            <div style={{ fontSize: DESIGN.typography.size.xs, color: DESIGN.colors.text.tertiary, marginBottom: '4px' }}>
                              Bot Daily P&L
                            </div>
                            <div style={{
                              fontSize: DESIGN.typography.size.xl,
                              fontWeight: DESIGN.typography.weight.bold,
                              fontFamily: DESIGN.typography.fontFamily.mono,
                              color: (botStatus.daily_pnl || 0) >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                            }}>
                              {formatCurrency(botStatus.daily_pnl || 0)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                    
                    {/* Right Column - Tabbed Content */}
                    <Card style={{ padding: 0, overflow: 'hidden' }}>
                      {/* Sub-tab Navigation */}
                      <div style={{
                        display: 'flex',
                        borderBottom: `1px solid ${DESIGN.colors.border.subtle}`,
                        backgroundColor: DESIGN.colors.bg.elevated,
                      }}>
                        {[
                          { id: 'positions', label: 'Positions', count: positions.length },
                          { id: 'orders', label: 'Orders', count: orders.length },
                          { id: 'strategies', label: 'Strategies', count: null },
                          { id: 'history', label: 'History', count: trades.length > 0 ? trades.length : null },
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setTradingSubTab(tab.id)}
                            style={{
                              flex: 1,
                              padding: '16px 20px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderBottom: tradingSubTab === tab.id ? `2px solid ${DESIGN.colors.brand.primary}` : '2px solid transparent',
                              color: tradingSubTab === tab.id ? DESIGN.colors.brand.primary : DESIGN.colors.text.secondary,
                              fontSize: DESIGN.typography.size.sm,
                              fontWeight: DESIGN.typography.weight.semibold,
                              cursor: 'pointer',
                              transition: DESIGN.transition.fast,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                            }}
                          >
                            {tab.label}
                            {tab.count !== null && tab.count > 0 && (
                              <span style={{
                                padding: '2px 8px',
                                backgroundColor: tradingSubTab === tab.id ? DESIGN.colors.brand.primary : DESIGN.colors.bg.surface,
                                color: tradingSubTab === tab.id ? '#fff' : DESIGN.colors.text.tertiary,
                                borderRadius: DESIGN.radius.full,
                                fontSize: DESIGN.typography.size.xs,
                                fontFamily: DESIGN.typography.fontFamily.mono,
                              }}>
                                {tab.count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      
                      {/* Tab Content */}
                      <div style={{ padding: '20px' }}>
                        {/* Positions Tab */}
                        {tradingSubTab === 'positions' && (
                          <div>
                            {positions.length > 0 ? (
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr>
                                      {['Symbol', 'Qty', 'Avg Cost', 'Current', 'P&L', 'P&L %'].map(h => (
                                        <th key={h} style={{
                                          padding: '12px 16px',
                                          textAlign: 'left',
                                          fontSize: DESIGN.typography.size.xs,
                                          fontWeight: DESIGN.typography.weight.semibold,
                                          color: DESIGN.colors.text.tertiary,
                                          textTransform: 'uppercase',
                                          letterSpacing: DESIGN.typography.letterSpacing.wider,
                                          borderBottom: `1px solid ${DESIGN.colors.border.subtle}`,
                                        }}>
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {positions.map((pos, idx) => (
                                      <tr key={idx} style={{ borderBottom: `1px solid ${DESIGN.colors.border.subtle}` }}>
                                        <td style={{ padding: '16px', fontWeight: DESIGN.typography.weight.semibold, color: DESIGN.colors.brand.primary }}>
                                          {pos.symbol}
                                        </td>
                                        <td style={{ padding: '16px', fontFamily: DESIGN.typography.fontFamily.mono }}>{pos.qty}</td>
                                        <td style={{ padding: '16px', fontFamily: DESIGN.typography.fontFamily.mono }}>{formatCurrency(pos.avg_entry_price)}</td>
                                        <td style={{ padding: '16px', fontFamily: DESIGN.typography.fontFamily.mono }}>{formatCurrency(pos.current_price)}</td>
                                        <td style={{ 
                                          padding: '16px',
                                          fontFamily: DESIGN.typography.fontFamily.mono,
                                          color: pos.unrealized_pl >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                                        }}>
                                          {formatCurrency(pos.unrealized_pl)}
                                        </td>
                                        <td style={{ 
                                          padding: '16px',
                                          fontFamily: DESIGN.typography.fontFamily.mono,
                                          color: pos.unrealized_plpc >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                                        }}>
                                          {(pos.unrealized_plpc * 100).toFixed(2)}%
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '60px', color: DESIGN.colors.text.tertiary }}>
                                <Activity size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                                <div>No open positions</div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Orders Tab */}
                        {tradingSubTab === 'orders' && (
                          <div>
                            {orders.length > 0 ? (
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr>
                                      {['Symbol', 'Side', 'Type', 'Qty', 'Status', 'Created'].map(h => (
                                        <th key={h} style={{
                                          padding: '12px 16px',
                                          textAlign: 'left',
                                          fontSize: DESIGN.typography.size.xs,
                                          fontWeight: DESIGN.typography.weight.semibold,
                                          color: DESIGN.colors.text.tertiary,
                                          textTransform: 'uppercase',
                                          letterSpacing: DESIGN.typography.letterSpacing.wider,
                                          borderBottom: `1px solid ${DESIGN.colors.border.subtle}`,
                                        }}>
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {orders.map((order, idx) => (
                                      <tr key={idx} style={{ borderBottom: `1px solid ${DESIGN.colors.border.subtle}` }}>
                                        <td style={{ padding: '16px', fontWeight: DESIGN.typography.weight.semibold, color: DESIGN.colors.brand.primary }}>
                                          {order.symbol}
                                        </td>
                                        <td style={{ 
                                          padding: '16px',
                                          color: order.side === 'buy' ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                                          fontWeight: DESIGN.typography.weight.semibold,
                                          textTransform: 'uppercase',
                                        }}>
                                          {order.side}
                                        </td>
                                        <td style={{ padding: '16px', textTransform: 'capitalize' }}>{order.type}</td>
                                        <td style={{ padding: '16px', fontFamily: DESIGN.typography.fontFamily.mono }}>{order.qty}</td>
                                        <td style={{ padding: '16px', textTransform: 'capitalize' }}>{order.status}</td>
                                        <td style={{ padding: '16px', fontSize: DESIGN.typography.size.sm, color: DESIGN.colors.text.tertiary }}>
                                          {formatDate(order.created_at)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '60px', color: DESIGN.colors.text.tertiary }}>
                                <Layers size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                                <div>No open orders</div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Strategies Tab */}
                        {tradingSubTab === 'strategies' && (
                          <div>
                            {/* Bot Capital Header */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '24px',
                              padding: '16px 20px',
                              backgroundColor: DESIGN.colors.bg.surface,
                              borderRadius: DESIGN.radius.lg,
                              border: `1px solid ${DESIGN.colors.brand.primary}30`,
                            }}>
                              <div>
                                <div style={{
                                  fontSize: DESIGN.typography.size.xs,
                                  color: DESIGN.colors.text.tertiary,
                                  textTransform: 'uppercase',
                                  letterSpacing: DESIGN.typography.letterSpacing.wider,
                                  marginBottom: '4px',
                                }}>
                                  Bot Capital Allocation
                                </div>
                                <div style={{
                                  fontSize: DESIGN.typography.size['2xl'],
                                  fontWeight: DESIGN.typography.weight.bold,
                                  fontFamily: DESIGN.typography.fontFamily.mono,
                                  color: DESIGN.colors.brand.primary,
                                }}>
                                  ${botCapital.toLocaleString('en-US')}
                                </div>
                              </div>
                              <Button variant="secondary" size="sm">
                                Edit Amount
                              </Button>
                            </div>
                            
                            {/* Strategy Sliders */}
                            {STRATEGIES.map(strategy => (
                              <AllocationSlider
                                key={strategy.id}
                                strategy={strategy}
                                allocation={strategyAllocations[strategy.id] || 0}
                                onChange={(value) => setStrategyAllocations(prev => ({ ...prev, [strategy.id]: value }))}
                                disabled={botStatus.running}
                                botCapital={botCapital}
                              />
                            ))}
                            
                            {/* Allocation Summary */}
                            <div style={{ marginTop: '24px' }}>
                              <AllocationSummary allocations={strategyAllocations} botCapital={botCapital} />
                            </div>
                            
                            {/* Action Buttons */}
                            <div style={{
                              display: 'flex',
                              gap: '12px',
                              marginTop: '24px',
                            }}>
                              <Button
                                variant="primary"
                                style={{ flex: 1 }}
                                disabled={Object.values(strategyAllocations).reduce((a, b) => a + b, 0) > 100}
                              >
                                Save Allocation
                              </Button>
                              <Button
                                variant={botStatus.running ? 'danger' : 'success'}
                                style={{ flex: 1 }}
                                onClick={botStatus.running ? handleStopBot : handleStartBot}
                                disabled={Object.values(strategyAllocations).reduce((a, b) => a + b, 0) > 100}
                              >
                                {botStatus.running ? 'Stop Bot' : 'Start Bot'}
                              </Button>
                            </div>
                            
                            {botStatus.running && (
                              <div style={{
                                marginTop: '16px',
                                padding: '12px 16px',
                                backgroundColor: DESIGN.colors.accent.amberGlow,
                                borderRadius: DESIGN.radius.md,
                                fontSize: DESIGN.typography.size.sm,
                                color: DESIGN.colors.accent.amber,
                                textAlign: 'center',
                              }}>
                                ⚠️ Stop the bot to modify strategy allocations
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* History Tab */}
                        {tradingSubTab === 'history' && (
                          <div>
                            {trades.length > 0 ? (
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr>
                                      {['Time', 'Symbol', 'Side', 'Qty', 'Price', 'Status'].map(h => (
                                        <th key={h} style={{
                                          padding: '12px 16px',
                                          textAlign: 'left',
                                          fontSize: DESIGN.typography.size.xs,
                                          fontWeight: DESIGN.typography.weight.semibold,
                                          color: DESIGN.colors.text.tertiary,
                                          textTransform: 'uppercase',
                                          letterSpacing: DESIGN.typography.letterSpacing.wider,
                                          borderBottom: `1px solid ${DESIGN.colors.border.subtle}`,
                                        }}>
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {trades.slice(0, 50).map((trade, idx) => (
                                      <tr key={idx} style={{ borderBottom: `1px solid ${DESIGN.colors.border.subtle}` }}>
                                        <td style={{ padding: '16px', fontSize: DESIGN.typography.size.sm, color: DESIGN.colors.text.tertiary }}>
                                          {formatDate(trade.created_at)}
                                        </td>
                                        <td style={{ padding: '16px', fontWeight: DESIGN.typography.weight.semibold, color: DESIGN.colors.brand.primary }}>
                                          {trade.symbol}
                                        </td>
                                        <td style={{ 
                                          padding: '16px',
                                          color: trade.side === 'buy' ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss,
                                          fontWeight: DESIGN.typography.weight.semibold,
                                          textTransform: 'uppercase',
                                        }}>
                                          {trade.side}
                                        </td>
                                        <td style={{ padding: '16px', fontFamily: DESIGN.typography.fontFamily.mono }}>{trade.qty}</td>
                                        <td style={{ padding: '16px', fontFamily: DESIGN.typography.fontFamily.mono }}>
                                          {trade.price > 0 ? formatCurrency(trade.price) : 'Market'}
                                        </td>
                                        <td style={{ padding: '16px', textTransform: 'capitalize' }}>{trade.status}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '60px', color: DESIGN.colors.text.tertiary }}>
                                <Clock size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                                <div>No trade history yet</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* Research / Intelligence */}
              {activeTab === 'research' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <IntelligenceCommandCenter />
                </div>
              )}

              {/* Analytics */}
              {activeTab === 'analytics' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <Card>
                      <Metric 
                        label="Total P&L" 
                        value={totalPnL} 
                        prefix="$" 
                        size="lg"
                        color={totalPnL >= 0 ? DESIGN.colors.semantic.profit : DESIGN.colors.semantic.loss}
                      />
                    </Card>
                    <Card>
                      <Metric label="Open Positions" value={positions.length} size="lg" />
                    </Card>
                    <Card>
                      <Metric label="Total Trades" value={trades.length} size="lg" />
                    </Card>
                  </div>

                  <Card>
                    <SectionHeader icon={BarChart3} title="Trades by Symbol" />
                    {trades.length > 0 ? (
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(trades.reduce((acc, t) => {
                            acc[t.symbol] = (acc[t.symbol] || 0) + 1;
                            return acc;
                          }, {})).map(([symbol, count]) => ({ symbol, count }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke={DESIGN.colors.border.subtle} vertical={false} />
                            <XAxis dataKey="symbol" stroke={DESIGN.colors.text.tertiary} fontSize={11} />
                            <YAxis stroke={DESIGN.colors.text.tertiary} fontSize={11} />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: DESIGN.colors.bg.elevated,
                                border: `1px solid ${DESIGN.colors.border.default}`,
                                borderRadius: DESIGN.radius.md,
                              }}
                            />
                            <Bar dataKey="count" fill={DESIGN.colors.brand.primary} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px', color: DESIGN.colors.text.tertiary }}>
                        No trade data
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
