import React, { useState } from 'react';
import { 
  Settings, Cpu, Cloud, Wifi, Bell, 
  Download, Upload, RotateCcw, Check, ShieldCheck, Database 
} from 'lucide-react';

export default function SettingsPage({ 
  config, 
  setConfig, 
  alerts, 
  setAlerts, 
  tempUnit, 
  setTempUnit, 
  resetToDefaults, 
  exportConfigJson, 
  importConfigJson 
}) {
  const [saveToast, setSaveToast] = useState(false);

  const handleSaveSettings = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        
        {/* 1. Hardware & Sensor Sampling Config */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} style={{ color: 'var(--primary-green)' }} />
            <span>Hardware & Sensor Parameters</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">SHT45 Sampling Rate</label>
              <select
                className="form-input"
                value={config.hardwareSamplingSec}
                onChange={(e) => setConfig({ ...config, hardwareSamplingSec: Number(e.target.value) })}
              >
                <option value={2}>Every 2 Seconds (High Precision)</option>
                <option value={5}>Every 5 Seconds (Recommended)</option>
                <option value={10}>Every 10 Seconds</option>
                <option value={30}>Every 30 Seconds (Low Power)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">SD Card Log Interval</label>
              <select
                className="form-input"
                value={config.logIntervalMin}
                onChange={(e) => setConfig({ ...config, logIntervalMin: Number(e.target.value) })}
              >
                <option value={5}>Every 5 Minutes</option>
                <option value={15}>Every 15 Minutes (Standard)</option>
                <option value={30}>Every 30 Minutes</option>
                <option value={60}>Every 60 Minutes</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">RTC Clock Re-sync Interval</label>
              <select
                className="form-input"
                value={config.rtcSyncHr}
                onChange={(e) => setConfig({ ...config, rtcSyncHr: Number(e.target.value) })}
              >
                <option value={12}>Every 12 Hours</option>
                <option value={24}>Every 24 Hours (DS3231 Auto)</option>
                <option value={48}>Every 48 Hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Cloud DB & Version Safety */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cloud size={18} style={{ color: 'var(--wood-accent)' }} />
            <span>Cloud Database & Version Sync</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Config Version:</span>
              <strong style={{ color: 'var(--primary-green)' }}>v{config.version}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sync Safety Status:</span>
              <span className="badge badge-active">
                <ShieldCheck size={12} /> {config.cloudStatus}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Last Synchronization:</span>
              <span style={{ fontWeight: 500 }}>{config.lastSynced}</span>
            </div>

            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label className="form-label">Cloud Database Endpoint</label>
              <input
                type="text"
                className="form-input"
                value="https://api.mycofarm.local/v1/sync"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* 3. Alert & Threshold Rules */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} style={{ color: 'var(--wood-accent)' }} />
            <span>Environmental Alert Rules</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">High Temp Alert (°C)</label>
              <input
                type="number"
                className="form-input"
                value={alerts.tempHigh}
                onChange={(e) => setAlerts({ ...alerts, tempHigh: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Low Temp Alert (°C)</label>
              <input
                type="number"
                className="form-input"
                value={alerts.tempLow}
                onChange={(e) => setAlerts({ ...alerts, tempLow: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">High Humidity Alert (%)</label>
              <input
                type="number"
                className="form-input"
                value={alerts.humidHigh}
                onChange={(e) => setAlerts({ ...alerts, humidHigh: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Low Humidity Alert (%)</label>
              <input
                type="number"
                className="form-input"
                value={alerts.humidLow}
                onChange={(e) => setAlerts({ ...alerts, humidLow: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Sound Alerts</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={alerts.soundAlert}
                onChange={(e) => setAlerts({ ...alerts, soundAlert: e.target.checked })}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

      </div>

      {/* 5. System Preferences & Backup Actions */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Configuration Management</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Export, import, or reset farm parameters</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={exportConfigJson} className="btn btn-secondary">
            <Download size={16} />
            <span>Export JSON</span>
          </button>

          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={16} />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={importConfigJson} style={{ display: 'none' }} />
          </label>

          <button onClick={resetToDefaults} className="btn btn-secondary" style={{ color: '#C0392B', borderColor: '#F5C6CB' }}>
            <RotateCcw size={16} />
            <span>Reset Defaults</span>
          </button>

          <button onClick={handleSaveSettings} className="btn btn-primary">
            {saveToast ? (
              <>
                <Check size={16} />
                <span>Settings Saved</span>
              </>
            ) : (
              <span>Save Settings</span>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
