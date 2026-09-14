/* ============================================================
   AAKASH UDAAN — PLAYER
   Arcade flight model:
     ROLL  → bank angle → sideways velocity (banking turns you)
     PITCH → climb / descent rate
   Aircraft stats change how quick, how agile and how steady it
   feels. Everything is eased so input never feels twitchy.
   ============================================================ */
(function (AU) {
  AU.SPRITE_SCALE = 2;

  class Player {
    constructor(aircraft) {
      this.ac = aircraft;
      this.mech = AU.aircraftMechanics(aircraft);
      this.x = 0;
      this.y = 24;
      this.vx = 0;
      this.vy = 0;
      this.bank = 0;       // radians, visual
      this.pitchVis = 0;   // -1..1, visual
      this.invuln = 0;
      this.visible = true;
      this.warn = { corridor: false, ground: false, ceiling: false };
      this.sinking = false;

      // Hitbox derived from the rear sprite so what you see is what collides
      const rows = aircraft.rear;
      const widthPx = (Math.max(...rows.map((r) => r.length)) * 2 - 1) * AU.SPRITE_SCALE;
      const heightPx = rows.length * AU.SPRITE_SCALE;
      const pxPerUnit = AU.FOCAL / AU.PLAYER_Z;
      this.hw = (widthPx / pxPerUnit / 2) * 0.72;
      this.hh = (heightPx / pxPerUnit / 2) * 0.7;
    }

    /* Returns 'ground' if the aircraft hit solid ground, else null */
    update(dt, ctrl, run, level) {
      const m = this.mech;
      const stab = run.power.stabilizer > 0;
      const lateral = m.lateral * (stab ? 0.85 : 1);
      const response = m.response * (stab ? 1.25 : 1);

      this.vx = AU.approach(this.vx, ctrl.roll * lateral, response, dt);
      this.vy = AU.approach(this.vy, ctrl.pitch * m.climb, response, dt);

      // turbulence (stabilizer nearly cancels it)
      const gust = stab ? 0.15 : m.gustResist;
      this.x += (this.vx + run.wind.x * gust) * dt;
      this.y += (this.vy + run.wind.y * gust) * dt;

      // Level 5+: lift depends on speed; weight always pulls down
      this.sinking = false;
      if (level && level.aero) {
        const cruise = level.speed[0] * m.speedMul;
        run.lift = Math.pow(run.speed / cruise, 2);
        if (run.lift < 1) this.y -= (1 - run.lift) * 14 * dt;
        else this.y += Math.min(run.lift - 1, 0.4) * 6 * dt;
        this.sinking = run.lift < 0.8;
      } else {
        run.lift = 1;
      }

      // flight corridor: soft walls
      const lim = run.corridor;
      this.warn.corridor = false;
      if (this.x > lim) { this.x = lim; this.vx = Math.min(this.vx, 0); this.warn.corridor = true; }
      if (this.x < -lim) { this.x = -lim; this.vx = Math.max(this.vx, 0); this.warn.corridor = true; }

      // ceiling
      this.warn.ceiling = this.y >= AU.ALT_MAX;
      if (this.y > AU.ALT_MAX) { this.y = AU.ALT_MAX; this.vy = Math.min(this.vy, 0); }

      // ground: soft floor early on, solid from Level 3
      this.warn.ground = this.y < AU.ALT_MIN + 5;
      const groundCrash = level && level.groundCrash;
      if (groundCrash) {
        if (this.y - this.hh <= 0.2) return 'ground';
      } else if (this.y < AU.ALT_MIN) {
        this.y = AU.ALT_MIN;
        this.vy = Math.max(this.vy, 0);
      }

      this.bank = AU.approach(this.bank, ctrl.roll * 0.62, 10, dt);
      this.pitchVis = AU.approach(this.pitchVis, ctrl.pitch, 8, dt);
      if (this.invuln > 0) this.invuln -= dt;
      return null;
    }

    // bounce up after a shield absorbs a ground strike
    bounce() {
      this.y = AU.ALT_MIN + 8;
      this.vy = 18;
    }
  }

  AU.Player = Player;
})(window.AU);
