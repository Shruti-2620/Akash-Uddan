# AAKASH UDAAN — Pixel Flight Lab

An original 1980s-style pixel arcade flight game, controlled by tilting a
real **ESP32 + MPU6050** motion controller over Bluetooth, that quietly
teaches how flight works along the way.

> Educational prototype and arcade game. Not a certified flight simulator,
> not a professional training device, and not a medical tool.

## Run it

1. Open `index.html` in **Chrome or Edge** (desktop or Android). Web
   Bluetooth does not work in Firefox or iOS Safari. No build step, no
   server, no install.
2. Press any key → title screen → **START**.
3. **START** takes you through AIRCRAFT → THEME → CONTROLLER CHECK → LEVEL 1.

No controller? The arrow keys / WASD fly the plane automatically while no
ESP32 is connected.

## Connecting the ESP32 controller

Nothing changed on the hardware side. Upload `esp32_ble_firmware.ino`
unchanged.

**Wiring (MPU6050 → ESP32):** VCC → 3V3 · GND → GND · SCL → GPIO 22 · SDA → GPIO 21

1. Power the controller. The firmware advertises as `AtomicAce-Controller`.
2. Click **CONNECT ESP32** on the cabinet deck (or on the CONTROLLER CHECK
   screen) and pick the controller in the browser's device list.
3. Hold it level and click **RECENTER**.
4. Tilt to fly: **roll** banks and steers, **pitch** climbs and dives.

The Bluetooth code in `js/ble.js` is the original code copied line for line:
same service UUID `4fafc201-1fb5-459e-8fcc-c5c9c331914b`, same characteristic
UUID `beb5483e-36e1-4688-b7f5-ea07361b26a8`, same service-UUID device filter,
same notifications, same `"roll,pitch"` text parsing, same Recenter zeroing.

## Controls

| Input | Action |
|---|---|
| Tilt left / right | Bank + steer |
| Tilt forward / back | Dive / climb (invert on CONTROLLER CHECK) |
| Arrows / WASD | Fly (only while no controller is connected) |
| Enter / Space | Select |
| Esc | Back / pause |
| P | Pause |
| M | Sound on/off |
| F | Fullscreen |
| Tilt right and hold ~1 s | Confirm cards without touching the keyboard |

## Levels

| # | Level | Introduces |
|---|---|---|
| 1 | Basic Flight | Roll, pitch, flight corridor, rings |
| 2 | Speed | Rising speed, tower obstacles, reaction time |
| 3 | Altitude | Solid ground, terrain ridges, walls with gaps |
| 4 | Stability | Turbulence gusts, moving drones and balloons |
| 5 | Aerodynamics | Lift / weight / thrust / drag model with thrust rings and drag clouds |
| 6 | Focus | Narrow corridor, precision rings, focus meter for smooth control |
| 7 | Storm Front | Final challenge: fly through 10 storm gates to break the storm |

## Crash = full reset

Towers, walls, terrain and (from Level 3) the ground are solid. Hitting one
ends the run. Drones, balloons and lightning cost a ♥, and losing the last ♥
also ends the run. A SHIELD power-up absorbs one hit.

After the explosion and CRASHED screen, **PRESS START** creates a brand-new
run. Score, level, lives, obstacles, power-ups, timers and this run's
lessons all start from zero at Level 1.

## Project structure

```
index.html          cabinet layout + script order
style.css           arcade cabinet, CRT overlay, menus
game.js             state machine + main loop
js/ble.js           ORIGINAL Web Bluetooth code (do not edit)
js/core.js          namespace, constants, math helpers
js/input.js         BLE / keyboard → smoothed flight input
js/player.js        flight model
js/world.js         runs, level spawning patterns, particles
js/collision.js     collision checks → events
js/levels.js        level + power-up data
js/renderer.js      Canvas 2D pseudo-3D renderer + HUD
js/sprites.js       aircraft data + pixel sprites
js/font.js          5x7 bitmap font for the HUD
js/themes.js        colour themes
js/education.js     lesson cards, Flight School, data chip facts
js/achievements.js  achievement list
js/sound.js         Web Audio chiptune effects
js/storage.js       localStorage: high scores, unlocks, settings
esp32_ble_firmware.ino   controller firmware (unchanged)
```

## Unlocks

- **FALCON:** reach Level 3 · **ARROW:** reach Level 5
- **MONO GREEN theme:** collect 100 stars · **SUNSET ARCADE theme:** reach Level 4
- **Exhibition mode:** on the title screen, enter ↑ ↑ ↓ ↓ ← → ← → B A to
  unlock everything (enter it again to undo).
