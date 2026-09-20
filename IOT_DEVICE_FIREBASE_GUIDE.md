# IoT Device Firebase Realtime Database Architecture & Implementation Guide

This guide provides the complete database architecture, JSON schema, and sample code snippets for programming your IoT hardware controller (ESP32, ESP8266, or Raspberry Pi) to communicate with the **Paradise Mushroom Web Dashboard**.

---

## 1. Firebase Realtime Database Architecture

The database is organized under the root path `farm/`, separated into **Telemetry Metrics** (written by IoT device, read by Dashboard) and **Control Parameters** (written by Dashboard, read by IoT device).

```
farm/
├── metrics/                        <-- Sent by IoT Device (SHT45 Sensor Data)
│   ├── temp: 22.4                  (float, Ambient Temperature in °C)
│   ├── humidity: 89.2              (float, Relative Humidity in % RH)
│   └── timestamp: 1789910220957    (long, Unix timestamp in milliseconds)
│
└── controls/                       <-- Synced between Dashboard & IoT Device
    ├── preset: "fruiting"          (string: "colonization" | "fruiting" | "harvest" | "custom")
    ├── humidifier/
    │   ├── mode: "AUTO"            (string: "AUTO" | "MANUAL")
    │   ├── onThreshold: 88         (int, Humidity % to turn ON)
    │   ├── offThreshold: 95        (int, Humidity % to turn OFF)
    │   ├── manualState: true       (bool, Manual power switch ON/OFF)
    │   └── status: "ACTIVE"        (string: "ACTIVE" | "OFF")
    ├── fan/
    │   ├── mode: "TIMER"           (string: "TIMER" | "MANUAL")
    │   ├── onDuration: 10          (int, Fan ON duration in minutes)
    │   ├── offDuration: 10         (int, Fan OFF duration in minutes)
    │   ├── manualState: true       (bool, Manual power switch ON/OFF)
    │   └── status: "ACTIVE"        (string: "ACTIVE" | "OFF")
    ├── cooling/
    │   ├── mode: "MANUAL"          (string: "MANUAL")
    │   └── status: "OFF"           (string: "ACTIVE" | "OFF")
    ├── config/
    │   ├── version: 3              (int, Configuration version)
    │   ├── hardwareSamplingSec: 5  (int, Sensor sampling interval in seconds)
    │   ├── logIntervalMin: 15      (int, SD card logging interval)
    │   └── rtcSyncHr: 24           (int, RTC clock sync interval)
    └── customValues/
        ├── humidOn: 88             (int, Custom RH ON %)
        ├── humidOff: 95            (int, Custom RH OFF %)
        ├── fanOn: 10               (int, Custom Fan ON mins)
        └── fanOff: 10              (int, Custom Fan OFF mins)
```

---

## 2. Complete JSON Database Example Payload

```json
{
  "farm": {
    "metrics": {
      "temp": 22.4,
      "humidity": 89.2,
      "timestamp": 1789910220957
    },
    "controls": {
      "preset": "fruiting",
      "humidifier": {
        "mode": "AUTO",
        "onThreshold": 88,
        "offThreshold": 95,
        "manualState": true,
        "status": "ACTIVE"
      },
      "fan": {
        "mode": "TIMER",
        "onDuration": 10,
        "offDuration": 10,
        "manualState": true,
        "status": "ACTIVE"
      },
      "cooling": {
        "mode": "MANUAL",
        "status": "OFF"
      },
      "config": {
        "version": 3,
        "hardwareSamplingSec": 5,
        "logIntervalMin": 15,
        "rtcSyncHr": 24
      },
      "customValues": {
        "humidOn": 88,
        "humidOff": 95,
        "fanOn": 10,
        "fanOff": 10
      }
    }
  }
}
```

---

## 3. ESP32 / Arduino C++ Implementation Code

Use the **`Firebase-ESP-Client`** library by Mobizt to connect your ESP32 to Firebase Realtime Database.

```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Wire.h>
#include <SensirionI2CSht4x.h>

// 1. WiFi & Firebase Config
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define DATABASE_URL "https://hi-tech-farm-default-rtdb.firebaseio.com"
#define API_KEY "AIzaSyA-Ky2xDFvOAPM4wRFPiiZwoT7CEt3-wWc"

// Relay Pin Definitions
#define RELAY_HUMIDIFIER 26
#define RELAY_FAN        27
#define RELAY_COOLING    14

// Firebase Objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

SensirionI2CSht4x sht4x;

// Local Control Variables
float currentTemp = 0.0;
float currentHumidity = 0.0;

// Actuator States
String humidMode = "AUTO";
int humidOnThresh = 88;
int humidOffThresh = 95;
bool humidManualState = false;

String fanMode = "TIMER";
int fanOnMins = 10;
int fanOffMins = 10;
bool fanManualState = false;

String coolingStatus = "OFF";

unsigned long lastSensorRead = 0;
unsigned long fanCycleTimer = 0;
bool fanActivePhase = true;

void setup() {
  Serial.begin(115200);
  
  // Pin modes
  pinMode(RELAY_HUMIDIFIER, OUTPUT);
  pinMode(RELAY_FAN, OUTPUT);
  pinMode(RELAY_COOLING, OUTPUT);
  
  digitalWrite(RELAY_HUMIDIFIER, LOW);
  digitalWrite(RELAY_FAN, LOW);
  digitalWrite(RELAY_COOLING, LOW);

  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  // Initialize SHT45 Sensor
  Wire.begin();
  sht4x.begin(Wire);

  // Initialize Firebase
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = ""; // Anonymous access or Auth token
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void processActuatorLogic() {
  // 1. Humidifier Control
  if (humidMode == "AUTO") {
    if (currentHumidity <= humidOnThresh) {
      digitalWrite(RELAY_HUMIDIFIER, HIGH); // Turn ON
    } else if (currentHumidity >= humidOffThresh) {
      digitalWrite(RELAY_HUMIDIFIER, LOW);  // Turn OFF
    }
  } else { // MANUAL
    digitalWrite(RELAY_HUMIDIFIER, humidManualState ? HIGH : LOW);
  }

  // 2. Exhaust Fan Control
  if (fanMode == "TIMER") {
    unsigned long currentMillis = millis();
    unsigned long phaseDuration = (fanActivePhase ? fanOnMins : fanOffMins) * 60000UL;
    
    if (currentMillis - fanCycleTimer >= phaseDuration) {
      fanCycleTimer = currentMillis;
      fanActivePhase = !fanActivePhase; // Switch ACTIVE <-> PAUSED
    }
    digitalWrite(RELAY_FAN, fanActivePhase ? HIGH : LOW);
  } else { // MANUAL
    digitalWrite(RELAY_FAN, fanManualState ? HIGH : LOW);
  }

  // 3. Cooling System Control
  digitalWrite(RELAY_COOLING, (coolingStatus == "ACTIVE") ? HIGH : LOW);
}

void loop() {
  // 1. Publish SHT45 Telemetry to Firebase every 5 seconds
  if (millis() - lastSensorRead > 5000) {
    lastSensorRead = millis();
    
    sht4x.measureHighPrecision(currentTemp, currentHumidity);

    // Push metrics to Firebase path "farm/metrics"
    FirebaseJson json;
    json.set("temp", currentTemp);
    json.set("humidity", currentHumidity);
    json.set("timestamp", millis());
    
    Firebase.RTDB.setJSON(&fbdo, "farm/metrics", &json);
  }

  // 2. Fetch Control Updates from Firebase "farm/controls"
  if (Firebase.RTDB.getJSON(&fbdo, "farm/controls")) {
    FirebaseJsonData result;
    FirebaseJson &json = fbdo.jsonObject();

    // Read Humidifier Parameters
    if (json.get(result, "humidifier/mode")) humidMode = result.stringValue;
    if (json.get(result, "humidifier/onThreshold")) humidOnThresh = result.intValue;
    if (json.get(result, "humidifier/offThreshold")) humidOffThresh = result.intValue;
    if (json.get(result, "humidifier/manualState")) humidManualState = result.boolValue;

    // Read Fan Parameters
    if (json.get(result, "fan/mode")) fanMode = result.stringValue;
    if (json.get(result, "fan/onDuration")) fanOnMins = result.intValue;
    if (json.get(result, "fan/offDuration")) fanOffMins = result.intValue;
    if (json.get(result, "fan/manualState")) fanManualState = result.boolValue;

    // Read Cooling Parameter
    if (json.get(result, "cooling/status")) coolingStatus = result.stringValue;
  }

  // 3. Execute Actuator Control Loop
  processActuatorLogic();
  delay(200);
}
```

---

## 4. Python / Raspberry Pi Implementation Code

```python
import time
import board
import busio
import adafruit_sht4x
import firebase_admin
from firebase_admin import credentials, db

# 1. Initialize Firebase Admin SDK
cred = credentials.Certificate("path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://hi-tech-farm-default-rtdb.firebaseio.com'
})

# 2. Initialize SHT45 Sensor via I2C
i2c = busio.I2C(board.SCL, board.SDA)
sht = adafruit_sht4x.SHT4X(i2c)

# Database References
metrics_ref = db.reference('farm/metrics')
controls_ref = db.reference('farm/controls')

def on_control_change(event):
    """Callback triggered whenever Web Dashboard updates controls"""
    controls = event.data
    print("Received Control Updates from Firebase:", controls)

# Stream controls in real-time
controls_ref.listen(on_control_change)

while True:
    temp_c = sht.temperature
    humidity = sht.relative_humidity

    # Post telemetry to Firebase
    metrics_ref.set({
        'temp': round(temp_c, 1),
        'humidity': round(humidity, 1),
        'timestamp': int(time.time() * 1000)
    })
    
    time.sleep(5)
```

---

## 5. Security Rules Configuration (`database.rules.json`)

```json
{
  "rules": {
    "farm": {
      ".read": true,
      ".write": true,
      "metrics": {
        ".validate": "newData.hasChildren(['temp', 'humidity'])"
      },
      "controls": {
        ".validate": "newData.hasChildren(['preset', 'humidifier', 'fan', 'cooling'])"
      }
    }
  }
}
```
