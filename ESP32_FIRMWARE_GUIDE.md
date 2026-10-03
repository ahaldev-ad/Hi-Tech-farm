# ESP32 IoT Device Firmware & Implementation Guide

This guide provides the complete, production-ready **ESP32 C++ firmware code**, pinout specifications, library dependencies, wiring schematics, and step-by-step programming instructions for the **Paradise Mushroom Automation System**.

> [!NOTE]
> This document focuses strictly on programming the ESP32 hardware device. For database architecture schemas and phone push notification guides, refer to [`IOT_DEVICE_FIREBASE_GUIDE.md`](file:///d:/Hi-tech_farm/IOT_DEVICE_FIREBASE_GUIDE.md).

---

## 1. Hardware Pinout & Wiring Schematic

Below is the pin assignment table for connecting the sensors, real-time clock, relays, and SD card module to the ESP32 microcontroller:

| Component / Module | ESP32 GPIO Pin | Physical Interface | Description |
|--------------------|----------------|--------------------|-------------|
| **SHT45 Temperature & Humidity Sensor** | GPIO 21 (SDA), GPIO 22 (SCL) | I2C (Address `0x44`) | High-accuracy environmental sensor |
| **DS3231 Real-Time Clock (RTC)** | GPIO 21 (SDA), GPIO 22 (SCL) | I2C (Address `0x68`) | Shared I2C bus for timestamping |
| **Ultrasonic Humidifier Relay** | GPIO 26 | Digital Output | Relay Module (Active HIGH) |
| **Exhaust Ventilation Fan Relay** | GPIO 27 | Digital Output | Relay Module (Active HIGH) |
| **Cooling System Relay** | GPIO 14 | Digital Output | Relay Module (Active HIGH) |
| **SD Card SPI (MISO)** | GPIO 19 | SPI | Data logging fallback |
| **SD Card SPI (MOSI)** | GPIO 23 | SPI | Data logging fallback |
| **SD Card SPI (SCK)** | GPIO 18 | SPI | Clock line |
| **SD Card SPI (CS)** | GPIO 5 | SPI Chip Select | MicroSD card reader CS pin |
| **Status Indicator LED** | GPIO 2 | Built-in LED | Visual WiFi / Firebase sync pulse |

---

## 2. Required Arduino IDE Libraries

Before uploading the firmware, install the following required libraries via **Tools -> Manage Libraries** in Arduino IDE (or add to your `platformio.ini`):

1. **`Firebase-ESP-Client`** by *Mobizt* (`v4.4.0` or higher)
2. **`SensirionI2CSht4x`** by *Sensirion* (`v0.1.0` or higher)
3. **`RTClib`** by *Adafruit* (`v2.1.0` or higher)
4. **`ArduinoJson`** by *Benoît Blanchon* (`v6.21.0` or higher)
5. **`SD`** & **`SPI`** (Included built-in with ESP32 Arduino Core)

---

## 3. Production-Ready ESP32 Firmware (`MushroomFarm_ESP32.ino`)

Copy and paste the full C++ sketch below into your Arduino IDE or PlatformIO project:

```cpp
/**
 * Paradise Mushroom Farm - ESP32 Complete IoT Firmware
 * Microcontroller: ESP32-WROOM-32 / Dev Module
 * Hardware: SHT45 + DS3231 RTC + 3-Channel Relays + MicroSD SPI
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
// 1. HARDWARE & NETWORK CONFIGURATION
// ==========================================

// WiFi Access Point Credentials
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase Database Configuration
#define API_KEY       "AIzaSyA-Ky2xDFvOAPM4wRFPiiZwoT7CEt3-wWc"
#define DATABASE_URL  "https://hi-tech-farm-default-rtdb.firebaseio.com"

// Digital Pin Allocations
#define PIN_RELAY_HUMIDIFIER 26
#define PIN_RELAY_FAN        27
#define PIN_RELAY_COOLING    14
#define PIN_SD_CS            5
#define PIN_LED_STATUS       2

// Hardware Peripheral Handles
SensirionI2CSht4x sht4x;
RTC_DS3231 rtc;
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Local Environmental Sensor State
float currentTemp = 22.4;
float currentHumidity = 89.2;
bool sdLogSuccess = false;

// Humidifier Control State Machine
String humidMode = "AUTO";
int humidOnThresh = 88;
int humidOffThresh = 95;
bool humidManualState = false;
bool humidRelayState = false;

// Exhaust Fan Control State Machine
String fanMode = "TIMER";
int fanOnMins = 10;
int fanOffMins = 10;
bool fanManualState = false;
bool fanActivePhase = true;
unsigned long fanCycleTimer = 0;
bool fanRelayState = false;

// Cooling System State Machine
String coolingMode = "MANUAL";
String coolingStatus = "OFF";
bool coolingRelayState = false;

// System Loop Timers (ms)
unsigned long lastSensorReadTime = 0;
unsigned long lastFirebaseSyncTime = 0;
unsigned long lastSdLogTime = 0;

// Dynamic Operational Sampling Rates
unsigned long sensorSamplingInterval = 5000; // 5 Seconds default
unsigned long sdLogInterval = 900000;         // 15 Minutes default (15 * 60 * 1000)

// ==========================================
// 2. HELPER & UTILITY FUNCTIONS
// ==========================================

void blinkStatusLED(int count, int delayMs) {
  for (int i = 0; i < count; i++) {
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
    Serial.println("[SD LOG] Entry saved successfully to datalog.csv");
  } else {
    Serial.println("[SD LOG] Failed to open datalog.csv for writing!");
  }
}

// ==========================================
// 3. ACTUATOR REGULATION LOGIC ENGINE
// ==========================================

void processActuatorLogic() {
  // ----------------------------------------
  // A. Ultrasonic Humidifier Relay Logic
  // ----------------------------------------
  if (humidMode == "AUTO") {
    // Hysteresis Loop to prevent rapid relay chatter
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
  // B. Exhaust Ventilation Fan Relay Logic
  // ----------------------------------------
  if (fanMode == "TIMER") {
    unsigned long currentMillis = millis();
    unsigned long phaseDurationMs = (fanActivePhase ? fanOnMins : fanOffMins) * 60000UL;

    if (currentMillis - fanCycleTimer >= phaseDurationMs) {
      fanCycleTimer = currentMillis;
      fanActivePhase = !fanActivePhase; // Switch ACTIVE <-> PAUSED phase
      Serial.print("[FAN TIMER] Phase switched to: ");
      Serial.println(fanActivePhase ? "ACTIVE (ON)" : "PAUSED (OFF)");
    }
    fanRelayState = fanActivePhase;
  } else { // MANUAL Mode
    fanRelayState = fanManualState;
  }
  digitalWrite(PIN_RELAY_FAN, fanRelayState ? HIGH : LOW);

  // ----------------------------------------
  // C. Cooling System Relay Logic
  // ----------------------------------------
  coolingRelayState = (coolingStatus == "ACTIVE");
  digitalWrite(PIN_RELAY_COOLING, coolingRelayState ? HIGH : LOW);
}

// ==========================================
// 4. FIREBASE CLOUD SYNCHRONIZATION ENGINE
// ==========================================

void publishTelemetryToFirebase() {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  json.set("temp", currentTemp);
  json.set("humidity", currentHumidity);
  json.set("timestamp", (double)millis());

  if (Firebase.RTDB.setJSON(&fbdo, "farm/metrics", &json)) {
    Serial.printf("[FIREBASE PUSH] Temp: %.1f°C | Humidity: %.1f%%\n", currentTemp, currentHumidity);
    
    // Also sync live relay statuses back to cloud for dashboard indicator lights
    Firebase.RTDB.setString(&fbdo, "farm/controls/humidifier/status", humidRelayState ? "ACTIVE" : "OFF");
    Firebase.RTDB.setString(&fbdo, "farm/controls/fan/status", fanRelayState ? "ACTIVE" : "OFF");
    
    digitalWrite(PIN_LED_STATUS, HIGH);
    delay(40);
    digitalWrite(PIN_LED_STATUS, LOW);
  } else {
    Serial.printf("[FIREBASE ERROR] PUSH failed: %s\n", fbdo.errorReason().c_str());
  }
}

void fetchControlsFromFirebase() {
  if (!Firebase.ready()) return;

  if (Firebase.RTDB.getJSON(&fbdo, "farm/controls")) {
    FirebaseJsonData result;
    FirebaseJson &json = fbdo.jsonObject();

    // Read Humidifier Control Parameters
    if (json.get(result, "humidifier/mode")) humidMode = result.stringValue;
    if (json.get(result, "humidifier/onThreshold")) humidOnThresh = result.intValue;
    if (json.get(result, "humidifier/offThreshold")) humidOffThresh = result.intValue;
    if (json.get(result, "humidifier/manualState")) humidManualState = result.boolValue;

    // Read Exhaust Fan Control Parameters
    if (json.get(result, "fan/mode")) fanMode = result.stringValue;
    if (json.get(result, "fan/onDuration")) fanOnMins = result.intValue;
    if (json.get(result, "fan/offDuration")) fanOffMins = result.intValue;
    if (json.get(result, "fan/manualState")) fanManualState = result.boolValue;

    // Read Cooling System Parameter
    if (json.get(result, "cooling/status")) coolingStatus = result.stringValue;

    // Read Hardware Sampling Rate Config
    if (json.get(result, "config/hardwareSamplingSec")) {
      sensorSamplingInterval = result.intValue * 1000UL;
    }
  }
}

// ==========================================
// 5. INITIALIZATION & MAIN SETUP
// ==========================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=========================================");
  Serial.println("  Paradise Mushroom ESP32 Firmware v2.4  ");
  Serial.println("=========================================\n");

  // Configure Output Pins
  pinMode(PIN_RELAY_HUMIDIFIER, OUTPUT);
  pinMode(PIN_RELAY_FAN, OUTPUT);
  pinMode(PIN_RELAY_COOLING, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);

  // Set Relays OFF initially
  digitalWrite(PIN_RELAY_HUMIDIFIER, LOW);
  digitalWrite(PIN_RELAY_FAN, LOW);
  digitalWrite(PIN_RELAY_COOLING, LOW);
  digitalWrite(PIN_LED_STATUS, LOW);

  // Initialize I2C Bus (SDA = GPIO 21, SCL = GPIO 22)
  Wire.begin(21, 22);

  // Initialize SHT45 High-Precision Sensor
  sht4x.begin(Wire);
  uint16_t error;
  char errorMessage[256];
  uint32_t serialNumber;
  error = sht4x.serialNumber(serialNumber);
  if (error) {
    errorToString(error, errorMessage, 256);
    Serial.printf("[SHT45 ERROR] Initialization failed: %s\n", errorMessage);
  } else {
    Serial.printf("[SHT45 SUCCESS] Sensor active! Serial Number: %u\n", serialNumber);
  }

  // Initialize DS3231 Real-Time Clock
  if (!rtc.begin()) {
    Serial.println("[RTC ERROR] DS3231 RTC module not detected on I2C bus!");
  } else {
    if (rtc.lostPower()) {
      Serial.println("[RTC WARNING] RTC lost power, setting time to compilation time.");
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
    Serial.println("[RTC SUCCESS] DS3231 RTC Module ready.");
  }

  // Initialize MicroSD Card Datalogger
  if (!SD.begin(PIN_SD_CS)) {
    Serial.println("[SD WARNING] SD card mount failed or card not inserted. Operating without offline SD logging.");
    sdLogSuccess = false;
  } else {
    Serial.println("[SD SUCCESS] SD card mounted.");
    sdLogSuccess = true;
    
    // Write CSV header row if file doesn't exist
    if (!SD.exists("/datalog.csv")) {
      File logFile = SD.open("/datalog.csv", FILE_WRITE);
      if (logFile) {
        logFile.println("Timestamp,Temperature_C,Humidity_RH");
        logFile.close();
      }
    }
  }

  // Connect to Local WiFi
  Serial.printf("[WIFI] Connecting to SSID: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI SUCCESS] Connected! IP Address: " + WiFi.localIP().toString());
    blinkStatusLED(3, 100);
  } else {
    Serial.println("\n[WIFI WARNING] Connection timeout! ESP32 will operate in offline fallback mode.");
  }

  // Initialize Firebase Realtime Database Connection
  config.database_url = DATABASE_URL;
  config.api_key = API_KEY;
  config.signer.tokens.legacy_token = "";

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  fanCycleTimer = millis();
  Serial.println("\n=== Initialization Complete. Entering Main Loop ===\n");
}

// ==========================================
// 6. MAIN EXECUTION LOOP
// ==========================================

void loop() {
  unsigned long currentMillis = millis();

  // Task 1: Read SHT45 Sensor & Telemetry Publish
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
      Serial.println("[SHT45 ERROR] Sensor measurement failed!");
    }

    // Publish to Cloud Database
    publishTelemetryToFirebase();
  }

  // Task 2: Fetch Dynamic Control Parameter Updates from Web Dashboard
  if (currentMillis - lastFirebaseSyncTime >= 3000) { // Sync every 3 seconds
    lastFirebaseSyncTime = currentMillis;
    fetchControlsFromFirebase();
  }

  // Task 3: Offline Backup SD Card Logging
  if (currentMillis - lastSdLogTime >= sdLogInterval) {
    lastSdLogTime = currentMillis;
    DateTime now = rtc.now();
    char timestampBuf[25];
    snprintf(timestampBuf, sizeof(timestampBuf), "%04d-%02d-%02d %02d:%02d:%02d", 
             now.year(), now.month(), now.day(), now.hour(), now.minute(), now.second());
    
    logToSDCard(String(timestampBuf), currentTemp, currentHumidity);
  }

  // Task 4: Execute Relay Control Logic
  processActuatorLogic();

  // Small background yield delay
  delay(100);
}
```

---

## 4. Step-by-Step Instructions to Program & Flash ESP32

Follow these instructions to configure, compile, and flash your ESP32 board:

### Step 1: Install ESP32 Board Support in Arduino IDE
1. Open **Arduino IDE**.
2. Go to **File -> Preferences**.
3. Add the following URL to **Additional Boards Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Open **Tools -> Board -> Boards Manager...**, search for `esp32` by Expressif Systems, and click **Install**.

### Step 2: Configure Firmware Parameters
1. In the `MushroomFarm_ESP32.ino` code block above, locate section **1. HARDWARE & NETWORK CONFIGURATION**.
2. Update `WIFI_SSID` and `WIFI_PASSWORD` with your local 2.4GHz Wi-Fi credentials:
   ```cpp
   #define WIFI_SSID     "Your_Wifi_Network_Name"
   #define WIFI_PASSWORD "Your_Wifi_Password"
   ```

### Step 3: Select Board & Port Settings
1. Connect your ESP32 board to your computer using a Micro-USB or USB-C data cable.
2. Under **Tools -> Board**, select **ESP32 Dev Module**.
3. Under **Tools -> Port**, select the COM port corresponding to your connected ESP32 (e.g., `COM3`, `COM4` on Windows).
4. Set **Upload Speed** to `921600` (or `115200` if upload fails).

### Step 4: Upload Firmware & Verify
1. Click the **Upload** button (Right Arrow icon) in Arduino IDE.
2. Once upload completes (`100% Hash of data verified`), open **Tools -> Serial Monitor**.
3. Set Serial Monitor baud rate to **`115200 baud`**.
4. You should observe live diagnostic boot messages:
   ```text
   =========================================
     Paradise Mushroom ESP32 Firmware v2.4  
   =========================================

   [SHT45 SUCCESS] Sensor active! Serial Number: 28471924
   [RTC SUCCESS] DS3231 RTC Module ready.
   [SD SUCCESS] SD card mounted.
   [WIFI SUCCESS] Connected! IP Address: 192.168.1.142
   [FIREBASE PUSH] Temp: 22.4°C | Humidity: 89.2%
   ```

---

## 5. Offline Operation & Fail-Safe Logic

- **Wi-Fi / Internet Disconnection**: If Wi-Fi drops, the ESP32 automatically continues reading environmental sensors, executing local humidifier/fan logic based on cached settings, and logging data to the MicroSD card.
- **Auto Reconnect**: When Wi-Fi recovers, `Firebase.reconnectWiFi(true);` automatically re-establishes cloud synchronization without requiring a hardware reboot.
