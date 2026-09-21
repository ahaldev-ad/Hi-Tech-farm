import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import MonitoringPage from './components/MonitoringPage';
import ControlsPage from './components/ControlsPage';
import SettingsPage from './components/SettingsPage';
import AdminAuthModal from './components/AdminAuthModal';
import { db, ref, onValue, set } from './firebase';
import { registerServiceWorker, sendPhonePushNotification } from './utils/notification';

// Helper to generate base historical trend data up to current time
const generateInitialData = (currentTemp, currentHumidity) => {
  const now = new Date();
  const points1h = [];
  const points6h = [];
  const points24h = [];
  const points7d = [];

  // Generate 6 points for 1h (every 10 mins)
  for (let i = 5; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 10 * 60 * 1000);
    const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempVal = Number((currentTemp + (Math.random() - 0.5) * 0.8).toFixed(1));
    const humidVal = Number((currentHumidity + (Math.random() - 0.5) * 2.5).toFixed(1));
    points1h.push({
      time: timeStr,
      temp: tempVal,
      tempF: Number(((tempVal * 9 / 5) + 32).toFixed(1)),
      humidity: humidVal
    });
  }

  // Generate 6 points for 6h (every 1 hr)
  for (let i = 5; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 60 * 60 * 1000);
    const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempVal = Number((currentTemp + (Math.random() - 0.5) * 1.5).toFixed(1));
    const humidVal = Number((currentHumidity + (Math.random() - 0.5) * 4.0).toFixed(1));
    points6h.push({
      time: timeStr,
      temp: tempVal,
      tempF: Number(((tempVal * 9 / 5) + 32).toFixed(1)),
      humidity: humidVal
    });
  }

  // Generate 8 points for 24h
  for (let i = 7; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3 * 60 * 60 * 1000);
    const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempVal = Number((currentTemp + (Math.random() - 0.5) * 2.0).toFixed(1));
    const humidVal = Number((currentHumidity + (Math.random() - 0.5) * 5.0).toFixed(1));
    points24h.push({
      time: timeStr,
      temp: tempVal,
      tempF: Number(((tempVal * 9 / 5) + 32).toFixed(1)),
      humidity: humidVal
    });
  }

  // 7d points
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = days[t.getDay()];
    const tempVal = Number((currentTemp + (Math.random() - 0.5) * 2.5).toFixed(1));
    const humidVal = Number((currentHumidity + (Math.random() - 0.5) * 6.0).toFixed(1));
    points7d.push({
      time: dayStr,
      temp: tempVal,
      tempF: Number(((tempVal * 9 / 5) + 32).toFixed(1)),
      humidity: humidVal
    });
  }

  return {
    '1h': points1h,
    '6h': points6h,
    '24h': points24h,
    '7d': points7d
  };
};

// Web Audio API Beep helper for audible alerts
const playBeepChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Audio autoplay policy
  }
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('paradise_admin_authenticated') === 'true');
  const [activeTab, setActiveTab] = useState('monitoring');
  const [tempUnit, setTempUnit] = useState('C');
  const [preset, setPreset] = useState('fruiting');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Custom preset values store
  const [customValues, setCustomValues] = useState({
    humidOn: 88,
    humidOff: 95,
    fanOn: 10,
    fanOff: 10
  });

  // Live Metrics State
  const [currentMetrics, setCurrentMetrics] = useState({
    temp: 22.4,
    humidity: 89.2
  });

  // Historical Chart Data (Live updating stream)
  const [historicalData, setHistoricalData] = useState(() => generateInitialData(22.4, 89.2));

  // Actuator States
  const [humidifier, setHumidifier] = useState({
    mode: 'AUTO',
    status: 'ACTIVE',
    onThreshold: 88,
    offThreshold: 95,
    manualState: true
  });

  const [fan, setFan] = useState({
    mode: 'TIMER',
    status: 'ACTIVE',
    phase: 'ACTIVE',
    onDuration: 10,
    offDuration: 10,
    remainingSeconds: 412,
    manualState: true
  });

  const [cooling, setCooling] = useState({
    mode: 'MANUAL',
    status: 'OFF'
  });

  // Configuration & Versioning
  const [config, setConfig] = useState({
    version: 3,
    lastSynced: 'Just now',
    cloudStatus: 'Firebase Connected',
    hardwareSamplingSec: 5,
    logIntervalMin: 15,
    rtcSyncHr: 24
  });

  // Environmental Alert Threshold Rules
  const [alerts, setAlerts] = useState({
    tempHigh: 26,
    tempLow: 18,
    humidHigh: 98,
    humidLow: 75,
    soundAlert: true
  });

  // Event Logs Stream
  const [eventLogs, setEventLogs] = useState([
    { time: '18:12', message: 'Firebase Realtime Database initialized.' },
    { time: '18:05', message: 'SHT45 sensor telemetry synchronized with cloud database.' },
    { time: '17:50', message: 'Exhaust Fan switched to ACTIVE phase (10 min duration).' },
    { time: '17:30', message: 'System boot completed cleanly (Firmware v2.4.1).' }
  ]);

  // Register Service Worker for phone push notifications on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Audio alert throttle ref
  const lastAudioAlertTime = useRef(0);

  // Evaluated Active Alerts
  const activeAlerts = [];
  if (currentMetrics.temp > alerts.tempHigh) {
    activeAlerts.push({ type: 'temp', level: 'HIGH', message: `High Temp Alert: ${currentMetrics.temp.toFixed(1)}°C exceeds limit (${alerts.tempHigh}°C)` });
  } else if (currentMetrics.temp < alerts.tempLow) {
    activeAlerts.push({ type: 'temp', level: 'LOW', message: `Low Temp Alert: ${currentMetrics.temp.toFixed(1)}°C is below limit (${alerts.tempLow}°C)` });
  }

  if (currentMetrics.humidity > alerts.humidHigh) {
    activeAlerts.push({ type: 'humidity', level: 'HIGH', message: `High Humidity Alert: ${currentMetrics.humidity.toFixed(1)}% RH exceeds limit (${alerts.humidHigh}%)` });
  } else if (currentMetrics.humidity < alerts.humidLow) {
    activeAlerts.push({ type: 'humidity', level: 'LOW', message: `Low Humidity Alert: ${currentMetrics.humidity.toFixed(1)}% RH is below limit (${alerts.humidLow}%)` });
  }

  // Sound & Phone Push Alert Trigger when threshold violated
  useEffect(() => {
    if (activeAlerts.length > 0) {
      const now = Date.now();
      if (now - lastAudioAlertTime.current > 10000) {
        if (alerts.soundAlert) {
          playBeepChime();
        }
        sendPhonePushNotification('⚠️ Paradise Mushroom Alert', activeAlerts[0].message);
        lastAudioAlertTime.current = now;
      }
    }
  }, [currentMetrics, alerts.soundAlert, activeAlerts.length]);

  // Helper to append real data point to historical charts
  const updateHistoricalCharts = (newTemp, newHumidity) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newPoint = {
      time: timeStr,
      temp: Number(newTemp.toFixed(1)),
      tempF: Number(((newTemp * 9 / 5) + 32).toFixed(1)),
      humidity: Number(newHumidity.toFixed(1))
    };

    setHistoricalData(prev => {
      const updated1h = [...(prev['1h'] || []), newPoint].slice(-15);
      const updated6h = [...(prev['6h'] || []), newPoint].slice(-20);
      const updated24h = [...(prev['24h'] || []), newPoint].slice(-25);
      const updated7d = [...(prev['7d'] || [])];
      return {
        '1h': updated1h,
        '6h': updated6h,
        '24h': updated24h,
        '7d': updated7d
      };
    });
  };

  // Firebase Realtime Listeners
  useEffect(() => {
    const metricsRef = ref(db, 'farm/metrics');
    const unsubscribeMetrics = onValue(metricsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.temp === 'number' && typeof data.humidity === 'number') {
        setCurrentMetrics({
          temp: data.temp,
          humidity: data.humidity
        });
        updateHistoricalCharts(data.temp, data.humidity);
      }
    });

    const controlsRef = ref(db, 'farm/controls');
    const unsubscribeControls = onValue(controlsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.preset) setPreset(data.preset);
        if (data.humidifier) setHumidifier(data.humidifier);
        if (data.fan) setFan(data.fan);
        if (data.cooling) setCooling(data.cooling);
        if (data.config) setConfig(prev => ({ ...prev, ...data.config, cloudStatus: 'Firebase Synchronized' }));
        if (data.customValues) setCustomValues(data.customValues);
      }
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeControls();
    };
  }, []);

  // Real-time Ticker (Fan Countdown & Chart Telemetry Stream)
  useEffect(() => {
    const timer = setInterval(() => {
      setFan(prevFan => {
        if (prevFan.mode !== 'TIMER') return prevFan;
        if (prevFan.remainingSeconds > 1) {
          return { ...prevFan, remainingSeconds: prevFan.remainingSeconds - 1 };
        } else {
          const nextPhase = prevFan.phase === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          const nextDuration = nextPhase === 'ACTIVE' ? prevFan.onDuration : prevFan.offDuration;
          return {
            ...prevFan,
            phase: nextPhase,
            status: nextPhase === 'ACTIVE' ? 'ACTIVE' : 'OFF',
            remainingSeconds: nextDuration * 60
          };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Instant Manual Switch Toggle Handler
  const handleInstantToggle = async (actuator, isChecked) => {
    let updatedHumidifier = humidifier;
    let updatedFan = fan;
    let updatedCooling = cooling;

    if (actuator === 'humidifier') {
      updatedHumidifier = { ...humidifier, manualState: isChecked, status: isChecked ? 'ACTIVE' : 'OFF' };
      setHumidifier(updatedHumidifier);
      await set(ref(db, 'farm/controls/humidifier'), updatedHumidifier);
    } else if (actuator === 'fan') {
      updatedFan = { ...fan, manualState: isChecked, status: isChecked ? 'ACTIVE' : 'OFF' };
      setFan(updatedFan);
      await set(ref(db, 'farm/controls/fan'), updatedFan);
    } else if (actuator === 'cooling') {
      updatedCooling = { ...cooling, status: isChecked ? 'ACTIVE' : 'OFF' };
      setCooling(updatedCooling);
      await set(ref(db, 'farm/controls/cooling'), updatedCooling);
    }
  };

  // Preset Selection Handler
  const applyPreset = (selectedPreset) => {
    setPreset(selectedPreset.id);
    setHasUnsavedChanges(true);

    if (selectedPreset.id === 'custom') {
      setHumidifier(prev => ({
        ...prev,
        onThreshold: customValues.humidOn,
        offThreshold: customValues.humidOff
      }));
      setFan(prev => ({
        ...prev,
        onDuration: customValues.fanOn,
        offDuration: customValues.fanOff,
        remainingSeconds: customValues.fanOn * 60
      }));
    } else {
      setHumidifier(prev => ({
        ...prev,
        onThreshold: selectedPreset.humidOn,
        offThreshold: selectedPreset.humidOff
      }));
      setFan(prev => ({
        ...prev,
        onDuration: selectedPreset.fanOn,
        offDuration: selectedPreset.fanOff,
        remainingSeconds: selectedPreset.fanOn * 60,
        phase: 'ACTIVE',
        status: 'ACTIVE'
      }));
    }
  };

  // Parameter Change Handler: Auto-switch preset to 'custom' and save customized values
  const handleParamChange = (actuator, field, value) => {
    setPreset('custom');
    setHasUnsavedChanges(true);

    if (actuator === 'humidifier') {
      const updatedHumidifier = { ...humidifier, [field]: value };
      setHumidifier(updatedHumidifier);
      setCustomValues(prev => ({
        ...prev,
        humidOn: field === 'onThreshold' ? value : prev.humidOn,
        humidOff: field === 'offThreshold' ? value : prev.humidOff
      }));
    } else if (actuator === 'fan') {
      const updatedFan = { ...fan, [field]: value };
      setFan(updatedFan);
      setCustomValues(prev => ({
        ...prev,
        fanOn: field === 'onDuration' ? value : prev.fanOn,
        fanOff: field === 'offDuration' ? value : prev.fanOff
      }));
    }
  };

  // Save Configuration & Firebase Sync Engine
  const saveConfig = async () => {
    setIsSyncing(true);
    setIsSaveSuccess(false);

    try {
      const nextVersion = config.version + 1;
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const newConfigObj = {
        version: nextVersion,
        lastSynced: `Synced at ${nowTime}`,
        cloudStatus: 'Firebase Synchronized',
        hardwareSamplingSec: config.hardwareSamplingSec,
        logIntervalMin: config.logIntervalMin,
        rtcSyncHr: config.rtcSyncHr
      };

      const payload = {
        preset,
        customValues,
        humidifier,
        fan,
        cooling,
        config: newConfigObj,
        alerts
      };

      await set(ref(db, 'farm/controls'), payload);
      await set(ref(db, 'farm/metrics'), {
        temp: currentMetrics.temp,
        humidity: currentMetrics.humidity,
        timestamp: Date.now()
      });

      setConfig(newConfigObj);
      setHasUnsavedChanges(false);

      setEventLogs(prev => [
        { time: nowTime, message: `Config v${nextVersion} (Preset: ${preset}) synced to Firebase.` },
        ...prev
      ]);

      setIsSaveSuccess(true);
      setTimeout(() => setIsSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Firebase sync error:", err);
      alert("Firebase sync failed. Please check network connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Lock session handler
  const handleLockSession = () => {
    localStorage.removeItem('paradise_admin_authenticated');
    setIsAuthenticated(false);
  };

  // Export JSON
  const exportConfigJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ config, preset, customValues, humidifier, fan, cooling, alerts }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mushroom_farm_config_v${config.version}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const importConfigJson = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.preset) setPreset(parsed.preset);
          if (parsed.customValues) setCustomValues(parsed.customValues);
          if (parsed.humidifier) setHumidifier(parsed.humidifier);
          if (parsed.fan) setFan(parsed.fan);
          if (parsed.cooling) setCooling(parsed.cooling);
          if (parsed.alerts) setAlerts(parsed.alerts);
          saveConfig();
        } catch (err) {
          alert("Invalid configuration JSON file.");
        }
      };
    }
  };

  // Reset to Defaults
  const resetToDefaults = () => {
    if (window.confirm("Reset all parameters to factory colonization defaults?")) {
      applyPreset({ id: 'colonization', humidOn: 80, humidOff: 90, fanOn: 5, fanOff: 15 });
      saveConfig();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Admin Password Gate Modal */}
      {!isAuthenticated && (
        <AdminAuthModal onAuthenticate={() => setIsAuthenticated(true)} />
      )}

      {/* Header */}
      <Header 
        configVersion={`v${config.version}`}
        isSyncing={isSyncing}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Viewport Container */}
      <main style={{
        flex: 1,
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: '1.25rem 1.25rem 2rem 1.25rem'
      }}>
        {activeTab === 'monitoring' && (
          <MonitoringPage
            currentMetrics={currentMetrics}
            historicalData={historicalData}
            humidifier={humidifier}
            fan={fan}
            cooling={cooling}
            tempUnit={tempUnit}
            eventLogs={eventLogs}
            alerts={alerts}
            activeAlerts={activeAlerts}
          />
        )}

        {activeTab === 'control' && (
          <ControlsPage
            preset={preset}
            customValues={customValues}
            applyPreset={applyPreset}
            humidifier={humidifier}
            setHumidifier={setHumidifier}
            fan={fan}
            setFan={setFan}
            cooling={cooling}
            setCooling={setCooling}
            handleParamChange={handleParamChange}
            handleInstantToggle={handleInstantToggle}
            hasUnsavedChanges={hasUnsavedChanges}
            saveConfig={saveConfig}
            configVersion={config.version}
            isSaveSuccess={isSaveSuccess}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            config={config}
            setConfig={setConfig}
            alerts={alerts}
            setAlerts={setAlerts}
            tempUnit={tempUnit}
            setTempUnit={setTempUnit}
            resetToDefaults={resetToDefaults}
            exportConfigJson={exportConfigJson}
            importConfigJson={importConfigJson}
            handleLockSession={handleLockSession}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
