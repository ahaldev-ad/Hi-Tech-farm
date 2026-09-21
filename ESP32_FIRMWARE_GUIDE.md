# ESP32 Firmware & Hardware Implementation Guide

This document provides the complete, production-ready C++ firmware code, hardware wiring diagrams, pinout configurations, and library installation steps to program an **ESP32 microcontroller** for the **Paradise Mushroom Automation System**.

---

## 1. Hardware Pinouts & Wiring Schematic

| Peripheral / Module | ESP32 Pin | Interface / Type | Notes |
|---------------------|-----------|------------------|-------|
| **SHT45 Temperature & Humidity Sensor** | GPIO 21 (SDA), GPIO 22 (SCL) | I2C (Address 0x44) | High-precision environmental sensor |
| **DS3231 Real-Time Clock (RTC)** | GPIO 21 (SDA), GPIO 22 (SCL) | I2C (Address 0x68) | Shared I2C bus |
| **Ultrasonic Humidifier Relay** | GPIO 26 | Digital Output | Active HIGH relay module |
| **Exhaust Ventilation Fan Relay** | GPIO 27 | Digital Output | Active HIGH relay module |
| **Cooling System Relay** | GPIO 14 | Digital Output | Active HIGH relay module |
| **SD Card SPI (MISO)** | GPIO 19 | SPI | Data logging fallback |
| **SD Card SPI (MOSI)** | GPIO 23 | SPI | Data logging fallback |
| **SD Card SPI (SCK)** | GPIO 18 | SPI | Clock line |
| **SD Card SPI (CS)** | GPIO 5 | SPI (Chip Select) | Chip select pin |
| **Status LED Indicator** | GPIO 2 | Built-in LED | Blinks during WiFi/Firebase sync |

---

## 2. Required Arduino IDE Libraries

Install the following libraries in Arduino IDE via **Tools -> Manage Libraries** (or `platformio.ini`):

1. **`Firebase-ESP-Client`** by *Mobizt* (v4.4.0 or later)
2. **`SensirionI2CSht4x`** by *Sensirion* (v0.1.0 or later)
3. **`RTClib`** by *Adafruit* (v2.1.0 or later)
4. **`ArduinoJson`** by *Benoît Blanchon* (v6.21.0 or later)
5. **`SD`** & **`SPI`** (Built-in ESP32 core libraries)

---

## 3. Complete ESP32 Arduino / C++ Firmware (`MushroomFarm_ESP32.ino`)

Copy and paste the code below directly into your Arduino IDE or PlatformIO project:

```cpp
/**
 * Paradise Mushroom Farm - ESP32 Firmware
 * Hardware Controller: ESP32 + SHT45 + DS3231 + Relays + SD Card
 * Synchronization: Firebase Realtime Database (farm/metrics & farm/controls)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Wire.h>
#include <SensirionI2CSht4x.h>
#include <RTClib.h>
#include <SPI.h>
#include <SD.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// ==========================================
// 1. CONFIGURATION PARAMETERS
// ==========================================

// WiFi Credentials
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase Configuration
#define API_KEY       "AIzaSyA-Ky2xDFvOAPM4wRFPiiZwoT7CEt3-wWc"
#define DATABASE_URL  "https://hi-tech-farm-default-rtdb.firebaseio.com"

// Pin Definitions
#define PIN_RELAY_HUMIDIFIER 26
#define PIN_RELAY_FAN        27
#define PIN_RELAY_COOLING    14
#define PIN_SD_CS            5
#define PIN_LED_STATUS       2

// Hardware Interfaces
SensirionI2CSht4x sht4x;
RTC_DS3231 rtc;
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Local Sensor Telemetry State
float currentTemp = 22.4;
float currentHumidity = 89.2;
bool sdLogSuccess = false;

// Actuator State Machine Variables
String humidMode = "AUTO";
int humidOnThresh = 88;
int humidOffThresh = 95;
bool humidManualState = false;
bool humidRelayState = false;

String fanMode = "TIMER";
int fanOnMins = 10;
int fanOffMins = 10;
bool fanManualState = false;
bool fanActivePhase = true;
unsigned long fanCycleTimer = 0;
bool fanRelayState = false;

String coolingMode = "MANUAL";
String coolingStatus = "OFF";
bool coolingRelayState = false;

// System Timers
unsigned long lastSensorReadTime = 0;
unsigned long lastFirebaseSyncTime = 0;
unsigned long lastSdLogTime = 0;

// Sampling Intervals (ms)
unsigned long sensorSamplingInterval = 5000; // Default 5 seconds
unsigned long sdLogInterval = 900000;         // Default 15 minutes (15 * 60 * 1000)

// ==========================================
// 2. HELPER & UTILITY FUNCTIONS
// ==========================================

void blinkStatusLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_LED_STATUS, HIGH);
    delay(delayMs);
    digitalWrite(PIN_LED_STATUS, LOW);
    delay(delayMs);
  }
}

void logToSDCard(String timestamp, float temp, float humidity) {
  if (!sdLogSuccess) return;
  
  File logFile = SD.open("/datalog.csv", FILE_APPEND);
  if (logFile) {
    logFile.print(timestamp);
    logFile.print(",");
    logFile.print(temp, 1);
    logFile.print(",");
    logFile.println(humidity, 1);
    logFile.close();
    Serial.println("[SD] Log entry recorded successfully.");
  } else {
    Serial.println("[SD] Failed to open datalog.csv for writing.");
  }
}

// ==========================================
// 3. ACTUATOR REGULATION LOGIC ENGINE
// ==========================================

void processActuatorLogic() {
  // ----------------------------------------
  // A. Ultrasonic Humidifier Logic
  // ----------------------------------------
  if (humidMode == "AUTO") {
    // Hysteresis Loop: Prevent rapid relay switching near boundaries
    if (currentHumidity <= (float)humidOnThresh) {
      humidRelayState = true;  // Turn ON Humidifier
    } else if (currentHumidity >= (float)humidOffThresh) {
      humidRelayState = false; // Turn OFF Humidifier
    }
  } else { // MANUAL Mode
    humidRelayState = humidManualState;
  }
  digitalWrite(PIN_RELAY_HUMIDIFIER, humidRelayState ? HIGH : LOW);

  // ----------------------------------------
  // B. Exhaust Ventilation Fan Logic
  // ----------------------------------------
  if (fanMode == "TIMER") {
    unsigned long currentMillis = millis();
    unsigned long phaseDurationMs = (fanActivePhase ? fanOnMins : fanOffMins) * 60000UL;

    if (currentMillis - fanCycleTimer >= phaseDurationMs) {
      fanCycleTimer = currentMillis;
      fanActivePhase = !fanActivePhase; // Switch Phase ACTIVE <-> PAUSED
      Serial.print("[FAN] Timer phase switched to: ");
      Serial.println(fanActivePhase ? "ACTIVE (ON)" : "PAUSED (OFF)");
    }
    fanRelayState = fanActivePhase;
  } else { // MANUAL Mode
    fanRelayState = fanManualState;
  }
  digitalWrite(PIN_RELAY_FAN, fanRelayState ? HIGH : LOW);

  // ----------------------------------------
  // C. Cooling System Logic
  // ----------------------------------------
  coolingRelayState = (coolingStatus == "ACTIVE");
  digitalWrite(PIN_RELAY_COOLING, coolingRelayState ? HIGH : LOW);
}

// ==========================================
// 4. FIREBASE SYNCHRONIZATION ENGINE
// ==========================================

void publishTelemetryToFirebase() {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  json.set("temp", currentTemp);
  json.set("humidity", currentHumidity);
  json.set("timestamp", (double)millis());

  if (Firebase.RTDB.setJSON(&fbdo, "farm/metrics", &json)) {
    Serial.printf("[FIREBASE] Telemetry sent: Temp=%.1f°C, Humidity=%.1f%%\n", currentTemp, currentHumidity);
    digitalWrite(PIN_LED_STATUS, HIGH);
    delay(50);
    digitalWrite(PIN_LED_STATUS, LOW);
  } else {
    Serial.printf("[FIREBASE] Telemetry Error: %s\n", fbdo.errorReason().c_str());
  }
}

void fetchControlsFromFirebase() {
  if (!Firebase.ready()) return;

  if (Firebase.RTDB.getJSON(&fbdo, "farm/controls")) {
    FirebaseJsonData result;
    FirebaseJson &json = fbdo.jsonObject();

    // Humidifier Controls
    if (json.get(result, "humidifier/mode")) humidMode = result.stringValue;
    if (json.get(result, "humidifier/onThreshold")) humidOnThresh = result.intValue;
    if (json.get(result, "humidifier/offThreshold")) humidOffThresh = result.intValue;
    if (json.get(result, "humidifier/manualState")) humidManualState = result.boolValue;

    // Exhaust Fan Controls
    if (json.get(result, "fan/mode")) fanMode = result.stringValue;
    if (json.get(result, "fan/onDuration")) fanOnMins = result.intValue;
    if (json.get(result, "fan/offDuration")) fanOffMins = result.intValue;
    if (json.get(result, "fan/manualState")) fanManualState = result.boolValue;

    // Cooling Controls
    if (json.get(result, "cooling/status")) coolingStatus = result.stringValue;

    // Config Sampling Rates
    if (json.get(result, "config/hardwareSamplingSec")) {
      sensorSamplingInterval = result.intValue * 1000UL;
    }
  }
}

// ==========================================
// 5. SETUP & MAIN LOOP
// ==========================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== Paradise Mushroom ESP32 Firmware Starting ===");

  // Initialize Pins
  pinMode(PIN_RELAY_HUMIDIFIER, OUTPUT);
  pinMode(PIN_RELAY_FAN, OUTPUT);
  pinMode(PIN_RELAY_COOLING, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);

  digitalWrite(PIN_RELAY_HUMIDIFIER, LOW);
  digitalWrite(PIN_RELAY_FAN, LOW);
  digitalWrite(PIN_RELAY_COOLING, LOW);
  digitalWrite(PIN_LED_STATUS, LOW);

  // Initialize I2C (SDA = GPIO 21, SCL = GPIO 22)
  Wire.begin(21, 22);

  // Initialize SHT45 Sensor
  sht4x.begin(Wire);
  uint16_t error;
  char errorMessage[256];
  uint32_t serialNumber;
  error = sht4x.serialNumber(serialNumber);
  if (error) {
    errorToString(error, errorMessage, 256);
    Serial.printf("[SHT45] Error trying to execute serialNumber(): %s\n", errorMessage);
  } else {
    Serial.printf("[SHT45] Sensor Initialized! Serial Number: %u\n", serialNumber);
  }

  // Initialize RTC DS3231
  if (!rtc.begin()) {
    Serial.println("[RTC] Could not find DS3231 RTC Module!");
  } else {
    if (rtc.lostPower()) {
      Serial.println("[RTC] RTC lost power, setting time to compile time.");
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
    Serial.println("[RTC] DS3231 RTC Module Ready.");
  }

  // Initialize SD Card Data Logging
  if (!SD.begin(PIN_SD_CS)) {
    Serial.println("[SD] Card Mount Failed or Not Present.");
    sdLogSuccess = false;
  } else {
    Serial.println("[SD] Card Initialized Successfully.");
    sdLogSuccess = true;
    
    // Create CSV header if file doesn't exist
    if (!SD.exists("/datalog.csv")) {
      File logFile = SD.open("/datalog.csv", FILE_WRITE);
      if (logFile) {
        logFile.println("Timestamp,Temperature_C,Humidity_RH");
        logFile.close();
      }
    }
  }

  // Connect WiFi
  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected! IP Address: " + WiFi.localIP().toString());
    blinkStatusLED(3, 100);
  } else {
    Serial.println("\n[WIFI] Connection Timeout. Will operate in offline fallback mode.");
  }

  // Initialize Firebase Realtime Database
  config.database_url = DATABASE_URL;
  config.api_key = API_KEY;
  config.signer.tokens.legacy_token = "";

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  fanCycleTimer = millis();
  Serial.println("=== Initialization Complete. Entering Main Loop ===\n");
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Read SHT45 Sensor Data & Telemetry Publish Loop
  if (currentMillis - lastSensorReadTime >= sensorSamplingInterval) {
    lastSensorReadTime = currentMillis;

    float tempRead = 0.0;
    float humidRead = 0.0;
    uint16_t error = sht4x.measureHighPrecision(tempRead, humidRead);

    if (error == 0) {
      currentTemp = tempRead;
      currentHumidity = humidRead;
      Serial.printf("[SENSOR READ] Temp: %.2f °C | Humidity: %.2f %% RH\n", currentTemp, currentHumidity);
    } else {
      Serial.println("[SHT45] Sensor read error!");
    }

    // Publish to Firebase Cloud
    publishTelemetryToFirebase();
  }

  // 2. Fetch Control Updates from Firebase Cloud
  if (currentMillis - lastFirebaseSyncTime >= 3000) { // Check controls every 3s
    lastFirebaseSyncTime = currentMillis;
    fetchControlsFromFirebase();
  }

  // 3. SD Card Periodic Backup Logging
  if (currentMillis - lastSdLogTime >= sdLogInterval) {
    lastSdLogTime = currentMillis;
    DateTime now = rtc.now();
    char timestampBuf[25];
    snprintf(timestampBuf, sizeof(timestampBuf), "%04d-%02d-%02d %02d:%02d:%02d", 
             now.year(), now.month(), now.day(), now.hour(), now.minute(), now.second());
    
    logToSDCard(String(timestampBuf), currentTemp, currentHumidity);
  }

  // 4. Run Actuator Relay Control Engine
  processActuatorLogic();

  // Short Yield Delay
  delay(100);
}
```

---

## 4. Verification & Testing Steps

1. Connect your ESP32 to your PC via USB cable.
2. In Arduino IDE, select **Board**: `ESP32 Dev Module` and select your COM Port.
3. Open **Serial Monitor** at **115200 baud**.
4. Upload the code. You will see:
   ```
   === Paradise Mushroom ESP32 Firmware Starting ===
   [SHT45] Sensor Initialized!
   [RTC] DS3231 RTC Module Ready.
   [SD] Card Initialized Successfully.
   [WIFI] Connected! IP Address: 192.168.1.142
   [FIREBASE] Telemetry sent: Temp=22.4°C, Humidity=89.2%
   ```
5. Open your **Paradise Mushroom Web Dashboard**. The live gauges, historical trends, and controls will immediately mirror the hardware!
