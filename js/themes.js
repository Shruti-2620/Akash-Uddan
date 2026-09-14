/* ============================================================
   AAKASH UDAAN — THEMES
   Flat, limited arcade palettes. Each theme defines colour
   "roles" used by the canvas renderer and the DOM menus.
   Mono themes (amber / green) are generated from a 5-step ramp
   so every sprite is re-coloured into that single phosphor.
   ============================================================ */
(function (AU) {
  function monoTheme(id, name, r, unlock) {
    // r[0] darkest … r[4] brightest
    return {
      id, name, unlock, mono: r,
      sky: [r[0], r[0], r[0], r[0]],
      stars: r[2],
      sun: { kind: 'moon', color: r[3], color2: r[2], x: 240, y: 58, r: 11 },
      far: r[1], near: r[2],
      ground: [r[0], r[0]], grid: r[2], horizonLine: r[3],
      cloud: r[1], cloudShade: r[0],
      tower: [r[1], r[0], r[3]], wall: [r[1], r[0]], ridge: [r[1], r[0], r[2]],
      ring: r[3], ringLit: r[4], gate: r[4], pylon: r[2], pylonTip: r[4],
      token: r[3], star: r[4], chip: r[3], powerBg: r[1], powerFg: r[4],
      hazard: r[3], hazard2: r[2], bolt: r[4], boltWarn: r[2], dragCloud: r[1], thrust: r[4],
      shadow: r[1],
      hud: { bg: r[0], border: r[2], text: r[4], dim: r[2], accent: r[3], warn: r[4], danger: r[4], good: r[3] },
      explosion: [r[4], r[3], r[2], r[1]],
      ui: { bg: r[0], panel: r[0], border: r[3], text: r[4], dim: r[2], accent: r[3], hi: r[4], danger: r[4] }
    };
  }

  AU.THEMES = [
    {
      id: 'day', name: 'DAY ARCADE', unlock: null, mono: null,
      sky: ['#2a6fd6', '#3f89e6', '#62a7f2', '#9fd2fa'],
      stars: null,
      sun: { kind: 'sun', color: '#fff3a6', color2: '#ffd84a', x: 250, y: 60, r: 12 },
      far: '#7c9cc7', near: '#4d8a58',
      ground: ['#58b050', '#469a41'], grid: null, horizonLine: '#dff3ff',
      cloud: '#fbf8ee', cloudShade: '#c7d6e6',
      tower: ['#243155', '#161f3a', '#ffe28a'], wall: ['#8a5530', '#5f3a1f'], ridge: ['#7a6a44', '#56492e', '#f4f1e6'],
      ring: '#ffc400', ringLit: '#ffffff', gate: '#ff4fa3', pylon: '#f4ead0', pylonTip: '#ff5a3c',
      token: '#ffc400', star: '#fff06a', chip: '#27d17f', powerBg: '#12182b', powerFg: '#ffffff',
      hazard: '#e23b2e', hazard2: '#ffd84a', bolt: '#ffffff', boltWarn: '#ffd84a', dragCloud: '#9aa8b8', thrust: '#27d1ff',
      shadow: '#2f6b2c',
      hud: { bg: '#0e1633', border: '#f4ead0', text: '#f4ead0', dim: '#8ea3c2', accent: '#ffc400', warn: '#ff9a1f', danger: '#ff3b30', good: '#27d17f' },
      explosion: ['#ffffff', '#ffd84a', '#ff6a1f', '#8a2a10'],
      ui: { bg: '#0c1330', panel: '#131d44', border: '#f4ead0', text: '#f4ead0', dim: '#8ea3c2', accent: '#ffc400', hi: '#5ec8f0', danger: '#ff5a3c' }
    },
    {
      id: 'night', name: 'NIGHT FLIGHT', unlock: null, mono: null,
      sky: ['#02030a', '#050a1c', '#0a1430', '#122247'],
      stars: '#ffffff',
      sun: { kind: 'moon', color: '#eaf6ff', color2: '#9fb7d6', x: 70, y: 56, r: 10 },
      far: '#0d1b3d', near: '#081229',
      ground: ['#040914', '#081530'], grid: '#1ee0ff', horizonLine: '#1ee0ff',
      cloud: '#1b2b52', cloudShade: '#101b39',
      tower: ['#0d1428', '#060a16', '#ffd23f'], wall: ['#16264f', '#0b1633'], ridge: ['#12224a', '#09142e', '#5d7aa0'],
      ring: '#1ee0ff', ringLit: '#ffffff', gate: '#ffd23f', pylon: '#1ee0ff', pylonTip: '#ffd23f',
      token: '#ffd23f', star: '#ffffff', chip: '#3dff9a', powerBg: '#0a1430', powerFg: '#1ee0ff',
      hazard: '#ff4d6d', hazard2: '#ffd23f', bolt: '#eaffff', boltWarn: '#1ee0ff', dragCloud: '#2a3a62', thrust: '#ffd23f',
      shadow: '#0a1a3a',
      hud: { bg: '#02030a', border: '#1ee0ff', text: '#e6f7ff', dim: '#5d7aa0', accent: '#1ee0ff', warn: '#ffd23f', danger: '#ff4d6d', good: '#3dff9a' },
      explosion: ['#ffffff', '#ffd23f', '#ff7a3d', '#1ee0ff'],
      ui: { bg: '#02030a', panel: '#07102a', border: '#1ee0ff', text: '#e6f7ff', dim: '#5d7aa0', accent: '#ffd23f', hi: '#1ee0ff', danger: '#ff4d6d' }
    },
    monoTheme('amber', 'CRT AMBER', ['#110700', '#3f2100', '#9a5200', '#ffae00', '#ffd88a'], null),
    monoTheme('green', 'MONO GREEN', ['#010902', '#0a3011', '#1a7a2a', '#33ff66', '#b8ffc8'],
      { text: 'COLLECT 100 STARS', test: (s) => s.stats.totalStars >= 100 }),
    {
      id: 'sunset', name: 'SUNSET ARCADE', mono: null,
      unlock: { text: 'REACH LEVEL 4', test: (s) => s.stats.bestLevel >= 4 },
      sky: ['#1f0b3d', '#4a1667', '#9a2a6a', '#ef6a3a'],
      stars: '#ffd6f0',
      sun: { kind: 'synth', color: '#ffd23f', color2: '#ff4fa3', x: 160, y: 30, r: 26 },
      far: '#3b0f55', near: '#220a38',
      ground: ['#1a0730', '#2b0d4a'], grid: '#ff4fa3', horizonLine: '#ffd23f',
      cloud: '#ff9e6b', cloudShade: '#c2456b',
      tower: ['#1c0b33', '#10051f', '#ffd23f'], wall: ['#5a1a6e', '#360d47'], ridge: ['#3b0f55', '#220a38', '#ff9e6b'],
      ring: '#ffd23f', ringLit: '#ffffff', gate: '#3dffe0', pylon: '#ff4fa3', pylonTip: '#ffd23f',
      token: '#ffd23f', star: '#fff2a8', chip: '#3dffe0', powerBg: '#1f0b3d', powerFg: '#ffd23f',
      hazard: '#ff3b5c', hazard2: '#ffd23f', bolt: '#ffffff', boltWarn: '#ff4fa3', dragCloud: '#7a3a7a', thrust: '#3dffe0',
      shadow: '#12041f',
      hud: { bg: '#12041f', border: '#ffd23f', text: '#ffe9d6', dim: '#b07ab0', accent: '#ffd23f', warn: '#ff9e3d', danger: '#ff3b5c', good: '#3dffe0' },
      explosion: ['#ffffff', '#ffd23f', '#ff4fa3', '#6a1a8a'],
      ui: { bg: '#12041f', panel: '#1f0b3d', border: '#ffd23f', text: '#ffe9d6', dim: '#b07ab0', accent: '#ffd23f', hi: '#ff4fa3', danger: '#ff3b5c' }
    }
  ];

  const listeners = [];

  AU.Theme = {
    current: AU.THEMES[0],

    byId(id) { return AU.THEMES.find((t) => t.id === id) || AU.THEMES[0]; },

    isUnlocked(theme) {
      return !theme.unlock || AU.Save.data.unlockAll || theme.unlock.test(AU.Save.data);
    },

    onChange(fn) { listeners.push(fn); },

    set(id) {
      const t = this.byId(id);
      this.current = t;
      const root = document.documentElement.style;
      for (const k in t.ui) root.setProperty('--ui-' + k, t.ui[k]);
      root.setProperty('--hud-accent', t.hud.accent);
      listeners.forEach((fn) => fn(t));
    },

    // Map any colour into a mono theme's phosphor ramp (by luminance)
    quantize(hex) {
      const ramp = this.current.mono;
      if (!ramp || !hex) return hex;
      const n = parseInt(hex.slice(1), 16);
      const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      const idx = AU.clamp(Math.round(1 + lum * 3.2), 1, 4);
      return ramp[idx];
    }
  };
})(window.AU);
