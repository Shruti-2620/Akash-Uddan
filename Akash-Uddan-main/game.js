/* ============================================================
   AAKASH UDAAN — GAME (state machine + main loop)
   ------------------------------------------------------------
   Exactly one state is active at a time. Game.set() calls the
   old state's exit(), swaps, then calls the new state's enter().
   Only the active state's update() runs each frame.

     BOOT → TITLE → [START] → SETUP (aircraft + theme) → READY → PLAYING
     PLAYING ⇄ LEARNING / PAUSED
     PLAYING → LEVEL_COMPLETE → READY (next level)
     PLAYING → CRASHED → [START] → READY with a BRAND-NEW run
     LEVEL 7 → GAME_COMPLETE
     TITLE → HIGH_SCORES / FLIGHT_SCHOOL / WHY_THIS_PROJECT /
             HOW_IT_WORKS / HOW_TO_PLAY / ACHIEVEMENTS

   The Bluetooth code lives untouched in js/ble.js.
   ============================================================ */
(function (AU) {
  const S = AU.Save, UI = AU.UI, SC = AU.Screens, W = AU.World;

  const Game = {
    state: null,
    st: null,
    time: 0,          // seconds since the current state was entered
    run: null,        // the current arcade run (null outside a run)
    demo: null,       // attract-mode flight behind the menus
    credits: 0,
    titleIndex: 1,
    prevBle: false,
    lastTs: 0
  };
  AU.Game = Game;

  const STATES = {};

  function set(name, data = {}) {
    if (Game.st && Game.st.exit) Game.st.exit();
    Game.state = name;
    Game.st = STATES[name];
    Game.time = 0;
    document.body.dataset.state = name;
    AU.Input.disarmHold();
    if (Game.st.enter) Game.st.enter(data);
  }
  Game.set = set;

  function go(name, data) { AU.Sound.play('select'); set(name, data); }
  const level = () => AU.LEVELS[Game.run.levelIndex];
  const setText = (id, v) => { const el = UI.$(id); if (el && el.textContent !== v) el.textContent = v; };

  /* ------------------------------------------------------------
     ATTRACT-MODE DEMO FLIGHT (behind menus)
  ------------------------------------------------------------ */
  function ensureDemo(force) {
    if (!force && Game.demo && Game.demo.aircraft.id === S.settings.aircraft) return;
    Game.demo = W.createRun(S.settings.aircraft, { demo: true });
    W.startLevel(Game.demo, 0);
  }

  const DEMO_PATTERNS = { ringLine: 3, tokenArc: 2 };

  function updateDemo(dt, liveControl) {
    ensureDemo();
    const d = Game.demo, L = AU.LEVELS[0];
    let ctrl;
    if (liveControl) {
      ctrl = AU.Input.readControl(dt, d.mech, false);   // controller check: fly it for real
    } else {
      const next = d.objects.filter((o) => o.type === 'ring' && o.z > AU.PLAYER_Z).sort((a, b) => a.z - b.z)[0];
      const tx = next ? next.x : Math.sin(d.time * 0.4) * 20;
      const ty = next ? next.y : 26 + Math.sin(d.time * 0.3) * 10;
      ctrl = { roll: AU.clamp((tx - d.player.x) * 0.12, -0.8, 0.8), pitch: AU.clamp((ty - d.player.y) * 0.12, -0.8, 0.8) };
    }
    W.update(d, dt, L, { patternTable: DEMO_PATTERNS });
    d.player.update(dt, ctrl, d, L);
    for (const e of AU.Collision.check(d)) {
      if (e.kind === 'ring') {
        const sp = AU.Renderer.playerScreen(d);
        W.burst(d, sp.x, sp.y, [AU.Theme.current.ring, AU.Theme.current.ringLit], 10, 60, 0.5);
      }
    }
  }

  /* ------------------------------------------------------------
     RUN HELPERS
  ------------------------------------------------------------ */
  function flyRun(dt, { collide, spawning }) {
    const run = Game.run, L = level();
    const ctrl = AU.Input.readControl(dt, run.mech, run.power.stabilizer > 0);
    run.ctrl = ctrl;
    W.update(run, dt, L, { spawning });
    const ground = run.player.update(dt, ctrl, run, collide ? L : { ...L, groundCrash: false });
    return { ctrl, ground };
  }

  function floater(run, text, sp, color) { W.floater(run, text, sp.x, sp.y - 16, color); }

  function addScore(run, pts, label, sp, color) {
    const mult = run.power.boost > 0 ? 2 : 1;
    run.score += Math.round(pts * mult);
    if (label) floater(run, label, sp, color);
  }

  // Lesson cards: wait for a clear sky before pausing the action
  function scheduleLessons(run, L, dt) {
    const next = L.lessons[run.lessonIndex];
    if (!run.lessonPending && next && run.levelDist / L.length >= next.at) {
      run.lessonIndex++;
      if (S.settings.lessonCards === 'new' && S.data.lessonsSeen[next.id]) {
        const l = AU.LESSONS[next.id];
        UI.toast(l.title, l.tip || '', 'lesson');
      } else {
        run.lessonPending = next.id;
        run.lessonWait = 0;
      }
    }
    if (run.lessonPending) {
      run.lessonWait += dt;
      const clear = !W.hazardsAhead(run);
      if (clear || run.lessonWait > 6) {
        if (!clear) run.objects = run.objects.filter((o) => o.type === 'pickup' || o.z > 120);
        const id = run.lessonPending;
        run.lessonPending = null;
        set('LEARNING', { id });
        return true;
      }
    }
    return false;
  }

  /* Shield, lives and crashes. Returns true if the state changed. */
  function impact(e) {
    const run = Game.run, p = run.player, t = AU.Theme.current;
    if (p.invuln > 0) return false;
    const sp = AU.Renderer.playerScreen(run);

    if (run.power.shield > 0) {
      run.power.shield = 0;
      p.invuln = 1.5;
      run.shake = 0.6;
      if (e.obj) e.obj.done = true;
      if (e.cause === 'GROUND') p.bounce();
      AU.Sound.play('shield');
      AU.award('close_call');
      W.burst(run, sp.x, sp.y, [t.hud.good, t.ringLit], 24, 120, 0.6);
      W.shock(run, sp.x, sp.y, t.hud.good);
      floater(run, 'SHIELD SAVE!', sp, t.hud.good);
      return false;
    }

    if (e.kind === 'hull') {
      run.lives--;
      run.levelStats.hits++;
      run.pickupsNoHit = 0;
      run.combo = 0;
      p.invuln = 1.6;
      run.shake = 0.8;
      run.flash = 0.3;
      AU.Sound.play('hit');
      W.burst(run, sp.x, sp.y, t.explosion, 18, 90, 0.6);
      floater(run, '-♥ ' + e.cause, sp, t.hud.danger);
      if (run.lives > 0) return false;
      set('CRASHED', { cause: 'OUT OF LIVES: ' + e.cause });
      return true;
    }

    set('CRASHED', { cause: 'HIT ' + e.cause });
    return true;
  }

  function collectPickup(run, o) {
    const t = AU.Theme.current, sp = AU.Renderer.playerScreen(run);
    run.pickupsNoHit++;
    if (run.pickupsNoHit >= 20) AU.award('precision');

    if (o.kind === 'star') {
      run.levelStats.stars++; run.totals.stars++;
      S.addStars(1);
      addScore(run, 50, '+50', sp, t.star);
      AU.Sound.play('collect');
    } else if (o.kind === 'token') {
      run.levelStats.tokens++; run.totals.tokens++;
      addScore(run, 25, '+25', sp, t.token);
      AU.Sound.play('collect');
    } else if (o.kind === 'chip') {
      run.levelStats.chips++; run.totals.chips++;
      addScore(run, 250, 'DATA +250', sp, t.chip);
      AU.Sound.play('chip');
      const missing = AU.DATA_FACTS.map((_, i) => i).filter((i) => !S.data.chips[i]);
      const idx = missing.length ? AU.pick(missing) : AU.randInt(0, AU.DATA_FACTS.length - 1);
      S.collectChip(idx);
      UI.toast('DATA CHIP ' + AU.pad(idx + 1, 2), AU.DATA_FACTS[idx], 'chip');
      if (Object.keys(S.data.chips).length >= 5) AU.award('collector');
    }
    W.burst(run, sp.x, sp.y, [t.star, t.ringLit], 8, 50, 0.4);
  }

  function handleEvents(run, L, events, dt) {
    const t = AU.Theme.current;
    for (const e of events) {
      const o = e.obj;
      switch (e.kind) {
        case 'ring': {
          const sp = AU.Renderer.playerScreen(run);
          if (o.kind === 'gate') {
            run.storm.gates++;
            run.levelStats.gates++;
            run.storm.flash = 0.5;
            addScore(run, 500, 'GATE +500', sp, t.gate);
            AU.Sound.play('gate');
            W.burst(run, sp.x, sp.y, [t.gate, t.ringLit, t.bolt], 26, 110, 0.7);
            if (run.storm.gates === L.gatesNeeded) UI.toast('STORM BROKEN!', 'HOLD ON FOR THE FINISH', 'gold');
            break;
          }
          run.combo++;
          run.bestCombo = Math.max(run.bestCombo, run.combo);
          if (run.combo >= 10) AU.award('ring_master');
          let pts = 100 * Math.min(3, 1 + (run.combo - 1) * 0.25);
          if (L.precision) pts *= 1 + run.focus;
          if (o.kind === 'thrust') {
            run.aeroSpeed = Math.min(40, run.aeroSpeed + 24);
            pts += 50;
            AU.Sound.play('thrust');
          } else {
            AU.Sound.play('ring');
          }
          pts = Math.round(pts);
          run.levelStats.rings++;
          run.totals.rings++;
          addScore(run, pts, (o.kind === 'thrust' ? 'THRUST +' : '+') + pts * (run.power.boost > 0 ? 2 : 1), sp, o.kind === 'thrust' ? t.thrust : t.ring);
          W.burst(run, sp.x, sp.y, [t.ring, t.ringLit], 14, 80, 0.5);
          W.shock(run, sp.x, sp.y, t.ringLit);
          break;
        }

        case 'ringMiss':
          if (o.kind === 'gate') { UI.toast('MISSED GATE', 'MORE GATES INCOMING'); break; }
          if (run.combo >= 3) floater(run, 'COMBO LOST', AU.Renderer.playerScreen(run), t.hud.dim);
          run.combo = 0;
          run.levelStats.ringsMissed++;
          if (L.precision) run.focus = Math.max(0, run.focus - 0.2);
          break;

        case 'pickup':
          collectPickup(run, o);
          break;

        case 'power': {
          const info = AU.POWERUPS[o.kind];
          const sp = AU.Renderer.playerScreen(run);
          run.power[o.kind] = info.time;
          run.levelStats.power++;
          AU.Sound.play('power');
          addScore(run, 100, info.name + '!', sp, t.hud.good);
          W.burst(run, sp.x, sp.y, [t.powerFg, t.hud.good], 16, 90, 0.6);
          break;
        }

        case 'drag':
          if (L.aero) run.aeroSpeed = Math.max(-26, run.aeroSpeed - 45 * dt);
          else run.speed = Math.max(30, run.speed - 60 * dt);
          run.inDrag = 0.2;
          if (!o.flagged) {
            o.flagged = true;
            AU.Sound.play('drag');
            floater(run, 'DRAG!', AU.Renderer.playerScreen(run), t.hud.warn);
          }
          break;

        case 'hull':
        case 'crash':
          if (impact(e)) return true;
          break;
      }
    }
    return false;
  }

  function tickRun(run, L, ctrl, dt) {
    run.score += run.speed * dt * 0.2 * (run.power.boost > 0 ? 2 : 1);
    run.aliveTime += dt;
    if (run.aliveTime >= 60) AU.award('steady_hand');

    if (run.player.y * AU.ALT_FT >= 8000) {
      run.highAltTime += dt;
      if (run.highAltTime >= 3) AU.award('high_alt');
    } else {
      run.highAltTime = 0;
    }

    if (run.inDrag > 0) run.inDrag -= dt;

    // Level 6: smooth, small corrections build focus; twitchy ones drain it
    if (L.precision) {
      const jitter = Math.abs(ctrl.roll - run.lastRoll) / Math.max(dt, 0.001);
      run.jitter = AU.approach(run.jitter, jitter, 5, dt);
      run.focus = AU.clamp(run.focus + (run.jitter < 1.5 ? 0.06 : -0.3) * dt, 0, 1);
    }
    run.lastRoll = ctrl.roll;

    // warning beeps (throttled)
    run.warnCd = (run.warnCd || 0) - dt;
    const p = run.player;
    if (((p.warn.ground && L.groundCrash) || p.sinking || p.warn.corridor) && run.warnCd <= 0) {
      AU.Sound.play('warn');
      run.warnCd = 1.2;
    }
    if (run.wind.warn > 0 && !run.windWarned) { run.windWarned = true; AU.Sound.play('warn'); }
    if (run.wind.warn <= 0) run.windWarned = false;
  }

  function unlockSnapshot() {
    return {
      ac: AU.AIRCRAFT.filter((a) => AU.isAircraftUnlocked(a)).map((a) => a.id),
      th: AU.THEMES.filter((t) => AU.Theme.isUnlocked(t)).map((t) => t.id)
    };
  }

  function unlockDiff(before) {
    const out = [];
    AU.AIRCRAFT.forEach((a) => { if (AU.isAircraftUnlocked(a) && !before.ac.includes(a.id)) out.push('AIRCRAFT ' + a.name); });
    AU.THEMES.forEach((t) => { if (AU.Theme.isUnlocked(t) && !before.th.includes(t.id)) out.push('THEME ' + t.name); });
    return out;
  }

  /* ---------- high-score initials entry (shared) ---------- */
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  function initialsKey(s, e) {
    const k = e.key;
    const cycle = (d) => {
      const i = CHARS.indexOf(s.letters[s.pos]);
      s.letters[s.pos] = CHARS[(i + d + CHARS.length) % CHARS.length];
      AU.Sound.play('move');
    };
    if (k === 'ArrowUp') cycle(1);
    else if (k === 'ArrowDown') cycle(-1);
    else if (k === 'ArrowLeft' || k === 'Backspace') { s.pos = Math.max(0, s.pos - 1); AU.Sound.play('move'); }
    else if (k === 'ArrowRight') { s.pos = Math.min(2, s.pos + 1); AU.Sound.play('move'); }
    else if (k === 'Enter') { submitScore(s); return true; }
    else if (/^[a-z0-9]$/i.test(k)) { s.letters[s.pos] = k.toUpperCase(); s.pos = Math.min(2, s.pos + 1); AU.Sound.play('move'); }
    else return true;
    const box = UI.$('initials');
    if (box) box.innerHTML = s.letters.map((c, i) => `<span class="${i === s.pos ? 'on' : ''}">${c}</span>`).join('');
    return true;
  }

  function startInitials(s) {
    s.letters = String(S.settings.lastInitials || 'AAA').toUpperCase().padEnd(3, 'A').slice(0, 3).split('');
    s.pos = 0;
    s.rank = -1;
  }

  function submitScore(s) {
    const name = s.letters.join('');
    S.setSetting('lastInitials', name);
    s.rank = S.addScore({ name, score: s.info.score, level: s.info.level, aircraft: s.info.aircraft });
    AU.Sound.play('select');
    s.phase = 'panel';
    s.render();
    AU.Input.disarmHold();
  }

  /* ============================================================
     STATES
  ============================================================ */
  STATES.BOOT = {
    enter() {
      UI.show(SC.boot(), { after: (root) => root.firstElementChild.addEventListener('click', () => set('TITLE')) });
    },
    update() { if (Game.time > 3.4) set('TITLE'); },
    key() { AU.Sound.play('coin'); set('TITLE'); return true; }
  };

  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  STATES.TITLE = {
    enter(data) {
      Game.run = null;
      this.idle = 0;
      this.seq = [];
      UI.show(SC.title(Game.credits), {
        index: data.index != null ? data.index : Game.titleIndex,
        actions: {
          coin: () => {
            Game.credits = Math.min(99, Game.credits + 1);
            AU.Sound.play('coin');
            setText('credits', 'CREDIT ' + AU.pad(Game.credits, 2));
          },
          start: () => {
            if (Game.credits > 0) Game.credits--;
            AU.Sound.play('start');
            set('SETUP');
          },
          aircraft: () => go('AIRCRAFT_SELECT'),
          themes: () => go('THEME_SELECT'),
          controller: () => go('CONNECT_CONTROLLER'),
          howto: () => go('HOW_TO_PLAY'),
          school: () => go('FLIGHT_SCHOOL'),
          how: () => go('HOW_IT_WORKS'),
          why: () => go('WHY_THIS_PROJECT'),
          scores: () => go('HIGH_SCORES'),
          achievements: () => go('ACHIEVEMENTS')
        }
      });
    },
    exit() { Game.titleIndex = Math.max(0, UI.index); },
    update(dt) {
      updateDemo(dt);
      this.idle += dt;
      if (this.idle > 30) set('HIGH_SCORES', { attract: true });
    },
    key(e) {
      this.idle = 0;
      this.seq.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.seq = this.seq.slice(-KONAMI.length);
      if (this.seq.join() === KONAMI.join()) {
        S.data.unlockAll = !S.data.unlockAll;
        S.save();
        AU.Sound.play('achieve');
        UI.toast('EXHIBITION MODE', S.data.unlockAll ? 'ALL AIRCRAFT & THEMES UNLOCKED' : 'UNLOCKS RESTORED', 'gold');
        return true;
      }
      return false;
    }
  };

  // One screen after START: pick aircraft and theme, then fly.
  // The ESP32 can still be connected from the deck under the screen.
  STATES.SETUP = {
    enter() { this.render(AU.AIRCRAFT.length + AU.THEMES.length); },   // cursor starts on START FLIGHT
    render(index) {
      UI.show(SC.setup(), {
        index,
        after: (root) => SC.drawThumbs(root),
        actions: {
          pick: (id) => {
            const ac = AU.aircraftById(id);
            if (!AU.isAircraftUnlocked(ac)) {
              AU.Sound.play('denied');
              UI.toast('LOCKED', ac.unlock.text + ' TO UNLOCK');
              return;
            }
            S.setSetting('aircraft', id);
            ensureDemo(true);
            AU.Sound.play('select');
            this.render(UI.index);
          },
          theme: (id) => {
            const th = AU.Theme.byId(id);
            if (!AU.Theme.isUnlocked(th)) {
              AU.Sound.play('denied');
              UI.toast('LOCKED', th.unlock.text + ' TO UNLOCK');
              return;
            }
            S.setSetting('theme', id);
            AU.Theme.set(id);
            AU.Sound.play('select');
            this.render(UI.index);
          },
          go: () => { enterFullscreen(); AU.Sound.play('start'); set('READY', { newRun: true }); }
        },
        back: () => set('TITLE')
      });
    },
    update(dt) { updateDemo(dt); }
  };

  STATES.AIRCRAFT_SELECT = {
    enter(data) {
      this.flow = !!data.flow;
      this.render(Math.max(0, AU.AIRCRAFT.findIndex((a) => a.id === S.settings.aircraft)));
    },
    render(index) {
      UI.show(SC.aircraft(), {
        index,
        after: (root) => SC.drawThumbs(root),
        actions: {
          pick: (id) => {
            const ac = AU.aircraftById(id);
            if (!AU.isAircraftUnlocked(ac)) {
              AU.Sound.play('denied');
              UI.toast('LOCKED', ac.unlock.text + ' TO UNLOCK');
              return;
            }
            S.setSetting('aircraft', id);
            ensureDemo(true);
            AU.Sound.play('select');
            if (this.flow) set('THEME_SELECT', { flow: true });
            else { UI.toast(ac.name + ' SELECTED', ac.tag); this.render(AU.AIRCRAFT.indexOf(ac)); }
          }
        },
        back: () => set('TITLE')
      });
    },
    update(dt) { updateDemo(dt); }
  };

  STATES.THEME_SELECT = {
    enter(data) {
      this.flow = !!data.flow;
      this.render(Math.max(0, AU.THEMES.findIndex((t) => t.id === S.settings.theme)));
    },
    render(index) {
      UI.show(SC.themes(), {
        index,
        actions: {
          theme: (id) => {
            const th = AU.Theme.byId(id);
            if (!AU.Theme.isUnlocked(th)) {
              AU.Sound.play('denied');
              UI.toast('LOCKED', th.unlock.text + ' TO UNLOCK');
              return;
            }
            S.setSetting('theme', id);
            AU.Theme.set(id);
            AU.Sound.play('select');
            this.render(UI.index);
          },
          crt: () => { S.setSetting('crt', !S.settings.crt); applyCrt(); AU.Sound.play('select'); this.render(UI.index); },
          sound: () => { AU.Sound.toggle(); this.render(UI.index); },
          lessons: () => {
            S.setSetting('lessonCards', S.settings.lessonCards === 'always' ? 'new' : 'always');
            AU.Sound.play('select');
            this.render(UI.index);
          },
          done: () => go(this.flow ? 'CONNECT_CONTROLLER' : 'TITLE', { flow: this.flow })
        },
        back: () => set(this.flow ? 'AIRCRAFT_SELECT' : 'TITLE', { flow: this.flow })
      });
    },
    update(dt) { updateDemo(dt); }
  };

  STATES.CONNECT_CONTROLLER = {
    enter(data) {
      this.flow = !!data.flow;
      this.render(0);
    },
    render(index) {
      UI.show(SC.controller(this.flow), {
        index,
        actions: {
          // These simply click the original cabinet buttons, so the
          // untouched BLE handlers in ble.js do all the work.
          connect: () => { AU.Sound.play('select'); connectBtn.click(); },
          recenter: () => {
            if (!bleConnected) {
              AU.Sound.play('denied');
              UI.toast('RECENTER', 'CONNECT THE CONTROLLER FIRST');
              return;
            }
            recenterBtn.click();
            AU.Sound.play('select');
            UI.toast('RECENTERED', 'THIS POSITION IS NOW LEVEL FLIGHT');
          },
          invertRoll: () => { S.setSetting('invertRoll', !S.settings.invertRoll); AU.Sound.play('select'); this.render(UI.index); },
          invert: () => { S.setSetting('invertPitch', !S.settings.invertPitch); AU.Sound.play('select'); this.render(UI.index); },
          sens: () => {
            const v = S.settings.sensitivity;
            S.setSetting('sensitivity', v < 1 ? 1 : v > 1 ? 0.75 : 1.35);
            AU.Sound.play('select');
            this.render(UI.index);
          },
          go: () => {
            if (this.flow) { AU.Sound.play('start'); set('READY', { newRun: true }); }
            else go('TITLE');
          }
        },
        back: () => set(this.flow ? 'THEME_SELECT' : 'TITLE', { flow: this.flow })
      });
    },
    update(dt) {
      updateDemo(dt, true);
      const raw = AU.Input.rawTilt();
      const roll = bleConnected ? raw.roll : targetRoll;
      const pitch = bleConnected ? raw.pitch : targetPitch;
      const fmt = (v) => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(1).padStart(4, '0') + '°';
      setText('cc-text', bleConnected ? 'CONNECTED: ' + ((bleDevice && bleDevice.name) || 'ESP32').toUpperCase() : statusText.textContent.toUpperCase());
      setText('cc-roll', fmt(roll));
      setText('cc-pitch', fmt(pitch));
      setText('cc-connect', bleConnected ? 'DISCONNECT' : 'CONNECT ESP32');
      if (this.flow) setText('cc-go', bleConnected ? 'FLY WITH CONTROLLER ▶' : 'FLY WITH KEYBOARD ▶');
      const led = UI.$('cc-led');
      if (led) led.classList.toggle('on', bleConnected);
      const bar = (id, v, max) => {
        const el = UI.$(id);
        if (!el) return;
        const r = AU.clamp(v / max, -1, 1);
        el.style.left = (50 + Math.min(0, r) * 50) + '%';
        el.style.width = Math.abs(r) * 50 + '%';
      };
      bar('cc-roll-bar', roll, 45);
      bar('cc-pitch-bar', pitch, 35);
    }
  };

  STATES.READY = {
    enter(data) {
      if (data.newRun) {
        // A brand-new run object: score, level, lives, obstacles, timers,
        // power-ups, lessons-this-run … everything starts from zero.
        Game.run = W.createRun(S.settings.aircraft);
        W.startLevel(Game.run, 0);
        S.data.stats.flights++;
        S.save();
      }
      this.count = -1;
      UI.show(SC.ready(level(), Game.run));
    },
    update(dt) {
      flyRun(dt, { collide: false, spawning: false });
      const n = Math.floor(Game.time / 0.7);
      if (n === this.count) return;
      this.count = n;
      if (n >= 1 && n <= 3) { setText('ready-count', String(4 - n)); AU.Sound.play('count'); }
      if (n === 4) { setText('ready-count', 'GO!'); AU.Sound.play('go'); }
      if (n >= 5) set('PLAYING');
    },
    key(e) {
      if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape')) { set('PAUSED'); return true; }
      if ((e.key === 'Enter' || e.key === ' ') && Game.time > 0.4 && this.count < 4) Game.time = 0.7 * 4;
      return true;
    }
  };

  STATES.PLAYING = {
    enter() { UI.clear(); },
    update(dt) {
      const run = Game.run, L = level();
      if (scheduleLessons(run, L, dt)) return;

      const finishing = L.boss
        ? run.storm.gates >= L.gatesNeeded || run.levelDist >= L.length
        : run.levelDist >= L.length;

      const { ctrl, ground } = flyRun(dt, { collide: true, spawning: !run.lessonPending && !finishing });
      if (ground && impact({ kind: 'crash', cause: 'GROUND' })) return;
      if (handleEvents(run, L, AU.Collision.check(run), dt)) return;
      tickRun(run, L, ctrl, dt);

      if (finishing && !W.hazardsAhead(run)) set('LEVEL_COMPLETE');
    },
    key(e) {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        AU.Sound.play('select');
        set('PAUSED');
      }
      return true; // arrows fly the plane; never move menus here
    }
  };

  STATES.LEARNING = {
    enter(data) {
      this.id = data.id;
      const lesson = AU.LESSONS[data.id];
      const isNew = !S.data.lessonsSeen[data.id];
      S.markLessonSeen(data.id);
      AU.Sound.play('lesson');
      UI.show(SC.lesson(lesson, isNew), { actions: { ok: () => this.resume() } });
      if (isNew) UI.toast('FLIGHT SCHOOL', lesson.title + ' ADDED', 'lesson');
    },
    resume() { AU.Sound.play('select'); set('PLAYING'); },
    update(dt) {
      // the world is frozen here; only the card illustration animates
      const cv = UI.$('card-art');
      if (cv) AU.Renderer.drawCardArt(cv, this.id, Game.time);
      if (Game.time > 0.5 && AU.Input.updateHold(dt)) this.resume();
    },
    key(e) {
      if (e.key === 'p' || e.key === 'P') return true;
      return false;
    }
  };

  STATES.PAUSED = {
    enter(data) {
      UI.show(SC.pause(data.reason), {
        actions: {
          resume: () => { AU.Sound.play('select'); set('PLAYING'); },
          restart: () => { AU.Sound.play('start'); set('READY', { newRun: true }); },
          exit: () => { AU.Sound.play('back'); set('TITLE'); }
        },
        back: () => set('PLAYING')
      });
    },
    key(e) {
      if (e.key === 'p' || e.key === 'P') { AU.Sound.play('select'); set('PLAYING'); return true; }
      return false;
    }
  };

  STATES.CRASHED = {
    typing() { return this.phase === 'initials'; },
    enter(data) {
      const run = Game.run, t = AU.Theme.current, L = level();
      const sp = AU.Renderer.playerScreen(run);
      run.player.visible = false;
      run.shake = 1.2;
      run.flash = 1;
      W.burst(run, sp.x, sp.y, t.explosion, 60, 170, 1.3, 3, 90);
      W.burst(run, sp.x, sp.y, t.explosion, 30, 60, 1.6, 2, 20);
      W.shock(run, sp.x, sp.y, t.explosion[0]);
      AU.Sound.play('crash');
      UI.clear();

      this.cause = data.cause;
      this.phase = 'explode';
      this.info = { score: Math.floor(run.score), level: L.n, aircraft: run.aircraft.name };
      startInitials(this);
      S.recordLevelReached(L.n);
      S.save();
    },
    render() {
      UI.show(SC.crash({
        ...this.info, cause: this.cause, entry: this.phase === 'initials',
        letters: this.letters, pos: this.pos, rank: this.rank
      }), {
        actions: { start: () => this.restart() },
        back: () => { if (this.phase === 'panel') set('TITLE'); }
      });
    },
    restart() {
      AU.Sound.play('start');
      set('READY', { newRun: true });   // full reset: a new run object
    },
    update(dt) {
      const run = Game.run;
      W.updateParticles(run, dt);         // world + player frozen; only the explosion moves
      if (run.flash > 0) run.flash = Math.max(0, run.flash - dt * 3);
      if (this.phase === 'explode' && Game.time > 1.6) {
        this.phase = S.qualifies(this.info.score) ? 'initials' : 'panel';
        this.render();
      }
      if (this.phase !== 'explode' && Game.time > 2.4 && AU.Input.updateHold(dt)) {
        if (this.phase === 'initials') submitScore(this);
        else this.restart();
      }
    },
    key(e) {
      if (this.phase === 'explode') return true;
      if (this.phase === 'initials') return initialsKey(this, e);
      return false;
    }
  };

  STATES.LEVEL_COMPLETE = {
    enter() {
      const run = Game.run, L = level(), st = run.levelStats;
      run.objects.length = 0;
      const before = unlockSnapshot();

      const rows = [];
      const lvlBonus = 500 * L.n;
      const ringBonus = st.rings * 20;
      const lifeBonus = run.lives * 150;
      rows.push(['LEVEL BONUS', '+' + lvlBonus]);
      rows.push(['RINGS x' + st.rings, '+' + ringBonus]);
      rows.push(['LIVES x' + run.lives, '+' + lifeBonus]);
      let focusBonus = 0;
      if (L.precision) {
        focusBonus = Math.round(run.focus * 1500);
        rows.push(['FOCUS ' + Math.round(run.focus * 100) + '%', '+' + focusBonus]);
      }
      if (L.boss) rows.push(['STORM GATES', st.gates + '/' + L.gatesNeeded]);
      rows.push(['STARS / CHIPS', st.stars + ' / ' + st.chips]);
      run.score += lvlBonus + ringBonus + lifeBonus + focusBonus;

      S.recordLevelReached(Math.min(L.n + 1, AU.LEVELS.length));
      S.save();
      if (L.n === 1) AU.award('first_flight');
      if (bleConnected) AU.award('linked_up');

      this.last = run.levelIndex >= AU.LEVELS.length - 1;
      AU.Sound.play('levelup');
      UI.show(SC.levelComplete({
        title: this.last ? 'STORM FRONT CLEARED!' : 'LEVEL ' + AU.pad(L.n, 2) + ' COMPLETE',
        rows, score: Math.floor(run.score), learned: L.learned, unlocks: unlockDiff(before), last: this.last
      }), { actions: { next: () => this.next() } });
    },
    next() {
      const run = Game.run;
      AU.Sound.play('select');
      if (this.last) { set('GAME_COMPLETE'); return; }
      W.startLevel(run, run.levelIndex + 1);
      set('READY');
    },
    update(dt) {
      flyRun(dt, { collide: false, spawning: false });
      if (Game.time > 1.5 && AU.Input.updateHold(dt)) this.next();
    },
    key() { return false; }
  };

  STATES.GAME_COMPLETE = {
    typing() { return this.phase === 'initials'; },
    enter() {
      const run = Game.run;
      run.score += run.lives * 500;
      S.data.stats.gamesCompleted++;
      S.save();
      AU.award('master');
      AU.Sound.play('complete');
      this.info = { score: Math.floor(run.score), level: AU.LEVELS.length, aircraft: run.aircraft.name };
      startInitials(this);
      this.phase = S.qualifies(this.info.score) ? 'initials' : 'panel';
      this.render();
    },
    render() {
      UI.show(SC.gameComplete({
        ...this.info, entry: this.phase === 'initials', letters: this.letters, pos: this.pos, rank: this.rank
      }), {
        actions: {
          start: () => { AU.Sound.play('start'); set('READY', { newRun: true }); },
          scores: () => go('HIGH_SCORES', { highlight: this.rank }),
          title: () => go('TITLE')
        },
        back: () => { if (this.phase === 'panel') set('TITLE'); }
      });
    },
    update(dt) {
      const run = Game.run;
      flyRun(dt, { collide: false, spawning: false });
      if (Math.random() < dt * 3) {
        W.burst(run, AU.rand(40, 280), AU.rand(30, 120), AU.Theme.current.explosion, 30, 100, 1, 2, 40);
      }
      if (this.phase === 'initials' && Game.time > 2 && AU.Input.updateHold(dt)) submitScore(this);
    },
    key(e) {
      if (this.phase === 'initials') return initialsKey(this, e);
      return false;
    }
  };

  STATES.HIGH_SCORES = {
    enter(data) {
      this.attract = !!data.attract;
      UI.show(SC.highScores(data.highlight != null ? data.highlight : -1), {
        actions: { back: () => go('TITLE') },
        back: () => set('TITLE')
      });
    },
    update(dt) {
      updateDemo(dt);
      if (this.attract && Game.time > 10) set('TITLE');
    },
    key() {
      if (this.attract) { set('TITLE'); return true; }
      return false;
    }
  };

  // scroll long panels with ↑ ↓
  function scrollKey(e) {
    const scr = document.querySelector('#overlay .scr');
    if (!scr) return false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { scr.scrollBy(0, -40); return true; }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { scr.scrollBy(0, 40); return true; }
    return false;
  }

  function infoScreen(builder, extraUpdate) {
    return {
      enter() {
        UI.show(builder(), { actions: { back: () => go('TITLE') }, back: () => set('TITLE'), key: scrollKey });
      },
      update(dt) {
        updateDemo(dt);
        if (extraUpdate) extraUpdate(dt);
      }
    };
  }

  STATES.HOW_TO_PLAY = infoScreen(() => SC.howToPlay());
  STATES.ACHIEVEMENTS = infoScreen(() => SC.achievements());
  STATES.HOW_IT_WORKS = infoScreen(() => SC.howItWorks(), () => {
    setText('hiw-status', bleConnected ? 'CONNECTED' : 'NOT CONNECTED');
    setText('hiw-packet', bleConnected ? `${liveRoll.toFixed(2)},${livePitch.toFixed(2)}` : '--');
  });

  STATES.WHY_THIS_PROJECT = {
    enter() { this.page = 0; this.render(1); },
    render(index) {
      UI.show(SC.why(this.page), {
        index,
        actions: { prev: () => this.turn(-1), next: () => this.turn(1), back: () => go('TITLE') },
        back: () => set('TITLE'),
        key: (e) => {
          if (e.key === 'ArrowLeft') { this.turn(-1); return true; }
          if (e.key === 'ArrowRight') { this.turn(1); return true; }
          return false;
        }
      });
    },
    turn(d) {
      this.page = (this.page + d + 5) % 5;
      AU.Sound.play('move');
      this.render(UI.index);
    },
    update(dt) { updateDemo(dt); }
  };

  STATES.FLIGHT_SCHOOL = {
    enter() { this.sec = 0; this.item = null; this.render(0); },
    render(index) {
      UI.show(SC.school(this.sec, this.item), {
        index,
        actions: {
          section: (i) => { this.sec = +i; this.item = null; AU.Sound.play('select'); this.render(UI.index); },
          item: (id) => this.open(id),
          chip: (i) => this.open('chip:' + i)
        },
        onSelect: (el) => {
          if (el.dataset.act === 'item') this.open(el.dataset.arg);
          if (el.dataset.act === 'chip') this.open('chip:' + el.dataset.arg);
        },
        back: () => set('TITLE')
      });
    },
    open(id) {
      if (this.item === id) return;
      this.item = id;
      const box = UI.$('school-content');
      if (box) box.innerHTML = SC.schoolContent(id);
      if (AU.LAB_REQUIRED.includes(id) && S.markLabRead(id)) {
        const btn = [...document.querySelectorAll('[data-act="item"]')].find((b) => b.dataset.arg === id);
        if (btn) btn.classList.add('read');
        const read = AU.LAB_REQUIRED.filter((x) => S.data.labRead[x]).length;
        setText('school-count', AU.pad(read, 2) + ' / ' + AU.pad(AU.LAB_REQUIRED.length, 2));
        if (read === AU.LAB_REQUIRED.length) AU.award('thinker');
      }
    },
    update(dt) { updateDemo(dt); }
  };

  /* ============================================================
     INPUT DISPATCH + MAIN LOOP
  ============================================================ */
  function onKey(e) {
    if (!Game.st) return;
    const typing = Game.st.typing && Game.st.typing();
    if (!typing && !e.repeat) {
      if (e.key === 'm' || e.key === 'M') {
        const on = AU.Sound.toggle();
        UI.toast('SOUND', on ? 'ON' : 'OFF');
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
        return;
      }
    }
    if (Game.st.key && Game.st.key(e) === true) return;
    UI.key(e);
  }

  function applyCrt() { document.body.classList.toggle('crt-off', !S.settings.crt); }

  function enterFullscreen() {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) root.requestFullscreen().catch(() => {});
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else enterFullscreen();
  }

  function frame(ts) {
    const dt = Game.lastTs ? Math.min(0.05, (ts - Game.lastTs) / 1000) : 1 / 60;
    Game.lastTs = ts;
    Game.time += dt;

    // Watch the BLE connection flag (read-only) and react in the UI
    if (Game.prevBle !== bleConnected) {
      if (bleConnected) {
        UI.toast('CONTROLLER CONNECTED', 'HOLD LEVEL, THEN PRESS RECENTER');
        AU.Sound.play('coin');
      } else {
        UI.toast('CONTROLLER DISCONNECTED', 'PRESS CONNECT ESP32 TO RECONNECT');
        if (Game.state === 'PLAYING' || Game.state === 'READY') set('PAUSED', { reason: 'CONTROLLER DISCONNECTED' });
      }
      Game.prevBle = bleConnected;
    }

    try {
      if (Game.st.update) Game.st.update(dt);
      AU.Renderer.render(Game, dt);
      UI.tick();
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    if (!AU.Theme.isUnlocked(AU.Theme.byId(S.settings.theme))) S.settings.theme = 'day';
    if (!AU.isAircraftUnlocked(AU.aircraftById(S.settings.aircraft))) S.settings.aircraft = 'skyhawk';
    AU.Theme.current = AU.Theme.byId(S.settings.theme);
    AU.Renderer.init(document.getElementById('game'));
    AU.Theme.set(S.settings.theme);
    applyCrt();
    ensureDemo(true);

    AU.Input.dispatch = onKey;
    // keep keyboard focus off the cabinet buttons so SPACE/ENTER never toggle Bluetooth
    const fullBtn = document.getElementById('fullBtn');
    [connectBtn, recenterBtn, fullBtn].forEach((b) => b.addEventListener('mousedown', (e) => e.preventDefault()));
    fullBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
      fullBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
      // Esc leaves fullscreen: don't keep flying unattended
      if (!document.fullscreenElement && (Game.state === 'PLAYING' || Game.state === 'READY')) set('PAUSED');
    });
    document.addEventListener('pointermove', () => { if (Game.state === 'TITLE') STATES.TITLE.idle = 0; });

    Game.prevBle = bleConnected;
    set('BOOT');
    requestAnimationFrame(frame);
  }

  boot();
})(window.AU);
