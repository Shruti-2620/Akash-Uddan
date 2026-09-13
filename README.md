# Aakash Udaan — tilt-flight game (roll + pitch, like a real plane)

A 3D endless flight game in the flat-color, thick-outline folk-art
style, controlled by tilting an ESP32 board — bank left/right to
turn, nose up/down to climb or dive.

## Files

- `index.html`, `style.css`, `game.js` — the game itself (uses
  Three.js from a CDN, no build step needed). Open `index.html` in
  a browser to fly with arrow keys / WASD right away.
- `esp32_ble_firmware.ino` — Arduino sketch for the ESP32 + MPU6050
  tilt sensor. It advertises over Bluetooth Low Energy and notifies
  roll/pitch to the browser.

## Playing with just a keyboard (no hardware needed)

Open `index.html` in a browser (Chrome or Edge). Use:
- **← / →** or **A / D** to bank and turn
- **↑ / ↓** or **W / S** to pitch up/down (dive/climb)
- **Space** to restart after a crash

## Playing with the ESP32 tilt sensor

**Wiring** (MPU6050 → ESP32):
- VCC → 3V3
- GND → GND
- SCL → GPIO 22
- SDA → GPIO 21

**Arduino IDE setup:**
1. Install the ESP32 board package if you haven't already (the BLE
   libraries used here ship with it — no extra install needed).
2. Upload `esp32_ble_firmware.ino` to your ESP32.
3. Open the Serial Monitor at 115200 baud to confirm it's advertising
   as `AakashUdaan-Controller`.

**Connecting the game to the board:**
1. Open `index.html` in Chrome or Edge (desktop or Android — Web
   Bluetooth doesn't work on iOS Safari).
2. Click **Connect ESP32** and pick `AakashUdaan-Controller` from
   the browser's device picker.
3. Hold the board level and click **Recenter** once to zero it out,
   then tilt to fly.

## Difficulty

Every 400 meters flown, the level goes up: the flyable lane narrows,
more buildings spawn per stretch, and the top speed cap rises — the
same "gets harder as you go" feel as an endless runner, applied to
a flight sim instead of lane-switching.
