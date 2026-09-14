/* ============================================================
   AAKASH UDAAN — WORLD
   Run state, object spawning (patterns), scrolling, turbulence,
   power-up timers and particles.

   A RUN is one arcade credit. createRun() always builds a brand
   new object — nothing survives from a previous run, which is
   how CRASH → START becomes a guaranteed full reset.
   ============================================================ */
(function (AU) {
  const Z = () => AU.SPAWN_Z;

  /* ------------------------------------------------------------
     RUN
  ------------------------------------------------------------ */
  function createRun(aircraftId, opts = {}) {
    const ac = AU.aircraftById(aircraftId);
    return {
      demo: !!opts.demo,
      aircraft: ac,
      mech: AU.aircraftMechanics(ac),
      player: new AU.Player(ac),

      levelIndex: 0,
      score: 0,
      lives: 3,
      maxLives: 3,

      objects: [],
      decor: [],
      particles: [],
      floaters: [],

      speed: 0,
      aeroSpeed: 0,
      corridor: 34,
      distance: 0,
      levelDist: 0,
      time: 0,
      levelTime: 0,
      aliveTime: 0,

      spawnTimer: 1.5,
      pylonDist: 0,
      cloudTimer: 0,

      power: { shield: 0, boost: 0, stabilizer: 0, magnet: 0, slow: 0 },
      wind: { x: 0, y: 0, tx: 0, ty: 0, timer: 4, warn: 0, px: 0, py: 0, hold: 0 },
      lift: 1,

      combo: 0,
      bestCombo: 0,
      pickupsNoHit: 0,
      highAltTime: 0,

      focus: 1,
      jitter: 0,
      lastRoll: 0,

      storm: { gates: 0, flash: 0 },

      lessonIndex: 0,
      lessonPending: null,
      lessonWait: 0,

      levelStats: freshLevelStats(),
      totals: { rings: 0, stars: 0, chips: 0, tokens: 0 },

      shake: 0,
      flash: 0,
      ctrl: { roll: 0, pitch: 0 }
    };
  }

  function freshLevelStats() {
    return { rings: 0, ringsMissed: 0, stars: 0, tokens: 0, chips: 0, hits: 0, power: 0, gates: 0 };
  }

  function startLevel(run, index) {
    const L = AU.LEVELS[index];
    run.levelIndex = index;
    run.objects.length = 0;
    run.decor.length = 0;
    run.levelDist = 0;
    run.levelTime = 0;
    run.spawnTimer = 2.2;
    run.pylonDist = 0;
    run.aeroSpeed = 0;
    run.corridor = L.corridor;
    run.combo = 0;
    run.focus = 1;
    run.lessonIndex = 0;
    run.lessonPending = null;
    run.storm = { gates: 0, flash: 0 };
    run.wind = { x: 0, y: 0, tx: 0, ty: 0, timer: 4, warn: 0, px: 0, py: 0, hold: 0 };
    run.levelStats = freshLevelStats();
    run.chipsThisLevel = 0;
    run.speed = L.speed[0] * run.mech.speedMul;
    run.player.x = 0;
    run.player.y = 24;
    run.player.vx = run.player.vy = 0;
    // pre-fill corridor markers so the world isn't empty
    for (let z = AU.PLAYER_Z + 6; z < Z(); z += 26) addPylons(run, z);
  }

  /* ------------------------------------------------------------
     SPAWN PATTERNS
  ------------------------------------------------------------ */
  function push(run, o) {
    o.prevZ = o.z;
    o.t = Math.random() * 10;
    run.objects.push(o);
    return o;
  }

  function lane(run, frac = 0.7) { return AU.rand(-run.corridor * frac, run.corridor * frac); }

  function collectible(run, x, y, z, allowChip) {
    let kind = AU.chance(0.35) ? 'star' : 'token';
    if (allowChip && !run.demo && run.chipsThisLevel < 1 && AU.chance(0.2)) {
      kind = 'chip';
      run.chipsThisLevel++;
    }
    push(run, { type: 'pickup', kind, x, y, z, r: 3 });
  }

  const PATTERNS = {
    ringLine(run) {
      const n = AU.randInt(3, 5);
      let x = lane(run, 0.6), y = AU.rand(12, 40);
      for (let i = 0; i < n; i++) {
        push(run, { type: 'ring', kind: 'normal', x, y, z: Z() + i * 28, r: 6.5 });
        if (AU.chance(0.4)) collectible(run, x, y, Z() + i * 28 + 1, false);
        x = AU.clamp(x + AU.rand(-9, 9), -run.corridor * 0.75, run.corridor * 0.75);
        y = AU.clamp(y + AU.rand(-6, 6), 8, 50);
      }
    },

    tokenArc(run) {
      const x0 = lane(run, 0.5), y0 = AU.rand(12, 42), dir = AU.chance(0.5) ? 1 : -1;
      for (let i = 0; i < 6; i++) {
        const x = x0 + Math.sin((i / 5) * Math.PI) * 10 * dir;
        const y = y0 + Math.sin((i / 5) * Math.PI) * 5;
        collectible(run, x, y, Z() + i * 14, i === 3);
      }
    },

    tokenColumn(run) {
      const x = lane(run, 0.6);
      for (let i = 0; i < 6; i++) collectible(run, x, 8 + i * 8, Z() + i * 6, i === 5);
    },

    towerSingle(run) {
      const h = AU.rand(18, 34);
      push(run, { type: 'tower', x: lane(run, 0.8), y: 0, z: Z(), w: AU.rand(8, 12), h, d: 8 });
    },

    towerPair(run) {
      const gapX = lane(run, 0.45);
      const gapW = AU.rand(17, 24);
      const w = AU.rand(9, 14);
      const h = AU.rand(34, 70);
      push(run, { type: 'tower', x: gapX - gapW / 2 - w / 2, y: 0, z: Z(), w, h, d: 8 });
      push(run, { type: 'tower', x: gapX + gapW / 2 + w / 2, y: 0, z: Z(), w, h: AU.rand(34, 70), d: 8 });
      if (AU.chance(0.5)) collectible(run, gapX, AU.rand(10, 30), Z(), true);
    },

    towerField(run) {
      for (let i = 0; i < 3; i++) {
        push(run, { type: 'tower', x: lane(run, 0.85), y: 0, z: Z() + i * 34, w: AU.rand(8, 12), h: AU.rand(22, 50), d: 8 });
      }
    },

    towerTall(run) {
      push(run, { type: 'tower', x: lane(run, 0.6), y: 0, z: Z(), w: AU.rand(12, 18), h: 90, d: 10 });
    },

    wallGap(run) {
      const gw = AU.rand(22, 28), gh = AU.rand(16, 20);
      const gx = lane(run, 0.5), gy = AU.rand(14, 46);
      push(run, { type: 'wall', x: 0, y: 0, z: Z(), w: (run.corridor + 50) * 2, h: 95, d: 4, gx, gy, gw, gh });
      collectible(run, gx, gy, Z() + 1, true);
    },

    ridge(run) {
      const full = AU.chance(0.5);
      const w = full ? (run.corridor + 50) * 2 : AU.rand(30, 46);
      push(run, { type: 'ridge', x: full ? 0 : lane(run, 0.6), y: 0, z: Z(), w, h: AU.rand(12, 26), d: 22 });
    },

    drone(run) {
      const count = AU.chance(0.4) ? 2 : 1;
      for (let i = 0; i < count; i++) {
        push(run, {
          type: 'drone', baseX: lane(run, 0.5), x: 0, y: AU.rand(10, 46), z: Z() + i * 30,
          w: 7, h: 3.5, d: 4, amp: AU.rand(8, 16), freq: AU.rand(1.4, 2.4)
        });
      }
    },

    balloons(run) {
      for (let i = 0; i < 3; i++) {
        push(run, {
          type: 'balloon', x: lane(run, 0.85), baseY: AU.rand(12, 46), y: 0, z: Z() + i * 22,
          w: 5, h: 6, d: 4, amp: AU.rand(3, 7), freq: AU.rand(1, 1.8)
        });
      }
    },

    dragCloud(run) {
      push(run, { type: 'drag', x: lane(run, 0.6), y: AU.rand(14, 42), z: Z(), w: 30, h: 22, d: 30 });
    },

    thrustRing(run) {
      push(run, { type: 'ring', kind: 'thrust', x: lane(run, 0.6), y: AU.rand(12, 44), z: Z(), r: 6.5 });
    },

    precisionPath(run) {
      const cx = lane(run, 0.25), cy = AU.rand(20, 36), ph = Math.random() * 6;
      for (let i = 0; i < 6; i++) {
        const x = cx + Math.sin(ph + i * 0.55) * run.corridor * 0.55;
        const y = AU.clamp(cy + Math.cos(ph + i * 0.55) * 9, 8, 50);
        push(run, { type: 'ring', kind: 'small', x, y, z: Z() + i * 24, r: 4.6 });
        if (i % 3 === 1) collectible(run, x, y, Z() + i * 24 + 1, false);
      }
    },

    stormGate(run) {
      const x = lane(run, 0.6), y = AU.rand(14, 42);
      push(run, { type: 'ring', kind: 'gate', x, y, z: Z(), r: 7.5 });
    },

    bolt(run) {
      const n = AU.chance(0.35) ? 2 : 1;
      for (let i = 0; i < n; i++) {
        push(run, { type: 'bolt', x: lane(run, 0.85), y: 0, z: Z() + i * 40, w: 5, h: 100, d: 5, active: false });
      }
    },

    powerup(run, L) {
      const kind = AU.weighted((L && L.powerWeights) || AU.DEFAULT_POWER_WEIGHTS);
      push(run, { type: 'power', kind, x: lane(run, 0.6), y: AU.rand(14, 40), z: Z(), r: 4 });
    }
  };

  function addPylons(run, z) {
    const x = run.corridor + 4;
    run.decor.push({ type: 'pylon', x: -x, z }, { type: 'pylon', x, z });
  }

  /* ------------------------------------------------------------
     PARTICLES (screen space)
  ------------------------------------------------------------ */
  function burst(run, sx, sy, colors, count, speed, life, size = 2, grav = 60) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = AU.rand(speed * 0.25, speed);
      run.particles.push({
        x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: AU.rand(life * 0.5, life), max: life,
        color: AU.pick(colors), size: AU.pick([size, size, size + 1]), grav
      });
    }
  }

  // expanding pixel shockwave ring
  function shock(run, sx, sy, color) {
    run.particles.push({ ring: true, x: sx, y: sy, r: 3, vr: 130, vx: 0, vy: 0, grav: 0, life: 0.45, max: 0.45, color, size: 2 });
  }

  function floater(run, text, sx, sy, color) {
    run.floaters.push({ text, x: sx, y: sy, life: 0.9, color });
  }

  /* ------------------------------------------------------------
     UPDATE
  ------------------------------------------------------------ */
  function update(run, dt, L, opts = {}) {
    const spawning = opts.spawning !== false;

    // power-up timers
    for (const k in run.power) if (run.power[k] > 0) run.power[k] = Math.max(0, run.power[k] - dt);

    // speed
    if (L) {
      const prog = AU.clamp(run.levelDist / L.length, 0, 1);
      let base = AU.lerp(L.speed[0], L.speed[1], prog) * run.mech.speedMul;
      if (L.aero) {
        run.aeroSpeed = Math.max(-26, run.aeroSpeed - 2.0 * dt); // drag always acts
        base += run.aeroSpeed;
      }
      if (run.power.boost > 0) base *= 1.45;
      run.speed = AU.approach(run.speed, base, 2.5, dt);
    }
    const slow = run.power.slow > 0 ? 0.6 : 1;
    const dz = run.speed * slow * dt;

    run.distance += dz;
    run.levelDist += dz;
    run.time += dt;
    run.levelTime += dt;

    // scroll objects
    for (const o of run.objects) {
      o.prevZ = o.z;
      o.z -= dz;
      o.t += dt * slow;
      if (o.type === 'drone') o.x = o.baseX + Math.sin(o.t * o.freq) * o.amp;
      if (o.type === 'balloon') o.y = o.baseY + Math.sin(o.t * o.freq) * o.amp;
      if (o.type === 'bolt') o.active = o.z < 150 && Math.floor(o.t * 12) % 5 !== 0;
      if (run.power.magnet > 0 && o.type === 'pickup' && o.z < 110 && o.z > AU.PLAYER_Z) {
        o.x = AU.approach(o.x, run.player.x, 4, dt);
        o.y = AU.approach(o.y, run.player.y, 4, dt);
      }
    }
    run.objects = run.objects.filter((o) => o.z > AU.NEAR_Z && !o.remove);

    // decor: corridor pylons + passing clouds
    for (const d of run.decor) d.z -= dz;
    run.decor = run.decor.filter((d) => d.z > AU.NEAR_Z);
    run.pylonDist += dz;
    if (run.pylonDist >= 26) { run.pylonDist -= 26; addPylons(run, Z()); }
    run.cloudTimer -= dt;
    if (run.cloudTimer <= 0) {
      run.cloudTimer = AU.rand(0.6, 1.6);
      const side = AU.chance(0.5) ? -1 : 1;
      run.decor.push({ type: 'cloud', x: side * AU.rand(run.corridor + 20, run.corridor + 110), y: AU.rand(35, 80), z: Z(), variant: AU.randInt(0, 3) });
    }

    // turbulence
    const turb = L ? L.turbulence : 0;
    const w = run.wind;
    if (turb > 0 && !run.demo) {
      if (w.warn > 0) {
        w.warn -= dt;
        if (w.warn <= 0) { w.tx = w.px; w.ty = w.py; w.hold = 1.4; AU.Sound.play('gust'); }
      } else if (w.hold > 0) {
        w.hold -= dt;
        if (w.hold <= 0) { w.tx = 0; w.ty = 0; }
      } else {
        w.timer -= dt;
        if (w.timer <= 0 && spawning) {
          w.timer = AU.rand(3, 6) / Math.max(0.5, turb);
          const s = AU.rand(10, 18) * turb;
          w.px = (AU.chance(0.5) ? -1 : 1) * s;
          w.py = AU.chance(0.35) ? (AU.chance(0.5) ? -1 : 1) * s * 0.5 : 0;
          w.warn = 0.9;
        }
      }
    }
    w.x = AU.approach(w.x, w.tx, 3, dt);
    w.y = AU.approach(w.y, w.ty, 3, dt);

    // spawner
    if (spawning && L) {
      run.spawnTimer -= dt * slow;
      if (run.spawnTimer <= 0) {
        const name = opts.patternTable ? AU.weighted(opts.patternTable) : AU.weighted(L.patterns);
        PATTERNS[name](run, L);
        run.spawnTimer = AU.rand(L.gap[0], L.gap[1]);
      }
    }

    updateParticles(run, dt);
    if (run.flash > 0) run.flash = Math.max(0, run.flash - dt * 6);
    if (run.storm.flash > 0) run.storm.flash -= dt;
  }

  function updateParticles(run, dt) {
    for (const p of run.particles) {
      if (p.ring) p.r += p.vr * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
      p.vx *= 1 - dt * 1.5;
      p.life -= dt;
    }
    run.particles = run.particles.filter((p) => p.life > 0);
    for (const f of run.floaters) { f.y -= 18 * dt; f.life -= dt; }
    run.floaters = run.floaters.filter((f) => f.life > 0);
    if (run.shake > 0) run.shake = Math.max(0, run.shake - dt * 10);
  }

  // Are there obstacles still between the spawn point and the player?
  function hazardsAhead(run) {
    return run.objects.some((o) => o.z > AU.PLAYER_Z - 4 && o.type !== 'pickup');
  }

  AU.World = { createRun, startLevel, update, updateParticles, burst, shock, floater, hazardsAhead, PATTERNS };
})(window.AU);
