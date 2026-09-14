/* ============================================================
   AAKASH UDAAN — INPUT
   Turns the controller's roll/pitch (read from the untouched
   BLE globals in ble.js) into normalised flight commands.

   Rules kept from the original game.js:
     • BLE tilt is used whenever bleConnected is true.
     • The keyboard is ONLY used when no controller is connected,
       so it can never fight the real ESP32.
     • input = live - zero, clamped to ±45 roll / ±35 pitch,
       smoothed into targetRoll / targetPitch.
     • Negative pitch climbs, positive roll banks right.

   Frontend-only additions: a small dead-zone, a gentle response
   curve, sensitivity and an optional pitch invert.
   ============================================================ */
(function (AU) {
  const keys = {};
  const FLIGHT_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'];

  function down(...names) { return names.some((n) => keys[n]); }

  // dead-zone + response curve → -1..1
  function shape(v, full, deadZone) {
    const a = Math.abs(v);
    if (a < deadZone) return 0;
    const n = Math.min(1, (a - deadZone) / (full - deadZone));
    return Math.sign(v) * Math.pow(n, 1.3);
  }

  AU.Input = {
    keys,
    dispatch: null,       // set by game.js: (event) => void
    hold: 0,              // tilt-and-hold progress 0..1
    holdArmed: true,

    /* Current tilt in degrees, after Recenter zeroing. The ESP32
       reports both axes opposite to the game's convention, so they
       are flipped here: tilt right = bank right, tilt back = climb. */
    rawTilt() {
      if (!bleConnected) return { roll: 0, pitch: 0 };
      const r = -(liveRoll - rollZero), p = -(livePitch - pitchZero);
      return { roll: isFinite(r) ? r : 0, pitch: isFinite(p) ? p : 0 };
    },

    /* Read + smooth + shape. mech = aircraft mechanics */
    readControl(dt, mech, stabilized) {
      const s = AU.Save.settings;
      let roll = 0, pitch = 0;
      const source = bleConnected ? 'ble' : 'keys';

      if (bleConnected) {
        const t = this.rawTilt();
        roll = t.roll;
        pitch = t.pitch;
      } else {
        if (down('ArrowLeft', 'a', 'A')) roll -= 30;
        if (down('ArrowRight', 'd', 'D')) roll += 30;
        if (down('ArrowUp', 'w', 'W')) pitch -= 25;
        if (down('ArrowDown', 's', 'S')) pitch += 25;
      }
      roll = AU.clamp(roll, -45, 45);
      pitch = AU.clamp(pitch, -35, 35);

      const rate = (mech ? mech.smoothing : 5) * (stabilized ? 0.6 : 1);
      targetRoll += (roll - targetRoll) * Math.min(1, dt * rate);
      targetPitch += (pitch - targetPitch) * Math.min(1, dt * rate);

      const sens = s.sensitivity || 1;
      let nRoll = shape(targetRoll, 30 / sens, 2.5);
      if (s.invertRoll) nRoll = -nRoll;
      let nPitch = -shape(targetPitch, 24 / sens, 2.5); // negative pitch = climb
      if (s.invertPitch) nPitch = -nPitch;

      return { roll: nRoll, pitch: nPitch, rawRoll: roll, rawPitch: pitch, source };
    },

    /* Exhibition helper: tilt RIGHT and hold ~1s to confirm a
       card without touching the keyboard. Must return to level
       before it can fire again. */
    updateHold(dt) {
      if (!bleConnected) { this.hold = 0; return false; }
      const r = this.rawTilt().roll;
      if (!this.holdArmed) {
        if (Math.abs(r) < 10) this.holdArmed = true;
        this.hold = 0;
        return false;
      }
      if (r > 22) {
        this.hold += dt / 1.0;
        if (this.hold >= 1) {
          this.hold = 0;
          this.holdArmed = false;
          return true;
        }
      } else {
        this.hold = Math.max(0, this.hold - dt * 2);
      }
      return false;
    },

    disarmHold() { this.holdArmed = false; this.hold = 0; }
  };

  window.addEventListener('keydown', (e) => {
    AU.Sound.unlock();
    // stop page scrolling, and stop Space/Enter "clicking" a focused cabinet button
    if (FLIGHT_KEYS.includes(e.key)) e.preventDefault();
    keys[e.key] = true;
    if (AU.Input.dispatch) AU.Input.dispatch(e);
  });
  window.addEventListener('keyup', (e) => {
    if (FLIGHT_KEYS.includes(e.key)) e.preventDefault();
    keys[e.key] = false;
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
})(window.AU);
