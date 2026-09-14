/* ============================================================
   AAKASH UDAAN — UI / MENUS
   DOM screens layered over the game canvas, inside the arcade
   screen. Exactly ONE screen exists at a time: UI.show()
   replaces the overlay's contents on every state change.

   Navigation is arcade-style: arrows / WASD move the cursor
   (spatially, so grids work), ENTER / SPACE select, ESC backs
   out. Mouse hover + click work too.
   ============================================================ */
(function (AU) {
  const overlay = document.getElementById('overlay');
  const toastBox = document.getElementById('toasts');
  const esc = AU.escapeHtml;
  const pad = AU.pad;

  const DIRS = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right'
  };

  const UI = {
    items: [],
    index: 0,
    opts: {},

    mouse: { x: -1, y: -1 },

    show(html, opts = {}) {
      overlay.innerHTML = html;
      this.opts = opts;
      this.items = [...overlay.querySelectorAll('[data-act]')];
      // Hover only moves the cursor after the mouse really moves, so a
      // new screen appearing under a still pointer keeps its default item.
      const at = { ...this.mouse };
      this.items.forEach((el, i) => {
        el.setAttribute('tabindex', '-1');
        el.addEventListener('mousedown', (e) => e.preventDefault());
        el.addEventListener('mousemove', (e) => {
          if (e.clientX === at.x && e.clientY === at.y) return;
          if (this.index !== i) this.select(i, false);
        });
        el.addEventListener('click', (e) => {
          e.preventDefault();
          AU.Sound.unlock();
          this.select(i, false);
          this.activate(el);
        });
      });
      if (opts.after) opts.after(overlay);
      this.index = -1;
      if (this.items.length) this.select(AU.clamp(opts.index || 0, 0, this.items.length - 1), false);
    },

    clear() { this.show(''); },

    select(i, sound = true) {
      if (!this.items.length) return;
      const prev = this.items[this.index];
      if (prev) prev.classList.remove('sel');
      this.index = i;
      const el = this.items[i];
      el.classList.add('sel');
      el.scrollIntoView({ block: 'nearest' });
      if (sound && prev !== el) AU.Sound.play('move');
      if (this.opts.onSelect) this.opts.onSelect(el);
    },

    activate(el) {
      if (!el) return;
      const fn = this.opts.actions && this.opts.actions[el.dataset.act];
      if (fn) fn(el.dataset.arg, el);
    },

    // spatial navigation: nearest item in the pressed direction
    move(dir) {
      const n = this.items.length;
      if (!n) return;
      const cur = this.items[this.index].getBoundingClientRect();
      const cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2;
      let best = -1, bestScore = Infinity;
      this.items.forEach((el, i) => {
        if (i === this.index) return;
        const r = el.getBoundingClientRect();
        const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
        let primary, secondary;
        if (dir === 'up') { if (dy > -3) return; primary = -dy; secondary = Math.abs(dx); }
        if (dir === 'down') { if (dy < 3) return; primary = dy; secondary = Math.abs(dx); }
        if (dir === 'left') { if (dx > -3) return; primary = -dx; secondary = Math.abs(dy); }
        if (dir === 'right') { if (dx < 3) return; primary = dx; secondary = Math.abs(dy); }
        const score = primary + secondary * 2.5;
        if (score < bestScore) { bestScore = score; best = i; }
      });
      if (best < 0) best = (dir === 'up' || dir === 'left') ? (this.index - 1 + n) % n : (this.index + 1) % n;
      this.select(best);
    },

    key(e) {
      if (this.opts.key && this.opts.key(e) === true) return true;
      const dir = DIRS[e.key];
      if (dir) { this.move(dir); return true; }
      if (e.key === 'Enter' || e.key === ' ') {
        if (!e.repeat) this.activate(this.items[this.index]);
        return true;
      }
      if ((e.key === 'Escape' || e.key === 'Backspace') && this.opts.back) {
        AU.Sound.play('back');
        this.opts.back();
        return true;
      }
      return false;
    },

    toast(title, text, kind = '') {
      const el = document.createElement('div');
      el.className = 'toast ' + kind;
      el.innerHTML = `<b>${esc(title)}</b>${text ? `<span>${esc(text)}</span>` : ''}`;
      toastBox.appendChild(el);
      while (toastBox.children.length > 2) toastBox.firstChild.remove();
      setTimeout(() => el.remove(), 3400);
    },

    // tilt-and-hold progress bar on cards
    tick() {
      const fill = document.getElementById('hold-fill');
      if (!fill) return;
      fill.style.width = Math.round(AU.Input.hold * 100) + '%';
      const box = document.getElementById('hold');
      if (box) box.hidden = !bleConnected;
    },

    $(id) { return document.getElementById(id); }
  };

  document.addEventListener('mousemove', (e) => { UI.mouse.x = e.clientX; UI.mouse.y = e.clientY; }, true);

  /* ============================================================
     SCREEN TEMPLATES
  ============================================================ */
  const pips = (n) => `<span class="pips">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const holdBar = (label = 'OR TILT RIGHT &amp; HOLD') =>
    `<div class="hold" id="hold" hidden><span>${label}</span><div class="hold-bar"><i id="hold-fill"></i></div></div>`;
  const foot = (text) => `<div class="scr-foot">${text}</div>`;

  function drawSprite(canvas, sprite, silhouette) {
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(sprite, 0, 0);
    if (silhouette) {
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#000';
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  const Screens = {
    boot() {
      const bt = navigator.bluetooth ? 'READY' : 'NOT FOUND (USE CHROME/EDGE)';
      const lines = [
        'CPU .............. OK',
        'VIDEO 320x240 .... OK',
        'SOUND CHIP ....... OK',
        `WEB BLUETOOTH .... ${bt}`,
        'MOTION INPUT ..... ESP32 + MPU6050',
        'HIGH SCORES ...... LOADED'
      ];
      return `
      <div class="scr boot">
        <div class="boot-log term">
          <div>AAKASH UDAAN ARCADE SYSTEM V1.0</div>
          <div class="dimtxt">PIXEL FLIGHT LAB</div><br>
          ${lines.map((l, i) => `<div class="boot-line" style="--d:${i + 1}">${l}</div>`).join('')}
        </div>
        <div class="boot-go blink" style="--d:7">PRESS ANY KEY</div>
      </div>`;
    },

    title(credits) {
      const best = AU.Save.data.highScores[0];
      return `
      <div class="scr title-scr">
        <div class="logo"><span class="logo-top">AAKASH</span><span class="logo-bot">UDAAN</span></div>
        <div class="subtitle">PIXEL FLIGHT LAB</div>
        <div class="tagline">A RETRO FLIGHT &amp; LEARNING SIMULATOR</div>
        <div class="title-menu panel">
          <div class="col">
            <button class="btn coin" data-act="coin"><span class="blink-slow">INSERT COIN</span></button>
            <button class="btn big" data-act="start">START</button>
            <button class="btn" data-act="aircraft">AIRCRAFT</button>
            <button class="btn" data-act="themes">THEMES</button>
            <button class="btn" data-act="controller">CONTROLLER</button>
          </div>
          <div class="col">
            <button class="btn" data-act="howto">HOW TO PLAY</button>
            <button class="btn" data-act="school">FLIGHT SCHOOL</button>
            <button class="btn" data-act="how">HOW IT WORKS</button>
            <button class="btn" data-act="why">WHY THIS GAME</button>
            <button class="btn" data-act="scores">HIGH SCORES</button>
            <button class="btn" data-act="achievements">ACHIEVEMENTS</button>
          </div>
        </div>
        <div class="title-foot">
          <span>HI ${best ? pad(best.score, 6) : '000000'}</span>
          <span id="credits">CREDIT ${pad(credits, 2)}</span>
          <span class="blink-slow">FREE PLAY</span>
        </div>
      </div>`;
    },

    aircraft() {
      const cur = AU.Save.settings.aircraft;
      return `
      <div class="scr solid">
        <h2 class="scr-title">SELECT AIRCRAFT</h2>
        <div class="ac-grid">
          ${AU.AIRCRAFT.map((ac) => {
            const locked = !AU.isAircraftUnlocked(ac);
            return `
            <button class="ac-card ${locked ? 'locked' : ''} ${ac.id === cur ? 'current' : ''}" data-act="pick" data-arg="${ac.id}">
              <span class="ac-num">AIRCRAFT ${ac.num}</span>
              <canvas class="ac-thumb" data-ac="${ac.id}" data-locked="${locked}"></canvas>
              <span class="ac-name">${ac.name}</span>
              <span class="ac-tag">${ac.tag}</span>
              <span class="stat"><span>SPEED</span>${pips(ac.stats.speed)}</span>
              <span class="stat"><span>CONTROL</span>${pips(ac.stats.control)}</span>
              <span class="stat"><span>STABILITY</span>${pips(ac.stats.stability)}</span>
              ${locked ? `<span class="lock">LOCKED: ${ac.unlock.text}</span>` : ac.id === cur ? '<span class="chosen">SELECTED</span>' : '<span class="chosen ghost">READY</span>'}
            </button>`;
          }).join('')}
        </div>
        <p class="small center">STATS ARE GAME MECHANICS, NOT REAL AIRCRAFT SPECIFICATIONS.</p>
        ${foot('◀ ▶ CHOOSE &nbsp;·&nbsp; ENTER CONFIRM &nbsp;·&nbsp; ESC BACK')}
      </div>`;
    },

    // START → one screen: aircraft + theme + fly
    setup() {
      const s = AU.Save.settings;
      return `
      <div class="scr solid setup">
        <h2 class="scr-title">PREPARE FOR TAKEOFF</h2>
        <div class="setup-label">1 · CHOOSE AIRCRAFT</div>
        <div class="setup-ac">
          ${AU.AIRCRAFT.map((ac) => {
            const locked = !AU.isAircraftUnlocked(ac);
            return `
            <button class="setup-card ${locked ? 'locked' : ''} ${ac.id === s.aircraft ? 'current' : ''}" data-act="pick" data-arg="${ac.id}">
              <canvas class="ac-thumb" data-ac="${ac.id}" data-locked="${locked}"></canvas>
              <span class="ac-name">${ac.name}</span>
              <span class="setup-sub">${locked ? 'LOCKED: ' + ac.unlock.text : ac.tag}</span>
            </button>`;
          }).join('')}
        </div>
        <div class="setup-label">2 · CHOOSE THEME</div>
        <div class="setup-th">
          ${AU.THEMES.map((t) => {
            const locked = !AU.Theme.isUnlocked(t);
            const sw = [t.sky[3], t.ground[0], t.ring, t.hud.accent];
            return `
            <button class="setup-theme ${locked ? 'locked' : ''} ${t.id === s.theme ? 'current' : ''}" data-act="theme" data-arg="${t.id}">
              <span class="swatches">${sw.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
              <span class="theme-name">${t.name}</span>
              ${locked ? `<span class="setup-sub">${t.unlock.text}</span>` : ''}
            </button>`;
          }).join('')}
        </div>
        <button class="btn big setup-go" data-act="go">START FLIGHT ▶</button>
        ${foot('CLICK TO CHOOSE &nbsp;·&nbsp; ENTER START &nbsp;·&nbsp; ESC BACK')}
      </div>`;
    },

    drawThumbs(root) {
      root.querySelectorAll('canvas[data-ac]').forEach((c) => {
        drawSprite(c, AU.Sprites.thumbnail(c.dataset.ac), c.dataset.locked === 'true');
      });
    },

    themes() {
      const s = AU.Save.settings;
      return `
      <div class="scr solid">
        <h2 class="scr-title">SELECT THEME</h2>
        <div class="theme-list">
          ${AU.THEMES.map((t) => {
            const locked = !AU.Theme.isUnlocked(t);
            const sw = [t.sky[0], t.sky[3], t.ground[0], t.ring, t.hud.accent, t.hazard];
            return `
            <button class="theme-row ${locked ? 'locked' : ''} ${t.id === s.theme ? 'current' : ''}" data-act="theme" data-arg="${t.id}">
              <span class="theme-name">${t.name}</span>
              <span class="swatches">${sw.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
              <span class="theme-state">${locked ? 'LOCKED: ' + t.unlock.text : t.id === s.theme ? 'ACTIVE' : ''}</span>
            </button>`;
          }).join('')}
        </div>
        <div class="options panel">
          <button class="btn opt" data-act="crt">CRT SCANLINES <b>${s.crt ? 'ON' : 'OFF'}</b></button>
          <button class="btn opt" data-act="sound">SOUND <b>${s.sound ? 'ON' : 'OFF'}</b></button>
          <button class="btn opt" data-act="lessons">LESSON CARDS <b>${s.lessonCards === 'always' ? 'ALWAYS' : 'NEW ONLY'}</b></button>
        </div>
        <button class="btn big" data-act="done">CONFIRM ▶</button>
        ${foot('ENTER APPLY &nbsp;·&nbsp; ESC BACK')}
      </div>`;
    },

    controller(flow) {
      const s = AU.Save.settings;
      const sensName = s.sensitivity < 1 ? 'LOW' : s.sensitivity > 1 ? 'HIGH' : 'MED';
      return `
      <div class="scr dim">
        <h2 class="scr-title">CONTROLLER CHECK</h2>
        <div class="cc">
          <div class="panel cc-live">
            <div class="cc-status"><i class="led" id="cc-led"></i><span id="cc-text">NOT CONNECTED</span></div>
            <div class="cc-read"><span>ROLL</span><b id="cc-roll">+00.0°</b></div>
            <div class="meter"><i class="mid"></i><i class="fill" id="cc-roll-bar"></i></div>
            <div class="cc-read"><span>PITCH</span><b id="cc-pitch">+00.0°</b></div>
            <div class="meter"><i class="mid"></i><i class="fill" id="cc-pitch-bar"></i></div>
            <p class="small">PACKET FORMAT <b class="hi">"ROLL,PITCH"</b><br>~20 PACKETS / SECOND</p>
            <p class="small ${navigator.bluetooth ? '' : 'danger'}">${navigator.bluetooth ? 'WEB BLUETOOTH AVAILABLE' : 'WEB BLUETOOTH NOT AVAILABLE. USE CHROME OR EDGE.'}</p>
          </div>
          <div class="panel cc-steps">
            <ol class="term">
              <li>POWER ON THE ESP32 + MPU6050 CONTROLLER.</li>
              <li>PRESS <b>CONNECT ESP32</b> AND PICK <b>ATOMICACE-CONTROLLER</b>.</li>
              <li>HOLD IT LEVEL, THEN PRESS <b>RECENTER</b>.</li>
              <li>TILT IT. THE PLANE BEHIND THIS PANEL FOLLOWS YOU.</li>
            </ol>
            <div class="cc-buttons">
              <button class="btn" data-act="connect" id="cc-connect">CONNECT ESP32</button>
              <button class="btn" data-act="recenter">RECENTER</button>
              <button class="btn opt" data-act="invertRoll">ROLL <b>${s.invertRoll ? 'INVERTED' : 'NORMAL'}</b></button>
              <button class="btn opt" data-act="invert">PITCH <b>${s.invertPitch ? 'INVERTED' : 'NORMAL'}</b></button>
              <button class="btn opt" data-act="sens">SENSITIVITY <b>${sensName}</b></button>
            </div>
          </div>
        </div>
        <button class="btn big" data-act="go" id="cc-go">${flow ? 'CONTINUE ▶' : 'DONE'}</button>
        ${foot('NO CONTROLLER? ARROW KEYS / WASD WORK AUTOMATICALLY WHILE DISCONNECTED')}
      </div>`;
    },

    ready(L, run) {
      return `
      <div class="scr ready-scr">
        <div class="ready-box">
          <div class="ready-lvl">LEVEL ${pad(L.n, 2)}</div>
          <div class="ready-name">${L.name}</div>
          <div class="ready-count" id="ready-count">GET READY</div>
          <div class="ready-learn">THIS LEVEL: ${L.learned.join(' · ')}</div>
          <div class="ready-ac">${run.aircraft.name} &nbsp;·&nbsp; ${bleConnected ? 'ESP32 CONTROLLER' : 'KEYBOARD'}</div>
        </div>
      </div>`;
    },

    lesson(lesson, isNew) {
      return `
      <div class="scr dim">
        <div class="card-lab panel">
          <div class="card-head"><span>✦ FLIGHT LAB ✦</span>${isNew ? '<span class="new blink">NEW!</span>' : ''}</div>
          <canvas id="card-art" class="card-art" width="96" height="56"></canvas>
          <div class="card-q">${lesson.q}</div>
          <p class="card-text term">${lesson.text}</p>
          ${lesson.tip ? `<div class="card-tip">▶ ${lesson.tip}</div>` : ''}
          <button class="btn big" data-act="ok">[ GOT IT ]</button>
          ${holdBar()}
        </div>
      </div>`;
    },

    pause(reason) {
      return `
      <div class="scr dim">
        <div class="panel pause">
          <div class="pause-title blink-slow">PAUSED</div>
          ${reason ? `<div class="small danger center">${reason}</div>` : ''}
          <button class="btn big" data-act="resume">RESUME</button>
          <button class="btn big" data-act="restart">RESTART</button>
          <button class="btn big" data-act="exit">EXIT</button>
          <div class="small center">RESTART BEGINS A NEW RUN FROM LEVEL 1</div>
        </div>
      </div>`;
    },

    initials(letters, pos) {
      return `
      <div class="hs-entry">
        <div class="hs-new blink">NEW HIGH SCORE!</div>
        <div class="small">ENTER YOUR INITIALS</div>
        <div class="initials" id="initials">${letters.map((c, i) => `<span class="${i === pos ? 'on' : ''}">${esc(c)}</span>`).join('')}</div>
        <div class="small">▲▼ LETTER &nbsp;·&nbsp; ◀▶ MOVE &nbsp;·&nbsp; ENTER OK</div>
        ${holdBar('TILT RIGHT &amp; HOLD TO ACCEPT')}
      </div>`;
    },

    crash(d) {
      return `
      <div class="scr dim">
        <div class="panel crash">
          <div class="crash-title">CRASHED!</div>
          <div class="crash-cause">${d.cause}</div>
          <div class="kv"><span>SCORE</span><b>${pad(d.score, 7)}</b></div>
          <div class="kv"><span>LEVEL</span><b>${pad(d.level, 2)}</b></div>
          ${d.entry ? this.initials(d.letters, d.pos) : `
            ${d.rank >= 0 ? `<div class="rank">HIGH SCORE RANK ${pad(d.rank + 1, 2)}</div>` : ''}
            <button class="btn big press-start" data-act="start"><span class="blink">[ PRESS START ]</span></button>
            <div class="small center">NEW RUN FROM LEVEL 1 &nbsp;·&nbsp; ESC FOR TITLE</div>
            ${holdBar()}`}
        </div>
      </div>`;
    },

    levelComplete(d) {
      const rows = d.rows.map((r) => `<div class="kv"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
      return `
      <div class="scr dim">
        <div class="panel lvl-done">
          <div class="lvl-title">${d.title}</div>
          ${rows}
          <div class="kv total"><span>SCORE</span><b>${pad(d.score, 7)}</b></div>
          <div class="learned"><span>YOU LEARNED</span>${d.learned.map((l) => `<i>${l}</i>`).join('')}</div>
          ${d.unlocks.map((u) => `<div class="unlock blink-slow">UNLOCKED: ${u}</div>`).join('')}
          <button class="btn big" data-act="next">${d.last ? 'FINISH ▶' : 'NEXT LEVEL ▶'}</button>
          ${holdBar()}
        </div>
      </div>`;
    },

    gameComplete(d) {
      return `
      <div class="scr dim">
        <div class="panel game-done">
          <div class="gd-title">CONGRATULATIONS!</div>
          <div class="gd-sub">YOU ARE A MASTER PILOT</div>
          <div class="kv"><span>FINAL SCORE</span><b>${pad(d.score, 7)}</b></div>
          <div class="kv"><span>AIRCRAFT</span><b>${d.aircraft}</b></div>
          <div class="learned"><span>FLIGHT SKILLS LEARNED</span>${AU.LEVELS.flatMap((l) => l.learned).filter((x) => x !== 'EVERYTHING!').map((l) => `<i>${l}</i>`).join('')}</div>
          ${d.entry ? this.initials(d.letters, d.pos) : `
            ${d.rank >= 0 ? `<div class="rank">HIGH SCORE RANK ${pad(d.rank + 1, 2)}</div>` : ''}
            <button class="btn big" data-act="start"><span class="blink">[ PRESS START ]</span></button>
            <button class="btn" data-act="scores">HIGH SCORES</button>
            <button class="btn" data-act="title">TITLE</button>`}
        </div>
      </div>`;
    },

    highScores(highlight) {
      const hs = AU.Save.data.highScores;
      return `
      <div class="scr solid">
        <h2 class="scr-title">HIGH SCORES</h2>
        <div class="hs-table panel">
          <div class="hs-row head"><span>RANK</span><span>NAME</span><span>SCORE</span><span>LVL</span><span>AIRCRAFT</span></div>
          ${hs.map((e, i) => `
            <div class="hs-row ${i === highlight ? 'me blink-slow' : ''} rank-${i}">
              <span>${pad(i + 1, 2)}</span><span>${esc(e.name)}</span><span>${pad(e.score, 7)}</span><span>${pad(e.level, 2)}</span><span>${esc(e.aircraft)}</span>
            </div>`).join('')}
        </div>
        <button class="btn big" data-act="back">BACK</button>
      </div>`;
    },

    achievements() {
      const got = AU.Save.data.achievements;
      const n = AU.ACHIEVEMENTS.filter((a) => got[a.id]).length;
      return `
      <div class="scr solid">
        <h2 class="scr-title">ACHIEVEMENTS ${pad(n, 2)}/${pad(AU.ACHIEVEMENTS.length, 2)}</h2>
        <div class="ach-grid">
          ${AU.ACHIEVEMENTS.map((a) => `
            <div class="ach ${got[a.id] ? 'got' : ''}">
              <i class="badge">${got[a.id] ? '★' : '?'}</i>
              <div><b>${a.name}</b><span>${a.desc}</span></div>
            </div>`).join('')}
        </div>
        <button class="btn big" data-act="back">BACK</button>
      </div>`;
    },

    howToPlay() {
      const pw = AU.POWERUPS;
      return `
      <div class="scr solid">
        <h2 class="scr-title">HOW TO PLAY</h2>
        <div class="two-col">
          <div class="panel">
            <h3>CONTROLS</h3>
            <div class="kv"><span>TILT LEFT / RIGHT</span><b>BANK + STEER</b></div>
            <div class="kv"><span>TILT FORWARD / BACK</span><b>DIVE / CLIMB</b></div>
            <div class="kv"><span>ARROWS / WASD</span><b>KEYBOARD FLY*</b></div>
            <div class="kv"><span>P / ESC</span><b>PAUSE</b></div>
            <div class="kv"><span>ENTER / SPACE</span><b>SELECT</b></div>
            <div class="kv"><span>M</span><b>SOUND ON/OFF</b></div>
            <p class="small">*KEYBOARD ONLY WORKS WHILE NO ESP32 IS CONNECTED, SO IT NEVER FIGHTS THE REAL CONTROLLER.</p>
            <h3>PICKUPS</h3>
            <div class="kv"><span>STAR</span><b>+50</b></div>
            <div class="kv"><span>FLIGHT TOKEN</span><b>+25</b></div>
            <div class="kv"><span>DATA CHIP</span><b>+250 + FACT</b></div>
            <div class="kv"><span>RING</span><b>+100 x COMBO</b></div>
          </div>
          <div class="panel">
            <h3>RULES</h3>
            <p class="term">TOWERS, WALLS AND TERRAIN ARE <b class="danger">SOLID</b>. HIT ONE AND YOU <b class="danger">CRASH</b>. THE RUN ENDS AND EVERYTHING RESETS TO LEVEL 1.</p>
            <p class="term">DRONES, BALLOONS AND LIGHTNING COST ONE <b class="danger">♥</b>. LOSE ALL THREE AND YOU CRASH.</p>
            <p class="term">THE GROUND IS SOFT IN LEVELS 1-2 AND SOLID FROM LEVEL 3.</p>
            <h3>POWER-UPS</h3>
            ${Object.values(pw).map((p) => `<div class="kv"><span><i class="pbox">${p.letter}</i> ${p.name}</span><b>${p.time}S</b></div>`).join('')}
            <p class="small">SHIELD ALSO ABSORBS ONE CRASH.</p>
          </div>
        </div>
        <button class="btn big" data-act="back">BACK</button>
      </div>`;
    },

    school(secIdx, itemId) {
      const S = AU.Save.data;
      const sections = [...AU.LAB, { id: 'chips', title: 'DATA CHIPS', items: [] }];
      const sec = sections[secIdx];
      const readCount = AU.LAB_REQUIRED.filter((id) => S.labRead[id]).length;
      let items;
      if (sec.id === 'chips') {
        items = AU.DATA_FACTS.map((f, i) => `<button class="btn item ${S.chips[i] ? '' : 'locked'}" data-act="chip" data-arg="${i}">CHIP ${pad(i + 1, 2)}</button>`).join('');
      } else {
        items = sec.items.map((id) => {
          const l = AU.lessonById(id);
          const locked = sec.locked && !S.lessonsSeen[id];
          const read = S.labRead[id] || (sec.locked && S.lessonsSeen[id]);
          return `<button class="btn item ${locked ? 'locked' : ''} ${read ? 'read' : ''}" data-act="item" data-arg="${id}">${locked ? '???' : l.title}</button>`;
        }).join('');
      }
      return `
      <div class="scr solid">
        <h2 class="scr-title">FLIGHT SCHOOL</h2>
        <div class="school">
          <div class="school-sec">
            ${sections.map((s, i) => `<button class="btn sec ${i === secIdx ? 'active' : ''}" data-act="section" data-arg="${i}">${s.title}</button>`).join('')}
            <div class="small">MODULES READ<br><b class="hi" id="school-count">${pad(readCount, 2)} / ${pad(AU.LAB_REQUIRED.length, 2)}</b></div>
          </div>
          <div class="school-items">${items}</div>
          <div class="school-content panel" id="school-content">${this.schoolContent(itemId)}</div>
        </div>
        <p class="small center disclaimer">${AU.DISCLAIMER}</p>
        ${foot('ARROWS BROWSE &nbsp;·&nbsp; ESC BACK')}
      </div>`;
    },

    schoolContent(itemId) {
      if (itemId == null) return '<div class="term dimtxt">SELECT A MODULE TO READ IT.</div>';
      if (String(itemId).startsWith('chip:')) {
        const i = +itemId.slice(5);
        return AU.Save.data.chips[i]
          ? `<div class="sc-title">DATA CHIP ${pad(i + 1, 2)}</div><p class="term">${AU.DATA_FACTS[i]}</p>`
          : '<div class="sc-title">LOCKED</div><p class="term">COLLECT DATA CHIPS IN FLIGHT TO DECODE THIS FACT.</p>';
      }
      const l = AU.lessonById(itemId);
      const inNotes = AU.LAB.find((s) => s.locked).items.includes(itemId);
      if (inNotes && !AU.Save.data.lessonsSeen[itemId]) {
        return '<div class="sc-title">???</div><p class="term">UNLOCK THIS FLIGHT NOTE BY REACHING IT IN THE GAME.</p>';
      }
      return `
        <div class="sc-title">${l.q || l.title}</div>
        <p class="term">${l.text}</p>
        ${l.tip ? `<div class="card-tip">▶ IN GAME: ${l.tip}</div>` : ''}
        ${AU.Save.data.lessonsSeen[itemId] ? '<div class="small hi">✓ SEEN IN FLIGHT</div>' : ''}`;
    },

    why(page) {
      const pages = [
        {
          h: 'WHY?',
          body: `<p class="quote term">"WE WANTED TO TURN A SIMPLE MOTION SENSOR INTO AN INTERACTIVE EXPERIENCE THAT CONNECTS HARDWARE, SOFTWARE, GAMING AND LEARNING."</p>
                 <p class="term">AAKASH UDAAN (HINDI FOR "SKY FLIGHT") IS AN ARCADE GAME THAT SECRETLY TEACHES YOU HOW FLIGHT WORKS. IT IS FUN FIRST AND GETS MORE EDUCATIONAL AS YOU PLAY.</p>`
        },
        {
          h: 'HOW?',
          body: `<p class="quote term">"THE MPU6050 DETECTS PHYSICAL MOVEMENT. THE ESP32 PROCESSES THE MOTION AND SENDS THE CONTROL INFORMATION THROUGH BLUETOOTH TO THE GAME."</p>
                 <div class="mini-flow"><i>HAND TILT</i>▶<i>MPU6050</i>▶<i>ESP32</i>▶<i>BLE</i>▶<i>BROWSER</i>▶<i>PLANE</i></div>
                 <p class="term">YOU WATCH THE PLANE, CORRECT YOUR HAND AND WATCH AGAIN. THAT IS A REAL FEEDBACK LOOP.</p>`
        },
        {
          h: 'WHAT DOES IT TEACH?',
          body: `<div class="chip-grid">${['MOTION SENSING', 'HUMAN-MACHINE INTERACTION', 'BASIC FLIGHT CONCEPTS', 'GAME DEVELOPMENT', 'EMBEDDED SYSTEMS', 'BLUETOOTH COMMUNICATION', 'FEEDBACK &amp; CONTROL', 'PROBLEM SOLVING'].map((x) => `<i>${x}</i>`).join('')}</div>`
        },
        {
          h: 'WHERE CAN THIS IDEA BE USED?',
          body: `<div class="chip-grid">${['AEROSPACE EDUCATION', 'SIMULATION', 'ROBOTICS', 'DRONE CONTROL INTERFACES', 'HUMAN-MACHINE INTERACTION', 'ENGINEERING DEMOS', 'EDUCATIONAL GAMES', 'INTERACTIVE EXHIBITIONS', 'ENTERTAINMENT'].map((x) => `<i>${x}</i>`).join('')}</div>`
        },
        {
          h: 'WHAT ARE THE BENEFITS?',
          body: `<p class="small">POTENTIAL BENEFITS, PRESENTED HONESTLY:</p>
                 <div class="chip-grid">${['LEARNING THROUGH INTERACTION', 'CLEARER UNDERSTANDING OF ABSTRACT CONCEPTS', 'HAND-EYE COORDINATION PRACTICE', 'SUSTAINED ATTENTION CHALLENGES', 'EXPERIMENTING WITH PHYSICAL CONTROLLERS', 'MORE APPROACHABLE ENGINEERING'].map((x) => `<i>${x}</i>`).join('')}</div>
                 <p class="term">SHORT SESSIONS GIVE A STRUCTURED FOCUS CHALLENGE. THESE ARE NOT MEDICAL OR CLINICAL CLAIMS.</p>
                 <p class="small">${AU.DISCLAIMER}</p>`
        }
      ];
      const p = pages[page];
      return `
      <div class="scr solid">
        <h2 class="scr-title">WHY AAKASH UDAAN?</h2>
        <div class="panel why">
          <div class="why-h">${p.h}</div>
          ${p.body}
        </div>
        <div class="pager">
          <button class="btn" data-act="prev">◀ PREV</button>
          <span class="dots">${pages.map((_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}</span>
          <button class="btn" data-act="next">NEXT ▶</button>
        </div>
        <button class="btn" data-act="back">BACK</button>
      </div>`;
    },

    howItWorks() {
      const steps = ['MPU6050', 'MOTION DETECTION', 'ESP32', 'BLUETOOTH', 'WEB GAME', 'PLAYER RESPONSE'];
      const uuid = typeof SERVICE_UUID !== 'undefined' ? SERVICE_UUID : '';
      return `
      <div class="scr solid">
        <h2 class="scr-title">HOW IT WORKS</h2>
        <div class="flow">
          ${steps.map((s, i) => `<div class="flow-block b${i}"><span>${pad(i + 1, 2)}</span>${s}</div>${i < steps.length - 1 ? '<div class="flow-arrow"><i></i></div>' : ''}`).join('')}
        </div>
        <div class="two-col">
          <div class="panel">
            <h3>HARDWARE</h3>
            <ul class="pix-list"><li>ESP32 DEV BOARD</li><li>MPU6050 SENSOR (I2C: SDA 21, SCL 22)</li><li>USB CABLE (POWER / UPLOAD)</li><li>COMPUTER WITH BLUETOOTH</li></ul>
            <h3>SOFTWARE</h3>
            <ul class="pix-list"><li>ARDUINO IDE</li><li>ESP32 BLE LIBRARY</li><li>WEB BLUETOOTH API</li><li>HTML · CSS · JAVASCRIPT (CANVAS 2D)</li></ul>
          </div>
          <div class="panel">
            <h3>LIVE LINK</h3>
            <div class="kv"><span>STATUS</span><b id="hiw-status">--</b></div>
            <div class="kv"><span>LAST PACKET</span><b id="hiw-packet">--</b></div>
            <p class="small">SERVICE UUID<br><b class="hi uuid">${uuid}</b></p>
            <p class="term">THE ESP32 CALCULATES ROLL AND PITCH FROM GRAVITY, THEN NOTIFIES THE BROWSER WITH TEXT LIKE <b class="hi">"12.40,-3.15"</b>. THE GAME SPLITS IT AT THE COMMA AND FLIES.</p>
          </div>
        </div>
        <button class="btn big" data-act="back">BACK</button>
      </div>`;
    }
  };

  AU.UI = UI;
  AU.Screens = Screens;
})(window.AU);
