/* ============================================================
   AAKASH UDAAN — COLLISION
   Pure checks only: returns a list of events and lets game.js
   decide what they mean (score, shield, crash …).

   Event kinds:
     crash   solid obstacle (tower, wall, ridge) → run ends
     hull    hazard (drone, balloon, lightning)  → lose a life
     ring / ringMiss / pickup / power / drag
   ============================================================ */
(function (AU) {
  const PZ = () => AU.PLAYER_Z;

  // Is the object's depth range touching the player's depth this frame?
  // (also catches thin objects that jumped past in one frame)
  function atPlayerDepth(o) {
    const d = (o.d || 1) / 2;
    const front = o.z - d, back = o.z + d, prevFront = o.prevZ - d;
    return front <= PZ() && (back >= PZ() || prevFront > PZ());
  }

  // Thin objects: did the centre cross the player's depth this frame?
  function crossed(o) {
    return o.prevZ > PZ() && o.z <= PZ();
  }

  function check(run) {
    const p = run.player;
    const events = [];

    for (const o of run.objects) {
      if (o.done) continue;

      switch (o.type) {
        case 'ring': {
          if (!crossed(o)) break;
          o.done = true;
          const dist = Math.hypot(p.x - o.x, p.y - o.y);
          events.push({ kind: dist < o.r ? 'ring' : 'ringMiss', obj: o });
          break;
        }

        case 'pickup':
        case 'power': {
          if (!crossed(o)) break;
          o.done = true;
          const reach = o.r + Math.max(p.hw, p.hh) * 0.9;
          if (Math.hypot(p.x - o.x, p.y - o.y) < reach) {
            o.remove = true;
            events.push({ kind: o.type, obj: o });
          }
          break;
        }

        case 'tower': {
          if (!atPlayerDepth(o)) break;
          if (Math.abs(p.x - o.x) < o.w / 2 + p.hw && p.y - p.hh < o.h) {
            events.push({ kind: 'crash', cause: 'TOWER', obj: o });
          }
          break;
        }

        case 'ridge': {
          if (!atPlayerDepth(o)) break;
          if (Math.abs(p.x - o.x) < o.w / 2 + p.hw && p.y - p.hh < o.h) {
            events.push({ kind: 'crash', cause: 'TERRAIN', obj: o });
          }
          break;
        }

        case 'wall': {
          if (!atPlayerDepth(o)) break;
          const insideGap =
            Math.abs(p.x - o.gx) < o.gw / 2 - p.hw * 0.8 &&
            Math.abs(p.y - o.gy) < o.gh / 2 - p.hh * 0.8;
          if (!insideGap) events.push({ kind: 'crash', cause: 'WALL', obj: o });
          break;
        }

        case 'drone':
        case 'balloon': {
          if (!atPlayerDepth(o)) break;
          if (Math.abs(p.x - o.x) < o.w / 2 + p.hw * 0.85 && Math.abs(p.y - o.y) < o.h / 2 + p.hh) {
            o.done = true;
            events.push({ kind: 'hull', cause: o.type === 'drone' ? 'DRONE' : 'BALLOON', obj: o });
          }
          break;
        }

        case 'bolt': {
          if (!o.active || !atPlayerDepth(o)) break;
          if (Math.abs(p.x - o.x) < o.w / 2 + p.hw * 0.6) {
            o.done = true;
            events.push({ kind: 'hull', cause: 'LIGHTNING', obj: o });
          }
          break;
        }

        case 'drag': {
          if (!atPlayerDepth(o)) break;
          if (Math.abs(p.x - o.x) < o.w / 2 && Math.abs(p.y - o.y) < o.h / 2) {
            events.push({ kind: 'drag', obj: o });
          }
          break;
        }
      }
    }
    return events;
  }

  AU.Collision = { check };
})(window.AU);
