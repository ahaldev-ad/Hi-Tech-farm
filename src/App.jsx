import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import MonitoringPage from './components/MonitoringPage';
import ControlsPage from './components/ControlsPage';
import SettingsPage from './components/SettingsPage';
import { db, ref, onValue, set } from './firebase';

// Helper to generate realistic historical trend data
const generateMockData = () => {
  const times = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
  return {
    '1h': Array.from({ length: 6 }, (_, i) => ({
      time: `${i * 10}m ago`,
      humidity: Number((88 + Math.random() * 3).toFixed(1)),
      temp: Number((22 + Math.random() * 0.8).toFixed(1)),
      tempF: Number((((22 + Math.random() * 0.8) * 9 / 5) + 32).toFixed(1))
    })),
    '6h': Array.from({ length: 6 }, (_, i) => ({
      time: `${i}h ago`,
      humidity: Number((87 + Math.random() * 4).toFixed(1)),
      temp: Number((21.8 + Math.random() * 1.2).toFixed(1)),
      tempF: Number((((21.8 + Math.random() * 1.2) * 9 / 5) + 32).toFixed(1))
    })),
    '24h': times.map(t => {
      const tempC = Number((21.5 + Math.random() * 1.8).toFixed(1));
      return {
        time: t,
        humidity: Number((86 + Math.random() * 6).toFixed(1)),
        temp: tempC,
        tempF: Number(((tempC * 9 / 5) + 32).toFixed(1))
      };
    }),
    '7d': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
      const tempC = Number((21.0 + Math.random() * 2.2).toFixed(1));
      return {
        time: day,
        humidity: Number((85 + Math.random() * 7).toFixed(1)),
        temp: tempC,
        tempF: Number(((tempC * 9 / 5) + 32).toFixed(1))
      };
    })
  };
};

export default function App() {
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

  // Historical Chart Data
  const [historicalData] = useState(generateMockData());

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

  // Alerts
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

  // Firebase Realtime Listeners
  useEffect(() => {
    // 1. Listen for sensor telemetry updates from hardware
    const metricsRef = ref(db, 'farm/metrics');
    const unsubscribeMetrics = onValue(metricsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.temp === 'number' && typeof data.humidity === 'number') {
        setCurrentMetrics({
          temp: data.temp,
          humidity: data.humidity
        });
      }
    });

    // 2. Listen for remote control updates from Firebase
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

  // Real-time Simulation Ticker (Fallback micro-fluctuations & Fan Countdown)
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

  // Instant Manual Switch Toggle Handler (No Save & Apply needed!)
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

      // Write to Firebase Realtime Database
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
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
