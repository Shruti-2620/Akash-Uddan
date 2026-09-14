/* ============================================================
   AAKASH UDAAN — CORE
   Shared namespace, screen constants and small math helpers.
   Every other module attaches itself to window.AU so nothing
   collides with the BLE globals declared in ble.js.
   ============================================================ */
window.AU = window.AU || {};

(function (AU) {
  // Internal arcade resolution (4:3), scaled up with pixelated CSS
  AU.W = 320;
  AU.H = 240;

  // Pseudo-3D camera
  AU.FOCAL = 150;        // projection focal length (px)
  AU.HORIZON = 92;       // base horizon line (px from top)
  AU.PLAYER_Z = 14;      // depth at which the player flies
  AU.SPAWN_Z = 300;      // depth at which new objects appear
  AU.NEAR_Z = 2;         // objects closer than this are removed

  // Flight envelope (world units)
  AU.ALT_MIN = 3;
  AU.ALT_MAX = 58;
  AU.ALT_FT = 150;       // world unit → displayed feet
  AU.SPEED_KT = 4;       // world speed → displayed speed

  AU.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  AU.lerp = (a, b, t) => a + (b - a) * t;
  AU.rand = (a, b) => a + Math.random() * (b - a);
  AU.randInt = (a, b) => Math.floor(AU.rand(a, b + 1));
  AU.chance = (p) => Math.random() < p;
  AU.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  // frame-rate independent exponential approach
  AU.approach = (v, target, rate, dt) => v + (target - v) * Math.min(1, rate * dt);
  AU.pad = (n, len, ch = '0') => String(Math.max(0, Math.floor(n))).padStart(len, ch);

  // Weighted random choice from { key: weight }
  AU.weighted = (table) => {
    let total = 0;
    for (const k in table) total += table[k];
    let r = Math.random() * total;
    for (const k in table) { r -= table[k]; if (r <= 0) return k; }
    return Object.keys(table)[0];
  };

  // Deterministic pseudo-random (for mountains / star fields)
  AU.seeded = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  AU.escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
})(window.AU);
