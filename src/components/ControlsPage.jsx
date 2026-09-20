import React from 'react';
import { 
  Droplets, Fan, Snowflake, Sparkles, 
  Save, Check, ShieldCheck 
} from 'lucide-react';

export default function ControlsPage({ 
  preset, 
  customValues,
  applyPreset, 
  humidifier, 
  setHumidifier, 
  fan, 
  setFan, 
  cooling, 
  setCooling, 
  handleParamChange,
  handleInstantToggle,
  hasUnsavedChanges,
  saveConfig, 
  configVersion, 
  isSaveSuccess 
}) {

  const presets = [
    { id: 'colonization', name: 'Colonization', humidOn: 80, humidOff: 90, fanOn: 5, fanOff: 15 },
    { id: 'fruiting', name: 'Fruiting', humidOn: 88, humidOff: 95, fanOn: 10, fanOff: 10 },
    { id: 'harvest', name: 'Harvest', humidOn: 75, humidOff: 90, fanOn: 5, fanOff: 20 },
    { id: 'custom', name: 'Custom', humidOn: customValues.humidOn, humidOff: customValues.humidOff, fanOn: customValues.fanOn, fanOff: customValues.fanOff }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Minimal Preset Selector */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Sparkles size={16} style={{ color: 'var(--primary-green)' }} />
            <span>Cultivation Phase Preset</span>
          </div>
          <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
            {preset.toUpperCase()}
          </span>
        </div>

        {/* Compact Segmented Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.625rem' }}>
          {presets.map(p => {
            const isSelected = preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                style={{
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: isSelected ? '1.5px solid var(--primary-green)' : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--primary-green-light)' : 'var(--bg-canvas)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: isSelected ? 'var(--primary-green)' : 'var(--text-main)' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {p.humidOn}-{p.humidOff}% RH • {p.fanOn}/{p.fanOff}m
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Actuator Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        
        {/* Ultrasonic Humidifier */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--primary-green-light)', color: 'var(--primary-green)' }}>
                <Droplets size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Humidifier</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ultrasonic Regulation</span>
              </div>
            </div>

            {/* Compact Mode Switch */}
            <div style={{ display: 'flex', background: 'var(--bg-canvas)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {['AUTO', 'MANUAL'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setHumidifier({ ...humidifier, mode })}
                  style={{
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: humidifier.mode === mode ? 'var(--primary-green)' : 'transparent',
                    color: humidifier.mode === mode ? '#FFFFFF' : 'var(--text-muted)'
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {humidifier.mode === 'AUTO' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">ON Threshold (%)</label>
                <input
                  type="number"
                  min="50"
                  max="99"
                  className="form-input"
                  value={humidifier.onThreshold}
                  onChange={(e) => handleParamChange('humidifier', 'onThreshold', Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">OFF Threshold (%)</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  className="form-input"
                  value={humidifier.offThreshold}
                  onChange={(e) => handleParamChange('humidifier', 'offThreshold', Number(e.target.value))}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Manual Power (Instant)</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={humidifier.manualState}
                  onChange={(e) => handleInstantToggle('humidifier', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          )}
        </div>

        {/* Exhaust Fan */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--primary-green-light)', color: 'var(--primary-green)' }}>
                <Fan size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Exhaust Fan</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Air Exchange</span>
              </div>
            </div>

            <div style={{ display: 'flex', background: 'var(--bg-canvas)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {['TIMER', 'MANUAL'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setFan({ ...fan, mode })}
                  style={{
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: fan.mode === mode ? 'var(--primary-green)' : 'transparent',
                    color: fan.mode === mode ? '#FFFFFF' : 'var(--text-muted)'
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {fan.mode === 'TIMER' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">ON Duration (m)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    className="form-input"
                    value={fan.onDuration}
                    onChange={(e) => handleParamChange('fan', 'onDuration', Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">OFF Duration (m)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    className="form-input"
                    value={fan.offDuration}
                    onChange={(e) => handleParamChange('fan', 'offDuration', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Manual Power (Instant)</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={fan.manualState}
                  onChange={(e) => handleInstantToggle('fan', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          )}
        </div>

        {/* Cooling System */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--wood-accent-light)', color: 'var(--wood-accent)' }}>
                <Snowflake size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Cooling System</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MANUAL Switch</span>
              </div>
            </div>
            <span className={`badge ${cooling.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: '0.7rem' }}>
              {cooling.status}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Cooling Power (Instant)</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={cooling.status === 'ACTIVE'}
                onChange={(e) => handleInstantToggle('cooling', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

      </div>

      {/* 3. Conditional Save Action Bar */}
      {hasUnsavedChanges && (
        <div className="card" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justify: 'space-between', 
          padding: '0.875rem 1.25rem',
          border: '1.5px solid var(--primary-green-border)',
          background: 'var(--primary-green-light)',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <ShieldCheck size={18} style={{ color: 'var(--primary-green)' }} />
            <span style={{ color: 'var(--primary-green)', fontWeight: 600 }}>Unsaved custom parameters pending!</span>
          </div>

          <button
            onClick={saveConfig}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1.125rem', fontSize: '0.8125rem' }}
          >
            {isSaveSuccess ? (
              <>
                <Check size={16} />
                <span>Saved v{configVersion}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save & Apply</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
