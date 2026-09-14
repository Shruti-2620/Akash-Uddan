/* ============================================================
   AAKASH UDAAN — ACHIEVEMENTS
   Definitions only. game.js calls AU.award(id) when earned.
   ============================================================ */
(function (AU) {
  AU.ACHIEVEMENTS = [
    { id: 'first_flight', name: 'FIRST FLIGHT', desc: 'COMPLETE LEVEL 1.' },
    { id: 'steady_hand', name: 'STEADY HAND', desc: 'FLY FOR 60 SECONDS WITHOUT CRASHING.' },
    { id: 'high_alt', name: 'HIGH ALTITUDE', desc: 'HOLD 8,000 FT OR HIGHER FOR 3 SECONDS.' },
    { id: 'precision', name: 'PRECISION PILOT', desc: 'COLLECT 20 PICKUPS WITHOUT TAKING A HIT.' },
    { id: 'ring_master', name: 'RING MASTER', desc: 'BUILD A 10-RING COMBO.' },
    { id: 'collector', name: 'DATA COLLECTOR', desc: 'FIND 5 DIFFERENT DATA CHIPS.' },
    { id: 'close_call', name: 'CLOSE CALL', desc: 'LET A SHIELD SAVE YOU FROM A CRASH.' },
    { id: 'linked_up', name: 'LINKED UP', desc: 'CLEAR A LEVEL USING THE ESP32 CONTROLLER.' },
    { id: 'thinker', name: 'AERODYNAMIC THINKER', desc: 'READ EVERY FLIGHT SCHOOL MODULE.' },
    { id: 'master', name: 'MASTER PILOT', desc: 'COMPLETE THE FULL GAME.' }
  ];

  AU.award = (id) => {
    if (!AU.Save.unlockAchievement(id)) return false;
    const a = AU.ACHIEVEMENTS.find((x) => x.id === id);
    AU.Sound.play('achieve');
    if (AU.UI) AU.UI.toast('ACHIEVEMENT UNLOCKED', a ? a.name : id, 'gold');
    return true;
  };
})(window.AU);
