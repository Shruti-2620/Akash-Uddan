/* ============================================================
   AAKASH UDAAN — LEVELS
   Each level introduces ONE idea. Data only; the spawner in
   world.js reads the pattern weights, and game.js reads the
   lesson timeline (fractions of the level length).

   length      world units to fly to finish the level
   speed       [start, end] base forward speed across the level
   corridor    half-width of the flight corridor
   gap         [min, max] seconds between spawned patterns
   groundCrash touching the ground ends the run
   turbulence  gust strength (0 = calm)
   aero        enables the lift / weight / thrust / drag model
   precision   enables the FOCUS meter
   boss        storm gates must be cleared to finish
   ============================================================ */
(function (AU) {
  AU.LEVELS = [
    {
      n: 1, name: 'BASIC FLIGHT', length: 2500, speed: [52, 58], corridor: 34,
      gap: [2.4, 3.2], groundCrash: false, turbulence: 0,
      lessons: [{ at: 0.0, id: 'roll' }, { at: 0.3, id: 'pitch' }, { at: 0.62, id: 'corridor' }],
      patterns: { ringLine: 5, tokenArc: 3, tokenColumn: 1, towerSingle: 1.2, powerup: 0.5 },
      learned: ['ROLL', 'PITCH', 'FLIGHT CORRIDOR']
    },
    {
      n: 2, name: 'SPEED', length: 3500, speed: [62, 96], corridor: 36,
      gap: [1.5, 2.1], groundCrash: false, turbulence: 0,
      lessons: [{ at: 0.0, id: 'speed' }, { at: 0.5, id: 'reaction' }],
      patterns: { towerPair: 4, towerField: 2.5, towerSingle: 2, tokenArc: 2, ringLine: 2, powerup: 0.7 },
      learned: ['SPEED', 'REACTION TIME']
    },
    {
      n: 3, name: 'ALTITUDE', length: 3700, speed: [72, 82], corridor: 36,
      gap: [1.7, 2.3], groundCrash: true, turbulence: 0,
      lessons: [{ at: 0.0, id: 'altitude' }, { at: 0.42, id: 'terrain' }],
      patterns: { ridge: 3, wallGap: 3.5, towerTall: 2, tokenColumn: 2, ringLine: 2, powerup: 0.7 },
      learned: ['ALTITUDE', 'TERRAIN']
    },
    {
      n: 4, name: 'STABILITY', length: 3900, speed: [76, 84], corridor: 36,
      gap: [1.5, 2.1], groundCrash: true, turbulence: 1,
      lessons: [{ at: 0.0, id: 'stability' }, { at: 0.35, id: 'turbulence' }],
      patterns: { drone: 4, balloons: 3, towerPair: 2, ringLine: 2, wallGap: 1, tokenArc: 1.5, powerup: 0.9 },
      powerWeights: { stabilizer: 4, shield: 2, magnet: 1, slow: 2, boost: 0.5 },
      learned: ['STABILITY', 'TURBULENCE']
    },
    {
      n: 5, name: 'AERODYNAMICS', length: 4100, speed: [78, 78], corridor: 36,
      gap: [1.5, 2.0], groundCrash: true, turbulence: 0.35, aero: true,
      lessons: [{ at: 0.0, id: 'lift' }, { at: 0.2, id: 'weight' }, { at: 0.4, id: 'thrust' }, { at: 0.6, id: 'drag' }],
      patterns: { thrustRing: 4, dragCloud: 3, towerPair: 2, ridge: 1.2, tokenArc: 2, drone: 1, powerup: 0.6 },
      learned: ['LIFT', 'WEIGHT', 'THRUST', 'DRAG']
    },
    {
      n: 6, name: 'FOCUS', length: 3600, speed: [66, 72], corridor: 22,
      gap: [2.2, 2.8], groundCrash: true, turbulence: 0.25, precision: true,
      lessons: [{ at: 0.0, id: 'precision' }, { at: 0.5, id: 'focus' }],
      patterns: { precisionPath: 6, towerPair: 1, tokenArc: 1, powerup: 0.4 },
      learned: ['PRECISION', 'SUSTAINED FOCUS']
    },
    {
      n: 7, name: 'STORM FRONT', length: 9000, speed: [80, 88], corridor: 36,
      gap: [1.4, 1.9], groundCrash: true, turbulence: 0.8, boss: true, gatesNeeded: 10,
      lessons: [{ at: 0.0, id: 'storm' }],
      patterns: { stormGate: 5, bolt: 3, drone: 1.5, towerPair: 1.5, dragCloud: 1, tokenArc: 1, powerup: 0.8 },
      learned: ['EVERYTHING!']
    }
  ];

  AU.POWERUPS = {
    shield:     { letter: 'S', name: 'SHIELD', time: 8 },
    boost:      { letter: 'B', name: 'BOOST', time: 5 },
    stabilizer: { letter: 'Z', name: 'STABILIZER', time: 10 },
    magnet:     { letter: 'M', name: 'MAGNET', time: 10 },
    slow:       { letter: 'T', name: 'TIME SLOW', time: 6 }
  };
  AU.DEFAULT_POWER_WEIGHTS = { shield: 3, boost: 2, stabilizer: 2, magnet: 2, slow: 1.5 };
})(window.AU);
