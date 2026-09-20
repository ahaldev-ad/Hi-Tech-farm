import React from 'react';
import { Sprout, Wifi, ShieldCheck, RefreshCw } from 'lucide-react';

export default function Header({ configVersion, isSyncing, activeTab, setActiveTab }) {
  return (
    <header style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '0.75rem 1.25rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {/* Brand & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--primary-green-light)',
            border: '1px solid var(--primary-green-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-green)'
          }}>
            <Sprout size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Paradise Mushroom
              </h1>
              <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                <span className="live-dot" /> Online
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Hi-Tech Farm Dashboard
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav style={{
          display: 'none',
          alignItems: 'center',
          gap: '0.375rem',
          background: 'var(--bg-canvas)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }} className="desktop-nav-tabs">
          {[
            { id: 'monitoring', label: 'Live Monitoring' },
            { id: 'control', label: 'Actuator Control' },
            { id: 'settings', label: 'System Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === tab.id ? 'var(--primary-green)' : 'transparent',
                color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-muted)',
                boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* System Meta & Config Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Config Version Sync Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.75rem',
            background: 'var(--wood-accent-light)',
            border: '1px solid #E6DDD0',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            color: 'var(--wood-accent)',
            fontWeight: 600
          }}>
            <ShieldCheck size={14} />
            <span>Config {configVersion}</span>
            {isSyncing && <RefreshCw size={12} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav-tabs {
            display: flex !important;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
