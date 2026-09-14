/* ============================================================
   AAKASH UDAAN — SPRITES & AIRCRAFT
   Original pixel-art sprites defined as tiny character grids.
   Symmetric sprites are written as a LEFT HALF whose last
   column is the centre line; the builder mirrors them.

   Palette keys:
     K outline   B body   b body shade   W wing   w wing shade
     A accent    C canopy L highlight    E exhaust
   ============================================================ */
(function (AU) {
  /* ------------------------------------------------------------
     AIRCRAFT — game mechanics, not real aircraft specifications
  ------------------------------------------------------------ */
  AU.AIRCRAFT = [
    {
      id: 'skyhawk', name: 'SKYHAWK', tag: 'BALANCED', num: '01',
      stats: { speed: 3, control: 3, stability: 3 },
      colors: { K: '#10121c', B: '#d83a2e', b: '#9e2219', W: '#f2f2f2', w: '#b4bccb', A: '#f4c430', C: '#5ec8f0', L: '#ffffff', E: '#ffb030' },
      unlock: null,
      rear: [
        '............K',
        '...........KA',
        '...........KA',
        '......KKKKKKB',
        '......KwwwwKB',
        'KKKKKKKKKKKBB',
        'KWWWWWWWWWKBL',
        'KAwwwwwwwwKBB',
        '.KKKKKKKKKKBB',
        '..........KEE',
        '...........KK'
      ],
      top: [
        '............K',
        '...........KB',
        '...........KC',
        '...........KC',
        '...........KB',
        'KKKKKKKKKKKKB',
        'KWWWWWWWWWWKB',
        'KAwwwwwwwwwKB',
        '.KKKKKKKKKKKB',
        '...........KB',
        '...........KB',
        '...........KB',
        '........KKKKB',
        '........KWWKA',
        '........KKKKK'
      ]
    },
    {
      id: 'falcon', name: 'FALCON', tag: 'FAST', num: '02',
      stats: { speed: 5, control: 2, stability: 2 },
      colors: { K: '#0c1020', B: '#3a7bd5', b: '#23508f', W: '#d3dce4', w: '#8a9aa8', A: '#e03030', C: '#f4c430', L: '#ffffff', E: '#ff7a30' },
      unlock: { text: 'REACH LEVEL 3', test: (s) => s.stats.bestLevel >= 3 },
      rear: [
        '.......K....',
        '......KAK...',
        '......KAK.KK',
        'KKKKKKKKKKBB',
        'KWWWWWWWWKBL',
        '.KwwwwwwwKBB',
        '..KKKKKKKKEE',
        '..........KK'
      ],
      top: [
        '............K',
        '...........KB',
        '...........KB',
        '...........KC',
        '..........KBC',
        '.........KWKB',
        '........KWWKB',
        '.......KWWWKB',
        '......KWWWWKB',
        '.....KWWWWWKB',
        '....KWwwwwwKB',
        '...KAwwwwwwKB',
        '...KKKKKKKKKB',
        '.........KAKB',
        '.........KKKE'
      ]
    },
    {
      id: 'orbit', name: 'ORBIT', tag: 'STABLE', num: '03',
      stats: { speed: 2, control: 3, stability: 5 },
      colors: { K: '#101418', B: '#f4c430', b: '#b8901c', W: '#3aa060', w: '#1f6f40', A: '#ffffff', C: '#5ec8f0', L: '#fff6c8', E: '#ff9a30' },
      unlock: null,
      rear: [
        '.............K',
        '............KA',
        '............KA',
        '..........KKKB',
        '.........KBBBB',
        'KKKKKKKKKKBBLB',
        'KWWWWWWWWWBBBB',
        'KwwwwwwwwwKBBB',
        'KAK......KKBBB',
        '.K.........KEE',
        '............KK'
      ],
      top: [
        '...........KK',
        '..........KBB',
        '..........KCC',
        '..........KCC',
        '..........KBB',
        '.KKKKKKKKKKBB',
        'KAWWWWWWWWWBB',
        'KAwwwwwwwwwBB',
        '.KKKKKKKKKKBB',
        '..........KBB',
        '..........KBB',
        '.......KKKKBB',
        '.......KWWWKA',
        '.......KKKKKK'
      ]
    },
    {
      id: 'arrow', name: 'ARROW', tag: 'AGILE', num: '04',
      stats: { speed: 4, control: 5, stability: 2 },
      colors: { K: '#0a0a14', B: '#9a48e0', b: '#6a2aa8', W: '#56607a', w: '#343c52', A: '#ff7030', C: '#7ff0ff', L: '#e8d0ff', E: '#ffb030' },
      unlock: { text: 'REACH LEVEL 5', test: (s) => s.stats.bestLevel >= 5 },
      rear: [
        '...........K',
        '..........KA',
        '..........KA',
        '..........KA',
        'KK.......KBB',
        'KAKK....KBBL',
        '.KWWKKKKKBBB',
        '..KwwWWWWKBB',
        '....KKKKKKEE',
        '..........KK'
      ],
      top: [
        '............K',
        '...........KB',
        '..........KKC',
        '.........KAKC',
        '..........KKB',
        '...........KB',
        '.........KKKB',
        '.......KKWWKB',
        '.....KKWWWWKB',
        '...KKWWWwwwKB',
        '..KAWWwwwwwKB',
        '..KKKKKKKKKKB',
        '..........KAB',
        '..........KKE'
      ]
    }
  ];

  // Turn star ratings into flight-model numbers
  AU.aircraftMechanics = (ac) => ({
    speedMul: 0.7 + ac.stats.speed * 0.1,          // 2★ 0.9 … 5★ 1.2
    lateral: 22 + ac.stats.control * 6,            // max sideways speed
    response: 2.0 + ac.stats.control * 0.75,       // how fast it reaches that speed
    climb: 15 + ac.stats.control * 2,              // max climb/dive rate
    smoothing: 7.5 - ac.stats.stability * 0.7,     // input smoothing rate (lower = smoother)
    gustResist: 1.3 - ac.stats.stability * 0.18    // turbulence multiplier
  });

  AU.aircraftById = (id) => AU.AIRCRAFT.find((a) => a.id === id) || AU.AIRCRAFT[0];
  AU.isAircraftUnlocked = (ac) => !ac.unlock || AU.Save.data.unlockAll || ac.unlock.test(AU.Save.data);

  /* ------------------------------------------------------------
     SMALL ICON SPRITES
  ------------------------------------------------------------ */
  const ICONS = {
    star: { mirror: true, rows: ['...Y', '...Y', 'YYYY', '.YYY', '..YY', '.YY.', '.Y..'] },
    token: { mirror: false, rows: ['.KKKKK.', 'KTTTTTK', 'KTFFFTK', 'KTFTTTK', 'KTFFTTK', 'KTFTTTK', '.KKKKK.'] },
    chip: { mirror: false, rows: ['.P.P.P.', 'PKKKKKP', '.KCLCK.', 'PKCCCKP', '.KCCCK.', 'PKKKKKP', '.P.P.P.'] },
    heart: { mirror: true, rows: ['.KK.', 'KRRK', 'KRRR', '.KRR', '..KR', '...K'] },
    heartEmpty: { mirror: true, rows: ['.KK.', 'K..K', 'K...', '.K..', '..K.', '...K'] },
    bird: { mirror: true, rows: ['K...', 'HK..', '.HK.', '..HH'] },
    drone: { mirror: true, rows: ['KKK.....', '.K......', '.KKKKKKK', '..KHHHHH', '...KHLLH', '....KKKK'] }
  };

  function iconPalette(name, t) {
    switch (name) {
      case 'star': return { Y: t.star };
      case 'token': return { K: t.hud.bg, T: t.token, F: t.hud.bg };
      case 'chip': return { P: t.hud.dim, K: t.hud.bg, C: t.chip, L: t.ringLit };
      case 'heart': return { K: t.hud.bg, R: t.hud.danger };
      case 'heartEmpty': return { K: t.hud.dim };
      case 'bird': return { K: t.hud.bg, H: t.hazard };
      case 'drone': return { K: t.hud.bg, H: t.hazard, L: t.hazard2 };
      default: return {};
    }
  }

  /* ------------------------------------------------------------
     BUILDER + CACHE
  ------------------------------------------------------------ */
  const cache = new Map();

  function expandRows(rows, mirror) {
    if (!mirror) return rows;
    const w = Math.max(...rows.map((r) => r.length));
    return rows.map((r) => {
      const half = r.padStart(w, '.');
      return half + half.slice(0, -1).split('').reverse().join('');
    });
  }

  function build(rows, palette, mirror) {
    const full = expandRows(rows, mirror);
    const h = full.length;
    const w = Math.max(...full.map((r) => r.length));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < full[y].length; x++) {
        const col = palette[full[y][x]];
        if (!col) continue;
        g.fillStyle = AU.Theme.quantize(col);
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  AU.Sprites = {
    clear() { cache.clear(); },

    aircraft(id, view) {
      const key = `ac|${id}|${view}|${AU.Theme.current.id}`;
      if (!cache.has(key)) {
        const ac = AU.aircraftById(id);
        const pal = { ...ac.colors };
        if (AU.Theme.current.mono) pal.K = AU.Theme.current.mono[0];
        cache.set(key, build(ac[view], pal, true));
      }
      return cache.get(key);
    },

    icon(name) {
      const key = `icon|${name}|${AU.Theme.current.id}`;
      if (!cache.has(key)) {
        const def = ICONS[name];
        cache.set(key, build(def.rows, iconPalette(name, AU.Theme.current), def.mirror));
      }
      return cache.get(key);
    },

    // Procedural chunky cloud (union of circles snapped to pixels)
    cloud(variant, dark = false) {
      const key = `cloud|${variant}|${dark}|${AU.Theme.current.id}`;
      if (!cache.has(key)) {
        const t = AU.Theme.current;
        const rnd = AU.seeded(variant * 97 + 13);
        const w = 26 + Math.floor(rnd() * 14), h = 12;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        const blobs = [];
        for (let i = 0; i < 5; i++) {
          blobs.push({ x: 5 + rnd() * (w - 10), y: 6 + rnd() * 3, r: 3 + rnd() * 4 });
        }
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let inside = false;
            for (const b of blobs) if ((x - b.x) ** 2 + ((y - b.y) * 1.3) ** 2 < b.r * b.r) inside = true;
            if (!inside || y > h - 2) continue;
            if (dark) g.fillStyle = y > h - 5 || (x + y) % 5 === 0 ? t.cloudShade : t.dragCloud;
            else g.fillStyle = y > h - 5 ? t.cloudShade : t.cloud;
            g.fillRect(x, y, 1, 1);
          }
        }
        cache.set(key, c);
      }
      return cache.get(key);
    },

    // Large thumbnail canvas for menus (scaled by CSS, pixelated)
    thumbnail(id) {
      return this.aircraft(id, 'top');
    }
  };

  AU.Theme.onChange(() => AU.Sprites.clear());
})(window.AU);
