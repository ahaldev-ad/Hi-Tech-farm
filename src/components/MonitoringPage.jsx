import React, { useState } from 'react';
import { 
  Thermometer, Droplets, Fan, Snowflake, 
  HardDrive, Clock, Cpu, ArrowUpRight, 
  AlertCircle, Info 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function MonitoringPage({ 
  currentMetrics, 
  historicalData, 
  humidifier, 
  fan, 
  cooling, 
  tempUnit,
  eventLogs,
  alerts,
  activeAlerts = []
}) {
  const [chartTimeframe, setChartTimeframe] = useState('24h');

  // Convert temp based on unit
  const formatTemp = (valInC) => {
    if (tempUnit === 'F') {
      return ((valInC * 9 / 5) + 32).toFixed(1);
    }
    return valInC.toFixed(1);
  };

  // Filter historical data based on timeframe
  const filteredData = historicalData[chartTimeframe] || historicalData['24h'];

  // Alert check flags
  const isTempAlert = currentMetrics.temp > alerts.tempHigh || currentMetrics.temp < alerts.tempLow;
  const isHumidAlert = currentMetrics.humidity > alerts.humidHigh || currentMetrics.humidity < alerts.humidLow;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 0. Real-time Active Warning Alert Banners */}
      {activeAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeAlerts.map((alert, idx) => (
            <div key={idx} style={{
              padding: '0.75rem 1rem',
              background: '#FFF3CD',
              border: '1px solid #FFEBAA',
              borderRadius: 'var(--radius-sm)',
              color: '#856404',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <AlertCircle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 1. Live Primary Environmental Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        
        {/* Temperature Card */}
        <div className="card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justify: 'space-between', 
          position: 'relative', 
          overflow: 'hidden',
          borderColor: isTempAlert ? '#FFE4B3' : 'var(--border-color)',
          background: isTempAlert ? '#FFFDF8' : 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                padding: '0.625rem',
                borderRadius: 'var(--radius-sm)',
                background: isTempAlert ? '#FFF6E5' : 'var(--wood-accent-light)',
                color: isTempAlert ? '#D97706' : 'var(--wood-accent)'
              }}>
                <Thermometer size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ambient Temperature</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Alert Limit: {formatTemp(alerts.tempLow)}° - {formatTemp(alerts.tempHigh)}°{tempUnit}</div>
              </div>
            </div>
            
            {isTempAlert ? (
              <span className="badge badge-warning">
                <AlertCircle size={12} /> {currentMetrics.temp > alerts.tempHigh ? 'High Temp' : 'Low Temp'}
              </span>
            ) : (
              <span className="badge badge-active" style={{ background: '#F8F4EE', color: 'var(--wood-accent)', border: '1px solid #EADBCE' }}>
                Optimal
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: isTempAlert ? '#D97706' : 'var(--text-main)', lineHeight: 1 }}>
              {formatTemp(currentMetrics.temp)}
            </span>
            <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              °{tempUnit}
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <ArrowUpRight size={14} style={{ color: isTempAlert ? '#D97706' : '#27AE60' }} />
            <span>Telemetry Live Stream</span>
          </div>
        </div>

        {/* Humidity Card */}
        <div className="card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justify: 'space-between',
          borderColor: isHumidAlert ? '#FFE4B3' : 'var(--border-color)',
          background: isHumidAlert ? '#FFFDF8' : 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                padding: '0.625rem',
                borderRadius: 'var(--radius-sm)',
                background: isHumidAlert ? '#FFF6E5' : 'var(--primary-green-light)',
                color: isHumidAlert ? '#D97706' : 'var(--primary-green)'
              }}>
                <Droplets size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Relative Humidity</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Alert Limit: {alerts.humidLow}% - {alerts.humidHigh}% RH</div>
              </div>
            </div>

            {isHumidAlert ? (
              <span className="badge badge-warning">
                <AlertCircle size={12} /> {currentMetrics.humidity > alerts.humidHigh ? 'High RH' : 'Low RH'}
              </span>
            ) : (
              <span className="badge badge-active">
                Optimal
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: isHumidAlert ? '#D97706' : 'var(--text-main)', lineHeight: 1 }}>
              {currentMetrics.humidity.toFixed(1)}
            </span>
            <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              % RH
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            <span>SHT45 Precision Sensor Active</span>
          </div>
        </div>

      </div>

      {/* 2. Accurate Live Interactive Environmental Trend Line Chart */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Environmental Trends</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Realtime streaming metrics for temperature and humidity</p>
          </div>

          {/* Timeframe Filter Buttons */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-canvas)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            {['1h', '6h', '24h', '7d'].map(tf => (
              <button
                key={tf}
                onClick={() => setChartTimeframe(tf)}
                style={{
                  padding: '0.25rem 0.625rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: chartTimeframe === tf ? 'var(--primary-green)' : 'transparent',
                  color: chartTimeframe === tf ? '#FFFFFF' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Chart with Dynamic Data Scales */}
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="humidityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2D5A27" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2D5A27" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8C6D46" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#8C6D46" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE5" vertical={false} />
              <XAxis dataKey="time" stroke="#8E998D" fontSize={11} tickLine={false} />
              <YAxis yAxisId="left" domain={['dataMin - 4', 'dataMax + 4']} stroke="#2D5A27" fontSize={11} tickLine={false} unit="%" />
              <YAxis yAxisId="right" orientation="right" domain={['dataMin - 2', 'dataMax + 2']} stroke="#8C6D46" fontSize={11} tickLine={false} unit={`°${tempUnit}`} />
              <Tooltip 
                contentStyle={{ 
                  background: '#FFFFFF', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  fontSize: '0.75rem',
                  boxShadow: 'var(--shadow-md)'
                }} 
              />
              <Area yAxisId="left" type="monotone" dataKey="humidity" name="Humidity (% RH)" stroke="#2D5A27" strokeWidth={2.2} fillOpacity={1} fill="url(#humidityGrad)" />
              <Area yAxisId="right" type="monotone" dataKey={tempUnit === 'F' ? 'tempF' : 'temp'} name={`Temp (°${tempUnit})`} stroke="#8C6D46" strokeWidth={2.2} fillOpacity={1} fill="url(#tempGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: 10, height: 10, background: '#2D5A27', borderRadius: 2 }} />
            <span>Humidity (% RH)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: 10, height: 10, background: '#8C6D46', borderRadius: 2 }} />
            <span>Temperature (°{tempUnit})</span>
          </div>
        </div>
      </div>

      {/* 3. Actuator Status Summary Cards */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Actuator Status Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          
          {/* Humidifier */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.625rem',
                borderRadius: 'var(--radius-sm)',
                background: humidifier.status === 'ACTIVE' ? 'var(--primary-green-light)' : 'var(--bg-subtle)',
                color: humidifier.status === 'ACTIVE' ? 'var(--primary-green)' : 'var(--text-muted)'
              }}>
                <Droplets size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Humidifier</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mode: {humidifier.mode}</div>
              </div>
            </div>
            <span className={`badge ${humidifier.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
              {humidifier.status}
            </span>
          </div>

          {/* Exhaust Fan */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.625rem',
                borderRadius: 'var(--radius-sm)',
                background: fan.status === 'ACTIVE' ? 'var(--primary-green-light)' : 'var(--bg-subtle)',
                color: fan.status === 'ACTIVE' ? 'var(--primary-green)' : 'var(--text-muted)'
              }}>
                <Fan size={20} style={{ animation: fan.status === 'ACTIVE' ? 'spin 3s linear infinite' : 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Exhaust Fan</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Mode: {fan.mode}
                </div>
              </div>
            </div>
            <span className={`badge ${fan.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
              {fan.status}
            </span>
          </div>

          {/* Cooling System */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.625rem',
                borderRadius: 'var(--radius-sm)',
                background: cooling.status === 'ACTIVE' ? 'var(--primary-green-light)' : 'var(--bg-subtle)',
                color: cooling.status === 'ACTIVE' ? 'var(--primary-green)' : 'var(--text-muted)'
              }}>
                <Snowflake size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cooling System</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mode: MANUAL</div>
              </div>
            </div>
            <span className={`badge ${cooling.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
              {cooling.status}
            </span>
          </div>

        </div>
      </div>

      {/* 4. System & Hardware Diagnostics + Live Event Log */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        
        {/* Hardware Health Grid */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} style={{ color: 'var(--primary-green)' }} />
            <span>Hardware Health</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            
            {/* SD Card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <HardDrive size={16} />
                <span>SD Card Logging</span>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                OK (3.8 GB Free)
              </div>
            </div>

            {/* RTC Clock */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Clock size={16} />
                <span>RTC Clock Sync</span>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                Synced (DS3231)
              </div>
            </div>

            {/* SHT45 Sensor */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Droplets size={16} />
                <span>SHT45 Sensor</span>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--sage-badge-text)' }}>
                High Precision Ready
              </div>
            </div>

          </div>
        </div>

        {/* Realtime Event Stream */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} style={{ color: 'var(--wood-accent)' }} />
            <span>Realtime Event Stream</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '170px', overflowY: 'auto' }}>
            {eventLogs.map((log, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.625rem',
                fontSize: '0.75rem',
                paddingBottom: '0.625rem',
                borderBottom: index !== eventLogs.length - 1 ? '1px solid var(--border-subtle)' : 'none'
              }}>
                <span style={{ color: 'var(--text-light)', fontFamily: 'monospace', minWidth: '55px' }}>{log.time}</span>
                <div style={{ flex: 1, color: 'var(--text-main)' }}>{log.message}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
