/* ============================================================
   Aakash Udaan — ESP32 BLE tilt controller firmware
   ------------------------------------------------------------
   What this does:
   1. Reads raw accelerometer values from an MPU6050 over I2C.
   2. Converts them into roll (left/right tilt) and pitch
      (forward/back tilt) in degrees.
   3. Advertises a BLE service and notifies "roll,pitch" (as
      plain text) to the browser about 20 times a second.

   The UUIDs below must match SERVICE_UUID / CHAR_UUID in
   game.js exactly, or the browser won't find this device.

   Wiring (MPU6050 -> ESP32, typical dev boards):
     VCC -> 3V3
     GND -> GND
     SCL -> GPIO 22
     SDA -> GPIO 21

   No extra MPU6050 library needed — this talks to the sensor
   directly over I2C. The BLE libraries below ship with the
   ESP32 board package in the Arduino IDE.
   ============================================================ */

#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// must match game.js
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ---------- MPU6050 ----------
const int MPU_ADDR = 0x68;
const int SDA_PIN = 21;
const int SCL_PIN = 22;

BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL_MS = 50; // ~20 times per second

// smoothing so the plane doesn't twitch on sensor noise
float smoothedRoll = 0;
float smoothedPitch = 0;
const float SMOOTHING = 0.2; // 0 = no smoothing, 1 = frozen

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    deviceConnected = true;
    Serial.println("Browser connected.");
  }
  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
    Serial.println("Browser disconnected — restarting advertising.");
    server->getAdvertising()->start();
  }
};

void setup() {
  Serial.begin(115200);
  delay(300);

  Wire.begin(SDA_PIN, SCL_PIN);
  setupMPU6050();

  BLEDevice::init("AtomicAce-Controller");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* service = pServer->createService(SERVICE_UUID);
  pCharacteristic = service->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());
  service->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("Ready. Look for 'AtomicAce-Controller' in the game's Connect ESP32 button.");
}

void loop() {
  unsigned long now = millis();
  if (deviceConnected && now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;
    sendTiltReading();
  }
}

// ------------------------------------------------------------
// MPU6050 setup: wake the sensor up (it starts in sleep mode)
// ------------------------------------------------------------
void setupMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);  // power management register
  Wire.write(0);     // wake it up
  Wire.endTransmission(true);
}

// ------------------------------------------------------------
// Read raw accelerometer values and convert to roll/pitch in
// degrees using atan2, so it stays accurate at any angle.
// ------------------------------------------------------------
void readTilt(float &rollDeg, float &pitchDeg) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // starting register for accelerometer readings
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);

  int16_t rawAccX = (Wire.read() << 8) | Wire.read();
  int16_t rawAccY = (Wire.read() << 8) | Wire.read();
  int16_t rawAccZ = (Wire.read() << 8) | Wire.read();

  float accX = rawAccX / 16384.0;
  float accY = rawAccY / 16384.0;
  float accZ = rawAccZ / 16384.0;

  float rollRad = atan2(accY, accZ);
  float pitchRad = atan2(-accX, sqrt(accY * accY + accZ * accZ));

  rollDeg = rollRad * 180.0 / PI;
  pitchDeg = pitchRad * 180.0 / PI;
}

// ------------------------------------------------------------
// Notify the browser with "roll,pitch" as plain text
// ------------------------------------------------------------
void sendTiltReading() {
  float rawRoll, rawPitch;
  readTilt(rawRoll, rawPitch);

  smoothedRoll = smoothedRoll * SMOOTHING + rawRoll * (1.0 - SMOOTHING);
  smoothedPitch = smoothedPitch * SMOOTHING + rawPitch * (1.0 - SMOOTHING);

  String payload = String(smoothedRoll, 2) + "," + String(smoothedPitch, 2);
  pCharacteristic->setValue(payload.c_str());
  pCharacteristic->notify();
}
