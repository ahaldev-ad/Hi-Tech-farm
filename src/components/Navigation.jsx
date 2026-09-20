import React from 'react';
import { Activity, Sliders, Settings } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'control', label: 'Controls', icon: Sliders },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      paddingTop: '6px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 50,
      boxShadow: '0 -4px 16px rgba(36, 43, 35, 0.06)'
    }} className="mobile-bottom-nav">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '6px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              border: 'none',
              background: 'transparent',
              color: isActive ? 'var(--primary-green)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.75rem',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              padding: '2px 14px',
              borderRadius: '12px',
              background: isActive ? 'var(--primary-green-light)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}

      <style>{`
        @media (min-width: 768px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
