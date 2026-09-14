/* ============================================================
   AAKASH UDAAN — STORAGE
   High scores, achievements, unlocks, lessons seen and settings
   are kept in localStorage. Every read/write is wrapped in
   try/catch so the game still runs in private windows.
   ============================================================ */
(function (AU) {
  const KEY = 'aakashUdaan.save.v1';

  const DEFAULT_SCORES = [
    { name: 'ACE', score: 12000, level: 6, aircraft: 'ARROW' },
    { name: 'SKY', score: 9500, level: 5, aircraft: 'FALCON' },
    { name: 'NOV', score: 7200, level: 4, aircraft: 'SKYHAWK' },
    { name: 'PLT', score: 5000, level: 3, aircraft: 'ORBIT' },
    { name: 'ESP', score: 3200, level: 2, aircraft: 'SKYHAWK' },
    { name: 'MPU', score: 2000, level: 2, aircraft: 'ORBIT' },
    { name: 'BLE', score: 1200, level: 1, aircraft: 'SKYHAWK' },
    { name: 'LAB', score: 800, level: 1, aircraft: 'SKYHAWK' }
  ];

  function defaults() {
    return {
      highScores: DEFAULT_SCORES.map((s) => ({ ...s })),
      achievements: {},   // id -> timestamp
      lessonsSeen: {},    // in-flight lesson id -> true
      labRead: {},        // flight school item id -> true
      chips: {},          // data chip fact index -> true
      stats: { totalStars: 0, bestLevel: 1, gamesCompleted: 0, flights: 0 },
      settings: {
        aircraft: 'skyhawk',
        theme: 'day',
        crt: true,
        sound: true,
        lessonCards: 'always', // 'always' | 'new'
        invertRoll: false,
        invertPitch: false,
        sensitivity: 1,        // 0.75 | 1 | 1.35
        lastInitials: 'AAA'
      },
      unlockAll: false
    };
  }

  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    for (const k in base) {
      if (!(k in saved)) continue;
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        base[k] = merge(base[k], saved[k]);
      } else {
        base[k] = saved[k];
      }
    }
    return base;
  }

  AU.Save = {
    data: defaults(),

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) this.data = merge(defaults(), JSON.parse(raw));
      } catch (e) { /* storage blocked — keep defaults */ }
      return this.data;
    },

    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    },

    get settings() { return this.data.settings; },

    setSetting(key, value) {
      this.data.settings[key] = value;
      this.save();
    },

    /* ---------- high scores ---------- */
    qualifies(score) {
      const hs = this.data.highScores;
      return score > 0 && (hs.length < 10 || score > hs[hs.length - 1].score);
    },

    addScore(entry) {
      const hs = this.data.highScores;
      hs.push(entry);
      hs.sort((a, b) => b.score - a.score);
      hs.length = Math.min(hs.length, 10);
      this.save();
      return hs.indexOf(entry);
    },

    /* ---------- achievements ---------- */
    hasAchievement(id) { return !!this.data.achievements[id]; },

    unlockAchievement(id) {
      if (this.data.achievements[id]) return false;
      this.data.achievements[id] = Date.now();
      this.save();
      return true;
    },

    /* ---------- progression ---------- */
    recordLevelReached(n) {
      if (n > this.data.stats.bestLevel) {
        this.data.stats.bestLevel = n;
        this.save();
      }
    },

    addStars(n) {
      this.data.stats.totalStars += n;
    },

    markLessonSeen(id) {
      this.data.lessonsSeen[id] = true;
      this.save();
    },

    markLabRead(id) {
      if (this.data.labRead[id]) return false;
      this.data.labRead[id] = true;
      this.save();
      return true;
    },

    collectChip(index) {
      if (this.data.chips[index]) return false;
      this.data.chips[index] = true;
      this.save();
      return true;
    },

    resetProgress() {
      const keepSettings = this.data.settings;
      this.data = defaults();
      this.data.settings = keepSettings;
      this.save();
    }
  };

  AU.Save.load();
})(window.AU);
