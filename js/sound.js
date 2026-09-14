/* ============================================================
   AAKASH UDAAN — SOUND
   Tiny chiptune-style effects generated with the Web Audio API
   (square / triangle waves + noise). No audio files needed.
   The AudioContext is created on the first user gesture.
   ============================================================ */
(function (AU) {
  let ctx = null;
  let master = null;
  let noiseBuf = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(freq, dur, opts = {}) {
    const { type = 'square', vol = 0.07, when = 0, slide = null } = opts;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, opts = {}) {
    const { vol = 0.15, when = 0, freq = 1200, endFreq = 200 } = opts;
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(freq, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  function seq(notes, step, opts) {
    notes.forEach((f, i) => { if (f) tone(f, step * 1.1, { ...opts, when: i * step }); });
  }

  const FX = {
    move:    () => tone(660, 0.04, { vol: 0.04 }),
    select:  () => { tone(880, 0.05); tone(1320, 0.08, { when: 0.05 }); },
    back:    () => { tone(520, 0.05); tone(350, 0.08, { when: 0.05 }); },
    denied:  () => { tone(180, 0.12, { type: 'sawtooth', vol: 0.05 }); tone(140, 0.15, { type: 'sawtooth', vol: 0.05, when: 0.1 }); },
    coin:    () => { tone(988, 0.08); tone(1319, 0.3, { when: 0.08 }); },
    collect: () => { tone(1047, 0.04, { vol: 0.05 }); tone(1568, 0.07, { vol: 0.05, when: 0.04 }); },
    chip:    () => seq([784, 988, 1175, 1568], 0.06, { type: 'triangle', vol: 0.09 }),
    ring:    () => seq([880, 1175, 1760], 0.045, { type: 'triangle', vol: 0.09 }),
    gate:    () => seq([523, 784, 1047, 1568], 0.06, { type: 'square', vol: 0.06 }),
    power:   () => tone(300, 0.3, { slide: 1400, type: 'square', vol: 0.06 }),
    thrust:  () => tone(200, 0.25, { slide: 900, type: 'sawtooth', vol: 0.05 }),
    drag:    () => noise(0.25, { vol: 0.06, freq: 600, endFreq: 150 }),
    hit:     () => { noise(0.25, { vol: 0.2, freq: 2000, endFreq: 200 }); tone(220, 0.25, { slide: 70, type: 'sawtooth', vol: 0.06 }); },
    shield:  () => { tone(1400, 0.15, { slide: 300, type: 'triangle', vol: 0.1 }); noise(0.15, { vol: 0.08 }); },
    crash:   () => {
      noise(1.1, { vol: 0.35, freq: 3000, endFreq: 60 });
      tone(160, 0.9, { slide: 35, type: 'sawtooth', vol: 0.08 });
      noise(0.5, { vol: 0.2, when: 0.25, freq: 900, endFreq: 80 });
    },
    warn:    () => { tone(440, 0.07, { vol: 0.05 }); tone(440, 0.07, { vol: 0.05, when: 0.14 }); },
    gust:    () => noise(0.45, { vol: 0.09, freq: 500, endFreq: 120 }),
    lesson:  () => seq([1319, 0, 1760], 0.06, { type: 'triangle', vol: 0.08 }),
    achieve: () => seq([784, 988, 1175, 1568, 1976], 0.07, { type: 'square', vol: 0.05 }),
    levelup: () => seq([523, 659, 784, 1047, 0, 784, 1047], 0.09, { type: 'square', vol: 0.06 }),
    start:   () => seq([392, 523, 659, 784, 1047], 0.06, { type: 'square', vol: 0.06 }),
    tick:    () => tone(1200, 0.03, { vol: 0.03 }),
    count:   () => tone(660, 0.12, { vol: 0.06 }),
    go:      () => tone(1320, 0.3, { vol: 0.07 }),
    complete:() => {
      seq([523, 523, 523, 659, 784, 0, 659, 784, 1047], 0.12, { type: 'square', vol: 0.06 });
      seq([262, 0, 262, 330, 392, 0, 330, 392, 523], 0.12, { type: 'triangle', vol: 0.08 });
    },
    boot:    () => { tone(110, 0.08, { vol: 0.05 }); tone(220, 0.08, { vol: 0.05, when: 0.1 }); tone(880, 0.12, { vol: 0.05, when: 0.2 }); }
  };

  AU.Sound = {
    unlock() { if (AU.Save.settings.sound) ensure(); },

    play(name) {
      if (!AU.Save.settings.sound) return;
      if (!ensure()) return;
      const fx = FX[name];
      if (fx) { try { fx(); } catch (e) { /* ignore audio glitches */ } }
    },

    toggle() {
      AU.Save.setSetting('sound', !AU.Save.settings.sound);
      if (AU.Save.settings.sound) this.play('select');
      return AU.Save.settings.sound;
    }
  };
})(window.AU);
