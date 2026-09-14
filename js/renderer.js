/* ============================================================
   AAKASH UDAAN — RENDERER (Canvas 2D, 320x240)
   Pseudo-3D "behind the plane" arcade view: flat sky bands,
   pixel sun/moon, parallax mountains, scrolling ground stripes,
   scaled pixel objects, and an arcade HUD in a bitmap font.
   The canvas is upscaled with CSS image-rendering: pixelated.
   ============================================================ */
(function (AU) {
  const W = AU.W, H = AU.H;
  const PAD = 80;             // over-draw margin so world rotation never shows edges
  let canvas, ctx, bg = null;
  let clock = 0;

  const RUN_STATES = new Set(['READY', 'PLAYING', 'PAUSED', 'LEARNING', 'CRASHED', 'LEVEL_COMPLETE', 'GAME_COMPLETE']);

  /* ------------------------------------------------------------
     PRE-RENDERED BACKGROUND LAYERS (rebuilt on theme change)
  ------------------------------------------------------------ */
  function buildBackground(t) {
    const hz = AU.HORIZON + 70;              // horizon row inside the sky canvas
    const sky = document.createElement('canvas');
    sky.width = W + PAD * 2;
    sky.height = hz + 24;
    const g = sky.getContext('2d');

    // flat colour bands with dithered seams (no gradients)
    const stops = [0, hz * 0.45, hz * 0.68, hz * 0.86, sky.height];
    for (let i = 0; i < 4; i++) {
      g.fillStyle = t.sky[i];
      g.fillRect(0, Math.round(stops[i]), sky.width, Math.ceil(stops[i + 1] - stops[i]) + 1);
    }
    for (let i = 1; i < 4; i++) {
      const y = Math.round(stops[i]);
      g.fillStyle = t.sky[i - 1];
      for (let x = 0; x < sky.width; x += 2) {
        g.fillRect(x, y, 1, 1);
        if (x % 4 === 0) g.fillRect(x + 1, y + 2, 1, 1);
      }
    }

    if (t.stars) {
      const r = AU.seeded(5);
      g.fillStyle = t.stars;
      for (let i = 0; i < 80; i++) {
        const s = r() < 0.12 ? 2 : 1;
        g.fillRect(Math.floor(r() * sky.width), Math.floor(r() * hz * 0.8), s, s);
      }
    }

    drawSun(g, t, PAD + t.sun.x, hz - t.sun.y);

    bg = {
      sky, hz,
      far: mountains(t.far, 11, 30, [2, 3, 5, 9]),
      near: mountains(t.near, 23, 16, [3, 4, 7, 11]),
      storm: stormSprite(t)
    };
  }

  function drawSun(g, t, cx, cy) {
    const s = t.sun, r = s.r;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > r * r) continue;
        let col = s.color;
        if (s.kind === 'synth') {
          if (dy > 0 && (dy % 6) < 1 + Math.floor(dy / 7)) continue;   // retro cut lines
          col = dy < -r * 0.25 ? s.color : dy < r * 0.1 ? (((dx + dy) & 1) ? s.color : s.color2) : s.color2;
        } else if (s.kind === 'moon') {
          if ((dx + 3) ** 2 + (dy + 2) ** 2 < 6 || (dx - 4) ** 2 + (dy - 3) ** 2 < 3) col = s.color2;
        } else if (d2 > (r - 1.5) ** 2) {
          col = s.color2;
        }
        g.fillStyle = col;
        g.fillRect(cx + dx, cy + dy, 1, 1);
      }
    }
  }

  // Integer frequencies over 640px → the strip tiles seamlessly
  function mountains(color, seed, maxH, freqs) {
    const c = document.createElement('canvas');
    c.width = 640; c.height = maxH + 2;
    const g = c.getContext('2d');
    g.fillStyle = color;
    const rnd = AU.seeded(seed);
    const ph = freqs.map(() => rnd() * Math.PI * 2);
    const amp = freqs.map(() => 0.4 + rnd() * 0.6);
    const total = amp.reduce((a, b) => a + b, 0);
    for (let x = 0; x < 640; x += 2) {
      let v = 0;
      freqs.forEach((f, i) => { v += Math.sin((x / 640) * Math.PI * 2 * f + ph[i]) * amp[i]; });
      const h = Math.round((((v / total) * 0.5 + 0.5) * maxH) / 2) * 2 + 2;
      g.fillRect(x, c.height - h, 2, h);
    }
    return c;
  }

  // The Level 7 "boss": a grumpy storm cloud (original design)
  function stormSprite(t) {
    const w = 110, h = 46;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const rnd = AU.seeded(99);
    const blobs = [];
    for (let i = 0; i < 10; i++) blobs.push({ x: 12 + rnd() * 86, y: 16 + rnd() * 16, r: 9 + rnd() * 8 });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!blobs.some((b) => (x - b.x) ** 2 + ((y - b.y) * 1.25) ** 2 < b.r * b.r)) continue;
        g.fillStyle = y > h * 0.62 ? t.cloudShade : ((x + y) % 7 === 0 ? t.cloudShade : t.dragCloud);
        g.fillRect(x, y, 1, 1);
      }
    }
    // eyes + brows + zigzag mouth
    g.fillStyle = t.bolt;
    g.fillRect(36, 20, 10, 6); g.fillRect(64, 20, 10, 6);
    g.fillStyle = t.hud.bg;
    g.fillRect(40, 22, 4, 4); g.fillRect(66, 22, 4, 4);
    for (let i = 0; i < 10; i++) { g.fillRect(35 + i, 16 + (i >> 1), 1, 2); g.fillRect(74 - i, 16 + (i >> 1), 1, 2); }
    for (let i = 0; i < 24; i++) g.fillRect(43 + i, 32 + ((i >> 2) % 2), 1, 1);
    return c;
  }

  /* ------------------------------------------------------------
     CAMERA + PROJECTION
  ------------------------------------------------------------ */
  function camera(run) {
    const p = run.player;
    return {
      x: p.x * 0.8,
      y: p.y * 0.88 + 9,
      horizon: AU.HORIZON + p.pitchVis * 8,
      angle: -p.bank * 0.22
    };
  }

  function proj(cam, x, y, z) {
    const s = AU.FOCAL / z;
    return { x: W / 2 + (x - cam.x) * s, y: cam.horizon + (cam.y - y) * s, s };
  }

  function blit(spr, x, y, sc) {
    const w = Math.max(1, Math.round(spr.width * sc)), h = Math.max(1, Math.round(spr.height * sc));
    ctx.drawImage(spr, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  }

  const pixScale = (v) => (v < 1 ? Math.max(0.25, v) : Math.round(v));

  function disc(cx, cy, r, color) {
    ctx.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) {
      const hw = Math.round(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  }

  function pline(g, x0, y0, x1, y1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 600; i++) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function dotRing(cx, cy, R, n, sz, colA, colB, rot = 0) {
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      ctx.fillStyle = colB && i % 2 ? colB : colA;
      ctx.fillRect(Math.round(cx + Math.cos(a) * R - sz / 2), Math.round(cy + Math.sin(a) * R - sz / 2), sz, sz);
    }
  }

  /* ------------------------------------------------------------
     SCENE
  ------------------------------------------------------------ */
  function drawScene(run, L, opts = {}) {
    const t = AU.Theme.current;
    const cam = camera(run);

    ctx.save();
    if (run.shake > 0) ctx.translate(Math.round(AU.rand(-3, 3) * run.shake), Math.round(AU.rand(-3, 3) * run.shake));
    ctx.translate(W / 2, H / 2);
    ctx.rotate(cam.angle);
    ctx.translate(-W / 2, -H / 2);

    ctx.fillStyle = t.sky[0];
    ctx.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);
    ctx.drawImage(bg.sky, -PAD, Math.round(cam.horizon - bg.hz));
    if (L && L.boss) drawStorm(cam, run, L, t);
    drawStrip(bg.far, cam.x * 1.0, cam.horizon - bg.far.height + 1);
    drawStrip(bg.near, cam.x * 2.2, cam.horizon - bg.near.height + 2);
    drawGround(cam, run, t);
    drawWorld(cam, run, t, opts);
    ctx.restore();

    drawParticles(run, t);
    if (run.power.boost > 0) speedLines(t);
    if (run.flash > 0) {
      ctx.globalAlpha = Math.min(1, run.flash);
      ctx.fillStyle = t.explosion[0];
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  function drawStrip(img, scroll, y) {
    const off = ((-Math.round(scroll) % 640) + 640) % 640;
    for (let x = off - 1280; x < W + PAD; x += 640) {
      if (x + 640 > -PAD) ctx.drawImage(img, x, Math.round(y));
    }
  }

  function drawGround(cam, run, t) {
    const hz = Math.round(cam.horizon);
    const bottom = H + PAD;
    ctx.fillStyle = t.ground[0];
    ctx.fillRect(-PAD, hz, W + PAD * 2, bottom - hz);

    const k0 = cam.y * AU.FOCAL;
    const off = run.distance % 24;
    for (let k = 0; k < 90; k++) {
      const zNear = Math.max(0.5, k * 24 - off);
      const zFar = k * 24 - off + 12;
      if (zFar <= 0.5) continue;
      const yN = Math.min(bottom, hz + k0 / zNear);
      const yF = hz + k0 / zFar;
      if (yF >= bottom) continue;
      if (yN - yF < 0.35) break;
      const top = Math.round(yF);
      const hgt = Math.max(1, Math.round(yN) - top);
      ctx.fillStyle = t.ground[1];
      ctx.fillRect(-PAD, top, W + PAD * 2, hgt);
      if (t.grid) { ctx.fillStyle = t.grid; ctx.fillRect(-PAD, top, W + PAD * 2, 1); }
    }

    if (t.grid) {
      ctx.strokeStyle = t.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -330; x <= 330; x += 30) {
        const a = proj(cam, x, 0, 400), b = proj(cam, x, 0, 2);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = t.horizonLine;
    ctx.fillRect(-PAD, hz, W + PAD * 2, 1);
  }

  function drawStorm(cam, run, L, t) {
    const frac = 1 - AU.clamp(run.storm.gates / L.gatesNeeded, 0, 1);
    if (frac <= 0) return;
    const spr = bg.storm;
    const sc = 1.0 + frac * 1.3;
    const w = spr.width * sc, h = spr.height * sc;
    const x = W / 2 - w / 2, y = Math.max(cam.horizon - h * 0.97, 24) + Math.sin(clock * 1.3) * 3;
    ctx.drawImage(spr, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    if (run.storm.flash > 0 || Math.random() < 0.012) {
      ctx.fillStyle = t.bolt;
      let bx = x + AU.rand(0.2, 0.8) * w;
      for (let by = y + h * 0.8; by < cam.horizon; by += 5) {
        const nx = bx + AU.rand(-4, 4);
        ctx.fillRect(Math.round(Math.min(bx, nx)), Math.round(by), Math.round(Math.abs(nx - bx)) + 2, 5);
        bx = nx;
      }
    }
  }

  function drawWorld(cam, run, t, opts) {
    const list = run.decor.concat(run.objects);
    list.sort((a, b) => b.z - a.z);
    let playerDrawn = false;
    for (const o of list) {
      if (!playerDrawn && o.z < AU.PLAYER_Z) { drawPlayer(cam, run, t, opts); playerDrawn = true; }
      const fn = DRAW[o.type];
      if (fn) fn(cam, o, t, run);
    }
    if (!playerDrawn) drawPlayer(cam, run, t, opts);
  }

  /* ------------------------------------------------------------
     OBJECT DRAWERS
  ------------------------------------------------------------ */
  const DRAW = {
    pylon(cam, o, t) {
      if (o.z < 3) return;
      const b = proj(cam, o.x, 0, o.z), top = proj(cam, o.x, 6, o.z);
      const w = Math.max(1, Math.round(0.9 * b.s));
      ctx.fillStyle = t.pylon;
      ctx.fillRect(Math.round(b.x - w / 2), Math.round(top.y), w, Math.max(1, Math.round(b.y - top.y)));
      const tip = Math.max(1, Math.round(1.5 * b.s));
      ctx.fillStyle = (Math.floor(clock * 3 + o.z / 26) & 1) ? t.pylonTip : t.pylon;
      ctx.fillRect(Math.round(b.x - tip / 2), Math.round(top.y - tip), tip, tip);
    },

    cloud(cam, o) {
      if (o.z < 4) return;
      const p = proj(cam, o.x, o.y, o.z);
      blit(AU.Sprites.cloud(o.variant), p.x, p.y, pixScale(p.s * 0.8));
    },

    tower(cam, o, t) {
      if (o.z < 3) return;
      const a = proj(cam, o.x - o.w / 2, o.h, o.z), b = proj(cam, o.x + o.w / 2, 0, o.z);
      const x0 = Math.round(a.x), x1 = Math.round(b.x), y0 = Math.round(a.y), y1 = Math.round(b.y);
      if (x1 < -PAD || x0 > W + PAD || y0 > H + PAD) return;
      const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
      const side = Math.max(1, Math.round(w * 0.25));
      ctx.fillStyle = t.tower[0];
      ctx.fillRect(x0, y0, w, h);
      ctx.fillStyle = t.tower[1];
      ctx.fillRect(x1 - side, y0, side, h);
      ctx.fillRect(x0, y0, w, Math.max(1, Math.round(a.s * 0.6)));
      if (a.s > 0.8) {
        ctx.fillStyle = t.tower[2];
        const ws = Math.max(1, Math.round(a.s * 1.3));
        let row = 0;
        for (let wy = Math.min(o.h, 80) - 3; wy > 2; wy -= 5, row++) {
          const sy = Math.round(b.y - wy * a.s);
          for (let c = 0; c < 2; c++) {
            if ((row * 3 + c + Math.round(Math.abs(o.x))) % 4 === 0) continue;
            const wx = o.x - o.w / 2 + o.w * (0.2 + c * 0.34);
            ctx.fillRect(Math.round(W / 2 + (wx - cam.x) * a.s), sy, ws, ws);
          }
        }
      }
      const bs = Math.max(1, Math.round(a.s));
      ctx.fillStyle = (Math.floor(clock * 2) & 1) ? t.hazard : t.tower[1];
      ctx.fillRect(Math.round((x0 + x1) / 2 - bs / 2), y0 - bs, bs, bs);
    },

    wall(cam, o, t) {
      if (o.z < 3) return;
      const s = AU.FOCAL / o.z;
      const X = (x) => Math.round(W / 2 + (x - cam.x) * s);
      const Y = (y) => Math.round(cam.horizon + (cam.y - y) * s);
      const L = X(-o.w / 2), R = X(o.w / 2), T = Y(o.h), B = Y(0);
      const gl = X(o.gx - o.gw / 2), gr = X(o.gx + o.gw / 2), gt = Y(o.gy + o.gh / 2), gb = Y(o.gy - o.gh / 2);
      ctx.fillStyle = t.wall[0];
      ctx.fillRect(L, T, gl - L, B - T);
      ctx.fillRect(gr, T, R - gr, B - T);
      ctx.fillRect(gl, T, gr - gl, gt - T);
      ctx.fillRect(gl, gb, gr - gl, B - gb);
      if (s > 0.6) {
        ctx.fillStyle = t.wall[1];
        for (let y = 5; y < o.h; y += 5) {
          const sy = Y(y);
          ctx.fillRect(L, sy, gl - L, 1);
          ctx.fillRect(gr, sy, R - gr, 1);
          if (y > o.gy + o.gh / 2 || y < o.gy - o.gh / 2) ctx.fillRect(gl, sy, gr - gl, 1);
        }
      }
      const fw = Math.max(1, Math.round(s * 0.6));
      ctx.fillStyle = (Math.floor(clock * 6) & 1) ? t.ring : t.ringLit;
      ctx.fillRect(gl, gt, gr - gl, fw);
      ctx.fillRect(gl, gb - fw, gr - gl, fw);
      ctx.fillRect(gl, gt, fw, gb - gt);
      ctx.fillRect(gr - fw, gt, fw, gb - gt);
    },

    ridge(cam, o, t) {
      if (o.z < 3) return;
      const s = AU.FOCAL / o.z;
      const X = (x) => W / 2 + (x - cam.x) * s;
      const Y = (y) => Math.round(cam.horizon + (cam.y - y) * s);
      const inset = Math.min(10, o.w * 0.25);
      const bl = X(o.x - o.w / 2), br = X(o.x + o.w / 2);
      const tl = X(o.x - o.w / 2 + inset), tr = X(o.x + o.w / 2 - inset);
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const f1 = (i + 1) / steps;
        const yb = Y(o.h * (i / steps)), yt = Y(o.h * f1);
        const l = Math.round(bl + (tl - bl) * f1), r = Math.round(br + (tr - br) * f1);
        ctx.fillStyle = i % 2 ? t.ridge[1] : t.ridge[0];
        ctx.fillRect(l, yt, r - l, yb - yt);
      }
      ctx.fillStyle = t.ridge[2];
      ctx.fillRect(Math.round(tl), Y(o.h), Math.round(tr - tl), Math.max(1, Math.round(s * 0.5)));
    },

    ring(cam, o, t) {
      if (o.z < AU.PLAYER_Z - 3) return;
      const p = proj(cam, o.x, o.y, o.z);
      const R = o.r * p.s;
      let col = o.kind === 'thrust' ? t.thrust : o.kind === 'gate' ? t.gate : t.ring;
      if (o.done) col = t.ringLit;
      const pulse = o.z < 70 && (Math.floor(clock * 8) & 1);
      const n = AU.clamp(Math.round(R * 1.3), 8, 64);
      const sz = Math.max(1, Math.round(p.s * (o.kind === 'small' ? 0.7 : 1)));
      dotRing(p.x, p.y, R, n, sz, col, pulse ? t.ringLit : null, o.kind === 'gate' ? clock * 2 : 0);
      if (o.kind === 'gate') dotRing(p.x, p.y, R * 0.75, Math.max(6, n >> 1), sz, t.bolt, null, -clock * 3);
      if (o.kind === 'thrust' && p.s > 1.2) {
        const k = Math.max(1, Math.round(p.s * 0.35));
        AU.Font.draw(ctx, '▲', p.x, p.y - 3 * k, col, k, 'center');
      }
    },

    pickup(cam, o, t) {
      if (o.z < AU.PLAYER_Z - 2) return;
      const p = proj(cam, o.x, o.y + Math.sin(clock * 4 + o.t) * 0.4, o.z);
      const k = p.s * 0.3;
      if (k < 0.7) {
        ctx.fillStyle = o.kind === 'star' ? t.star : o.kind === 'chip' ? t.chip : t.token;
        const sz = k < 0.4 ? 1 : 2;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
        return;
      }
      blit(AU.Sprites.icon(o.kind), p.x, p.y, Math.round(k));
    },

    power(cam, o, t) {
      if (o.z < AU.PLAYER_Z - 2) return;
      const p = proj(cam, o.x, o.y, o.z);
      const sc = p.s * 0.25;
      if (sc < 0.6) {
        ctx.fillStyle = t.powerFg;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        return;
      }
      const k = Math.max(1, Math.round(sc));
      const size = 11 * k;
      const x = Math.round(p.x - size / 2), y = Math.round(p.y - size / 2);
      ctx.fillStyle = (Math.floor(clock * 6) & 1) ? t.ring : t.powerFg;
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = t.powerBg;
      ctx.fillRect(x + k, y + k, size - 2 * k, size - 2 * k);
      AU.Font.draw(ctx, AU.POWERUPS[o.kind].letter, x + 3 * k, y + 2 * k, t.powerFg, k);
    },

    drone(cam, o, t) {
      if (o.z < 3) return;
      const p = proj(cam, o.x, o.y, o.z);
      const spr = AU.Sprites.icon('drone');
      const sc = pixScale((o.w * p.s) / spr.width);
      blit(spr, p.x, p.y, sc);
      if (sc >= 1 && (Math.floor(clock * 20) & 1)) {
        const w = spr.width * sc, bw = Math.round(w * 0.35);
        const y = Math.round(p.y - (spr.height * sc) / 2 - sc);
        ctx.fillStyle = t.hud.text;
        ctx.fillRect(Math.round(p.x - w / 2), y, bw, sc);
        ctx.fillRect(Math.round(p.x + w / 2 - bw), y, bw, sc);
      }
    },

    balloon(cam, o, t) {
      if (o.z < 3) return;
      const p = proj(cam, o.x, o.y, o.z);
      const r = Math.max(1, Math.round((o.w / 2) * p.s));
      disc(p.x, p.y, r, t.hazard);
      if (r > 2) disc(p.x - r * 0.35, p.y - r * 0.35, Math.max(1, Math.round(r * 0.22)), t.ringLit);
      ctx.fillStyle = t.hud.dim;
      ctx.fillRect(Math.round(p.x), Math.round(p.y + r), Math.max(1, Math.round(p.s * 0.2)), Math.round(r * 0.8));
      ctx.fillStyle = t.hazard2;
      ctx.fillRect(Math.round(p.x - r * 0.3), Math.round(p.y + r * 1.8), Math.max(1, Math.round(r * 0.6)), Math.max(1, Math.round(r * 0.4)));
    },

    drag(cam, o, t) {
      if (o.z < 3) return;
      const p = proj(cam, o.x, o.y, o.z);
      const spr = AU.Sprites.cloud(Math.abs(Math.round(o.x)) % 4, true);
      blit(spr, p.x, p.y, pixScale((o.w * p.s) / spr.width));
      if (p.s > 1.2) AU.Font.shadow(ctx, 'DRAG', p.x, p.y - 3, t.hud.text, '#000', 1, 'center');
    },

    bolt(cam, o, t) {
      if (o.z < 3) return;
      const base = proj(cam, o.x, 0, o.z), top = proj(cam, o.x, o.h, o.z);
      const w = Math.max(1, Math.round(o.w * base.s * 0.5));
      const y0 = Math.max(-PAD, Math.round(top.y)), y1 = Math.round(base.y);
      if (!o.active) {
        ctx.fillStyle = t.boltWarn;
        const dw = Math.max(1, Math.round(w * 0.4));
        for (let y = y0; y < y1; y += 6) ctx.fillRect(Math.round(base.x - dw / 2), y, dw, 3);
        ctx.fillRect(Math.round(base.x - w * 2), y1 - 1, w * 4, Math.max(1, Math.round(base.s * 0.6)));
        return;
      }
      const seg = Math.max(4, Math.round(base.s * 2.4));
      let x = base.x;
      for (let y = y0; y < y1; y += seg) {
        const nx = base.x + AU.rand(-w, w);
        const l = Math.round(Math.min(x, nx) - w / 2), ww = Math.round(Math.abs(nx - x)) + w;
        ctx.fillStyle = t.hazard2;
        ctx.fillRect(l - 1, y, ww + 2, seg);
        ctx.fillStyle = t.bolt;
        ctx.fillRect(l, y, ww, seg);
        x = nx;
      }
    }
  };

  /* ------------------------------------------------------------
     PLAYER
  ------------------------------------------------------------ */
  function drawPlayer(cam, run, t, opts) {
    const p = run.player;
    if (opts.hidePlayer || !p.visible) return;
    const spr = AU.Sprites.aircraft(run.aircraft.id, 'rear');
    const S = AU.SPRITE_SCALE;

    // ground shadow: an altitude cue that needs no numbers
    const sh = proj(cam, p.x, 0, AU.PLAYER_Z);
    if (sh.y < H + PAD) {
      const f = AU.clamp(1 - p.y / 70, 0.25, 1);
      const w = Math.round(spr.width * S * f);
      ctx.fillStyle = t.shadow;
      ctx.fillRect(Math.round(sh.x - w / 2), Math.round(sh.y - 1), w, 2);
      ctx.fillRect(Math.round(sh.x - w / 2 + 2), Math.round(sh.y - 2), Math.max(1, w - 4), 4);
    }

    if (p.invuln > 0 && (Math.floor(clock * 16) & 1)) return;

    const pp = proj(cam, p.x, p.y, AU.PLAYER_Z);
    const w = spr.width * S, h = spr.height * S;
    ctx.save();
    ctx.translate(Math.round(pp.x), Math.round(pp.y));
    ctx.rotate(p.bank);
    const flick = Math.floor(clock * 30) & 1;
    ctx.fillStyle = flick ? AU.Theme.quantize(run.aircraft.colors.E) : t.ringLit;
    ctx.fillRect(-2, Math.round(h / 2) - 2, 4, (run.power.boost > 0 ? 7 : 3) + flick * 2);
    ctx.drawImage(spr, -Math.round(w / 2), -Math.round(h / 2), w, h);
    ctx.restore();

    if (run.power.shield > 0 && (run.power.shield > 2 || (Math.floor(clock * 10) & 1))) {
      dotRing(pp.x, pp.y, 26, 28, 2, t.hud.good, t.ringLit, clock * 2);
    }
    if (run.power.stabilizer > 0) {
      ctx.fillStyle = t.hud.good;
      const gx = Math.round(w / 2 + 5);
      for (const sgn of [-1, 1]) {
        ctx.fillRect(Math.round(pp.x + sgn * gx) - 1, Math.round(pp.y) - 4, 2, 8);
      }
    }
  }

  function drawParticles(run, t) {
    for (const p of run.particles) {
      ctx.fillStyle = p.color;
      if (p.ring) {
        dotRing(p.x, p.y, p.r, AU.clamp(Math.round(p.r * 0.8), 8, 48), p.size, p.color);
      } else {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    }
    for (const f of run.floaters) AU.Font.shadow(ctx, f.text, f.x, f.y, f.color, '#000', 1, 'center');
  }

  function speedLines(t) {
    ctx.fillStyle = t.hud.text;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const r0 = AU.rand(95, 150), len = AU.rand(10, 30);
      for (let s = 0; s < len; s += 3) {
        ctx.fillRect(Math.round(W / 2 + Math.cos(a) * (r0 + s)), Math.round(H / 2 + Math.sin(a) * (r0 + s) * 0.8), 1, 1);
      }
    }
  }

  /* ------------------------------------------------------------
     HUD
  ------------------------------------------------------------ */
  function panel(x, y, w, h, t) {
    ctx.fillStyle = t.hud.border;
    ctx.fillRect(x + 1, y, w - 2, h);
    ctx.fillRect(x, y + 1, w, h - 2);
    ctx.fillStyle = t.hud.bg;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }

  function statusFor(run) {
    const h = AU.Theme.current.hud, p = run.player;
    if (run.power.shield > 0) return { text: 'SHIELD ON', color: h.good };
    if (p.sinking) return { text: 'LOW LIFT', color: h.warn };
    if (run.power.boost > 0) return { text: 'BOOST!', color: h.warn };
    if (run.power.stabilizer > 0) return { text: 'STABILIZED', color: h.good };
    if (Math.abs(run.wind.x) > 3) return { text: 'TURBULENCE', color: h.warn };
    if (Math.abs(p.bank) > 0.18) return { text: p.bank > 0 ? 'BANK RIGHT' : 'BANK LEFT', color: h.text };
    if (p.vy > 6) return { text: 'CLIMBING', color: h.text };
    if (p.vy < -6) return { text: 'DESCENDING', color: h.text };
    return { text: 'LEVEL FLIGHT', color: h.dim };
  }

  function warningFor(run, L) {
    const h = AU.Theme.current.hud, p = run.player;
    if (p.warn.ground) return { text: L.groundCrash ? 'PULL UP!' : 'LOW ALTITUDE', color: h.danger };
    if (p.sinking) return { text: 'LOW LIFT! FIND THRUST', color: h.warn };
    if (p.warn.corridor) return { text: 'STAY IN THE CORRIDOR', color: h.warn };
    if (p.warn.ceiling) return { text: 'MAX ALTITUDE', color: h.warn };
    return null;
  }

  function drawHUD(run, L) {
    const t = AU.Theme.current, h = t.hud, F = AU.Font, p = run.player;
    const blink = Math.floor(clock * 4) & 1;

    // TOP LEFT — score
    panel(3, 3, 66, 21, t);
    F.draw(ctx, 'SCORE', 8, 6, h.dim);
    F.draw(ctx, AU.pad(run.score, 7), 8, 14, h.accent);

    // TOP CENTER — level + progress
    panel(112, 3, 96, 21, t);
    F.draw(ctx, 'LEVEL ' + AU.pad(L.n, 2), 160, 6, h.text, 1, 'center');
    const prog = L.boss ? run.storm.gates / L.gatesNeeded : run.levelDist / L.length;
    ctx.fillStyle = h.dim; ctx.fillRect(118, 16, 84, 5);
    ctx.fillStyle = h.bg; ctx.fillRect(119, 17, 82, 3);
    ctx.fillStyle = L.boss ? h.danger : h.accent;
    ctx.fillRect(119, 17, Math.round(82 * AU.clamp(prog, 0, 1)), 3);

    // TOP RIGHT — speed
    panel(251, 3, 66, 21, t);
    F.draw(ctx, 'SPEED', 312, 6, h.dim, 1, 'right');
    F.draw(ctx, AU.pad(run.speed * AU.SPEED_KT, 3) + ' KT', 312, 14, run.power.boost > 0 ? h.warn : h.accent, 1, 'right');

    // BOTTOM LEFT — altitude
    panel(3, 216, 66, 21, t);
    F.draw(ctx, 'ALT', 8, 219, h.dim);
    const alt = Math.max(0, Math.round((p.y * AU.ALT_FT) / 10) * 10);
    F.draw(ctx, AU.pad(alt, 4) + ' FT', 8, 227, p.warn.ground && blink ? h.danger : h.accent);

    // BOTTOM RIGHT — lives
    panel(251, 216, 66, 21, t);
    F.draw(ctx, 'LIVES', 312, 219, h.dim, 1, 'right');
    for (let i = 0; i < run.maxLives; i++) {
      ctx.drawImage(AU.Sprites.icon(i < run.lives ? 'heart' : 'heartEmpty'), 312 - (run.maxLives - i) * 9 + 2, 228);
    }

    // BOTTOM CENTER — aircraft status + roll indicator
    panel(100, 210, 120, 27, t);
    const st = statusFor(run);
    F.draw(ctx, st.text, 160, 213, st.color, 1, 'center');
    const cx = 160, cy = 229 + Math.round(-p.pitchVis * 2), R = 13, ang = -p.bank;
    ctx.fillStyle = h.dim;
    pline(ctx, cx - Math.cos(ang) * R, cy - Math.sin(ang) * R, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
    ctx.fillStyle = h.accent;
    ctx.fillRect(cx - 8, 229, 5, 1); ctx.fillRect(cx + 4, 229, 5, 1); ctx.fillRect(cx - 1, 228, 3, 3);
    F.draw(ctx, bleConnected ? 'BLE' : 'KEY', 104, 226, bleConnected ? h.good : h.dim);
    F.draw(ctx, (targetRoll >= 0 ? '+' : '-') + AU.pad(Math.abs(targetRoll), 2), 216, 226, h.dim, 1, 'right');

    // active power-ups
    let px = 4;
    for (const k in run.power) {
      const left = run.power[k];
      if (left <= 0) continue;
      const info = AU.POWERUPS[k];
      panel(px, 26, 13, 14, t);
      F.draw(ctx, info.letter, px + 4, 29, left < 2 && blink ? h.dim : h.good);
      ctx.fillStyle = h.good;
      ctx.fillRect(px + 1, 38, Math.max(0, Math.round((11 * left) / info.time)), 1);
      px += 15;
    }

    if (run.combo >= 2) F.shadow(ctx, 'COMBO x' + run.combo, 160, 27, h.accent, '#000', 1, 'center');

    if (blink) {
      const warn = warningFor(run, L);
      if (warn) F.shadow(ctx, warn.text, 160, 60, warn.color, '#000', 1, 'center');
    }
    if (run.wind.warn > 0 && blink) {
      const right = run.wind.px > 0;
      F.shadow(ctx, right ? 'GUST ▶▶' : '◀◀ GUST', right ? 312 : 8, 112, h.warn, '#000', 1, right ? 'right' : 'left');
    }
    if (L.aero) drawForces(run, t);
    if (L.precision) drawFocus(run, t);
  }

  // Level 5: live Lift / Weight / Thrust / Drag diagram
  function drawForces(run, t) {
    const h = t.hud, F = AU.Font;
    panel(279, 78, 38, 60, t);
    const cx = 297, cy = 108;
    const lift = Math.round(4 + AU.clamp(run.lift, 0, 1.4) * 12);
    const weight = 14;
    const thrust = Math.round(3 + AU.clamp((run.aeroSpeed + 26) / 66, 0, 1) * 11);
    const drag = run.inDrag > 0 ? 14 : 6;
    ctx.fillStyle = h.accent; ctx.fillRect(cx - 1, cy - 1, 3, 3);
    ctx.fillStyle = h.good; ctx.fillRect(cx, cy - 2 - lift, 1, lift); ctx.fillRect(cx - 1, cy - 2 - lift, 3, 1);
    ctx.fillStyle = h.danger; ctx.fillRect(cx, cy + 2, 1, weight); ctx.fillRect(cx - 1, cy + 1 + weight, 3, 1);
    ctx.fillStyle = h.text; ctx.fillRect(cx + 2, cy, thrust, 1); ctx.fillRect(cx + 1 + thrust, cy - 1, 1, 3);
    ctx.fillStyle = h.warn; ctx.fillRect(cx - 2 - drag, cy, drag, 1); ctx.fillRect(cx - 2 - drag, cy - 1, 1, 3);
    F.draw(ctx, 'L', cx + 3, 81, h.good);
    F.draw(ctx, 'W', cx + 3, 129, h.danger);
    F.draw(ctx, 'T', 310, cy + 3, h.text);
    F.draw(ctx, 'D', 281, cy + 3, h.warn);
  }

  // Level 6: focus meter
  function drawFocus(run, t) {
    const h = t.hud;
    panel(289, 78, 28, 64, t);
    AU.Font.draw(ctx, 'FOC', 303, 81, h.dim, 1, 'center');
    ctx.fillStyle = h.dim; ctx.fillRect(298, 91, 10, 47);
    ctx.fillStyle = h.bg; ctx.fillRect(299, 92, 8, 45);
    const fh = Math.round(45 * run.focus);
    ctx.fillStyle = run.focus > 0.66 ? h.good : run.focus > 0.33 ? h.warn : h.danger;
    ctx.fillRect(299, 137 - fh, 8, fh);
  }

  /* ------------------------------------------------------------
     LESSON CARD ILLUSTRATIONS
  ------------------------------------------------------------ */
  function drawCardArt(cv, id, time) {
    const g = cv.getContext('2d');
    const t = AU.Theme.current;
    const w = cv.width, h = cv.height;
    g.imageSmoothingEnabled = false;
    g.fillStyle = id === 'storm' ? t.sky[0] : t.sky[2];
    g.fillRect(0, 0, w, h);
    g.fillStyle = t.ground[1];
    g.fillRect(0, h - 8, w, 8);
    g.fillStyle = t.horizonLine;
    g.fillRect(0, h - 8, w, 1);

    const topView = ['yaw', 'thrust', 'drag', 'speed', 'reaction', 'corridor'].includes(id);
    const spr = AU.Sprites.aircraft(AU.Save.settings.aircraft, topView ? 'top' : 'rear');
    let ang = 0, dx = 0, dy = Math.sin(time * 2) * 1.5;
    const F = AU.Font;
    const arrowV = (x, y0, len, col) => {
      g.fillStyle = col;
      const dir = Math.sign(len);
      g.fillRect(x, Math.min(y0, y0 + len), 1, Math.abs(len));
      g.fillRect(x - 1, y0 + len - dir, 3, 1);
      g.fillRect(x - 2, y0 + len - dir * 2, 5, 1);
    };

    switch (id) {
      case 'roll': ang = Math.sin(time * 2) * 0.55; F.draw(g, 'ROLL', 3, 3, t.hud.text); break;
      case 'pitch': dy = Math.sin(time * 2) * 9; F.draw(g, 'PITCH', 3, 3, t.hud.text); arrowV(88, 28, dy < 0 ? -12 : 12, t.hud.accent); break;
      case 'yaw': ang = Math.sin(time * 1.5) * 0.5; F.draw(g, 'YAW', 3, 3, t.hud.text); break;
      case 'altitude':
      case 'terrain': {
        dy = Math.sin(time) * 8;
        const planeY = Math.round(h / 2 - 6 + dy);
        g.fillStyle = t.hud.accent;
        g.fillRect(14, planeY, 1, h - 8 - planeY);
        for (let y = planeY; y < h - 8; y += 4) g.fillRect(12, y, 5, 1);
        F.draw(g, 'ALT', 3, 3, t.hud.text);
        break;
      }
      case 'speed':
      case 'reaction':
        g.fillStyle = t.hud.text;
        for (let i = 0; i < 8; i++) {
          const y = Math.round((time * 90 + i * 13) % h);
          g.fillRect(10 + (i % 2) * 6, y, 1, 6);
          g.fillRect(w - 12 - (i % 2) * 6, (y + 20) % h, 1, 6);
        }
        break;
      case 'lift': arrowV(48, 12, -Math.round(8 + Math.sin(time * 3) * 2), t.hud.good); F.draw(g, 'LIFT', 3, 3, t.hud.good); break;
      case 'weight': arrowV(48, 38, Math.round(8 + Math.sin(time * 3) * 2), t.hud.danger); F.draw(g, 'WEIGHT', 3, 3, t.hud.danger); break;
      case 'thrust': arrowV(48, 8, -6, t.hud.text); F.draw(g, 'THRUST', 3, 3, t.hud.text); break;
      case 'drag': arrowV(48, 6, 8, t.hud.warn); F.draw(g, 'DRAG', 3, 3, t.hud.warn); break;
      case 'stability': ang = Math.sin(time * 7) * 0.5 * Math.exp(-(time % 3) * 1.6); break;
      case 'turbulence': ang = Math.sin(time * 9) * 0.25; dx = Math.sin(time * 5) * 6; break;
      case 'corridor':
        g.fillStyle = t.pylon;
        for (let i = 0; i < 5; i++) {
          const y = Math.round((time * 40 + i * 12) % h);
          g.fillRect(18, y, 2, 4); g.fillRect(w - 20, y, 2, 4);
        }
        break;
      case 'precision':
      case 'focus': {
        g.fillStyle = t.ring;
        const R = 16 + Math.sin(time * 2) * 2;
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          g.fillRect(Math.round(w / 2 + Math.cos(a) * R), Math.round(h / 2 - 4 + Math.sin(a) * R * 0.8), 1, 1);
        }
        break;
      }
      case 'storm':
        if (Math.floor(time * 3) % 3 === 0) {
          g.fillStyle = t.bolt;
          for (let y = 0; y < h - 8; y += 4) g.fillRect(70 + ((y * 7) % 5), y, 2, 4);
        }
        break;
    }

    g.save();
    g.translate(Math.round(w / 2 + dx), Math.round(h / 2 - 4 + dy));
    g.rotate(ang);
    g.drawImage(spr, -spr.width, -spr.height, spr.width * 2, spr.height * 2);
    g.restore();
  }

  /* ------------------------------------------------------------
     PUBLIC
  ------------------------------------------------------------ */
  AU.Renderer = {
    init(cv) {
      canvas = cv;
      ctx = cv.getContext('2d');
      AU.Theme.onChange(buildBackground);
      buildBackground(AU.Theme.current);
    },

    render(G, dt) {
      clock += dt;
      ctx.imageSmoothingEnabled = false;
      if (G.state === 'BOOT') {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        return;
      }
      if (RUN_STATES.has(G.state) && G.run) {
        const L = AU.LEVELS[G.run.levelIndex];
        drawScene(G.run, L, {});
        if (G.state !== 'GAME_COMPLETE') drawHUD(G.run, L);
      } else if (G.demo) {
        drawScene(G.demo, null, {});
      }
    },

    // Player position on screen (including the world rotation)
    playerScreen(run) {
      const cam = camera(run), p = run.player;
      const pp = proj(cam, p.x, p.y, AU.PLAYER_Z);
      const dx = pp.x - W / 2, dy = pp.y - H / 2;
      const c = Math.cos(cam.angle), s = Math.sin(cam.angle);
      return { x: W / 2 + dx * c - dy * s, y: H / 2 + dx * s + dy * c };
    },

    drawCardArt
  };
})(window.AU);
