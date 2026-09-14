/* ============================================================
   AAKASH UDAAN — EDUCATION CONTENT
   Short lesson cards (shown in flight) and the FLIGHT SCHOOL
   library (accessible from the title menu). One or two simple
   sentences each — this is an arcade game, not a lecture.

   This is an educational prototype. It is NOT a certified
   flight simulator or professional training device, and it
   makes no medical claims.
   ============================================================ */
(function (AU) {
  AU.LESSONS = {
    /* ---------- FLIGHT BASICS ---------- */
    roll: {
      title: 'ROLL', q: 'WHAT IS ROLL?',
      text: 'Roll is the rotation of an aircraft around its front-to-back axis. Tilting changes its bank angle, and banking is what turns the aircraft.',
      tip: 'TILT THE CONTROLLER LEFT / RIGHT TO BANK AND STEER.'
    },
    pitch: {
      title: 'PITCH', q: 'WHAT IS PITCH?',
      text: 'Pitch is the nose moving up or down around the wing-to-wing axis. Nose up to climb, nose down to descend.',
      tip: 'TILT FORWARD / BACK TO DIVE AND CLIMB.'
    },
    yaw: {
      title: 'YAW', q: 'WHAT IS YAW?',
      text: 'Yaw is the nose swinging left or right around the vertical axis. Real aircraft use the rudder for it; in this game banking does the turning for you.'
    },
    altitude: {
      title: 'ALTITUDE', q: 'WHAT IS ALTITUDE?',
      text: 'Altitude is the height of the aircraft above a reference level, such as the ground or sea level.',
      tip: 'WATCH ALT. THE GROUND IS NOW SOLID!'
    },
    speed: {
      title: 'SPEED', q: 'WHY DOES SPEED MATTER?',
      text: 'Aircraft speed affects how quickly you reach obstacles and how much time you have to respond to changes in direction.',
      tip: 'SPEED RISES THROUGH THIS LEVEL. REACT EARLY.'
    },

    /* ---------- AERODYNAMICS ---------- */
    lift: {
      title: 'LIFT', q: 'WHAT IS LIFT?',
      text: 'Lift is the force that helps an aircraft stay in the air. Air flowing over the wings creates it, and more speed means more lift.',
      tip: 'KEEP YOUR SPEED UP OR YOU WILL SINK.'
    },
    weight: {
      title: 'WEIGHT', q: 'WHAT IS WEIGHT?',
      text: 'Weight is gravity pulling the aircraft down. To stay level, lift must balance weight.',
      tip: 'LOW SPEED = LOW LIFT = THE PLANE SINKS.'
    },
    thrust: {
      title: 'THRUST', q: 'WHAT IS THRUST?',
      text: 'Thrust is the force that pushes an aircraft forward. Engines or propellers produce it.',
      tip: 'FLY THROUGH THRUST RINGS TO SPEED UP.'
    },
    drag: {
      title: 'DRAG', q: 'WHAT IS DRAG?',
      text: 'Drag is air resistance that pushes back against the aircraft and slows it down.',
      tip: 'DRAG CLOUDS SLOW YOU DOWN. AVOID THEM.'
    },
    stability: {
      title: 'STABILITY', q: 'WHAT IS STABILITY?',
      text: 'Aircraft stability describes how the aircraft responds after being disturbed, for example whether it settles back or keeps drifting.',
      tip: 'GUSTS WILL PUSH YOU. CORRECT GENTLY.'
    },

    /* ---------- CONTROL SYSTEMS ---------- */
    sensors: {
      title: 'SENSORS', q: 'WHAT IS A SENSOR?',
      text: 'A sensor measures something in the physical world and turns it into a signal. The MPU6050 measures acceleration and rotation.'
    },
    motion: {
      title: 'MOTION SENSING', q: 'HOW IS TILT MEASURED?',
      text: 'When the board is still, gravity pulls on its accelerometer. By comparing the pull on each axis, the ESP32 calculates roll and pitch angles.'
    },
    feedback: {
      title: 'FEEDBACK', q: 'WHAT IS FEEDBACK?',
      text: 'Feedback means you watch the result of an action and adjust. You tilt, see the plane move, and correct. That is a closed control loop with you inside it.'
    },
    hmi: {
      title: 'HUMAN-MACHINE INTERACTION', q: 'WHAT IS HMI?',
      text: 'Human-machine interaction studies how people control machines. Here, a hand movement becomes digital input through a sensor, a microcontroller and Bluetooth.'
    },

    /* ---------- IN-FLIGHT NOTES (unlocked by playing) ---------- */
    corridor: {
      title: 'FLIGHT CORRIDOR', q: 'STAY IN THE CORRIDOR',
      text: 'Pilots follow planned routes and safe zones. The marker posts show your corridor. Fly through the rings to keep your combo.',
      tip: 'SMALL TILTS KEEP YOU CENTRED.'
    },
    reaction: {
      title: 'REACTION TIME', q: 'LOOK AHEAD',
      text: 'Reaction time is the delay between seeing something and responding. At higher speed, look further ahead so you can plan early.'
    },
    terrain: {
      title: 'TERRAIN', q: 'WATCH THE TERRAIN',
      text: 'Hills and walls reach up into your flight path. Climb early. Your shadow on the ground shows how high you are.'
    },
    turbulence: {
      title: 'TURBULENCE', q: 'WHAT IS TURBULENCE?',
      text: 'Turbulence is irregular air movement that bumps an aircraft around. A stable aircraft is easier to recover.',
      tip: 'WATCH FOR GUST ARROWS AND LEAN INTO THEM.'
    },
    precision: {
      title: 'PRECISION', q: 'SMALL MOVES WIN',
      text: 'Small, controlled movements improve precision. Over-correcting makes the aircraft wobble.',
      tip: 'SMOOTH FLYING BUILDS YOUR FOCUS BONUS.'
    },
    focus: {
      title: 'FOCUS', q: 'KEEP YOUR FOCUS',
      text: 'This level is a sustained attention challenge. Keep your eyes on the next ring and let your hands follow calmly.'
    },
    storm: {
      title: 'STORM FRONT', q: 'FINAL CHALLENGE',
      text: 'Everything you learned, all at once. Fly through the storm gates to break the storm. Watch for lightning columns.',
      tip: 'GATES WEAKEN THE STORM.'
    }
  };

  /* ------------------------------------------------------------
     FLIGHT SCHOOL / LEARNING LAB LIBRARY
  ------------------------------------------------------------ */
  AU.APPLICATIONS = {
    app_pilot: {
      title: 'PILOT TRAINING',
      text: 'Basic flight-control ideas like bank, pitch and coordination can be shown in simplified simulations before anyone sits in a real cockpit.'
    },
    app_edu: {
      title: 'AEROSPACE EDUCATION',
      text: 'Students can see orientation, movement, stability and control happen in real time instead of reading about them.'
    },
    app_hmi: {
      title: 'HUMAN-MACHINE INTERACTION',
      text: 'The MPU6050 shows how physical motion can become digital input, the same idea behind motion controllers and gesture interfaces.'
    },
    app_robotics: {
      title: 'ROBOTICS',
      text: 'The same tilt-to-control idea can steer robots, vehicles, drones and other remote systems.'
    },
    app_research: {
      title: 'RESEARCH & PROTOTYPING',
      text: 'Motion sensors are cheap and flexible, so they make good interfaces for experimental control systems.'
    },
    app_focus: {
      title: 'FOCUS & COORDINATION',
      text: 'The game gives a structured challenge that uses sustained attention, reaction and controlled movement. It is designed to encourage hand-eye coordination. It is not a medical or therapeutic tool.'
    },
    app_fun: {
      title: 'ENTERTAINMENT',
      text: 'At its core, Aakash Udaan is an interactive motion-controlled arcade game. Learning is the bonus stage.'
    }
  };

  AU.LAB = [
    { id: 'basics', title: 'FLIGHT BASICS', items: ['roll', 'pitch', 'yaw', 'altitude', 'speed'] },
    { id: 'aero', title: 'AERODYNAMICS', items: ['lift', 'drag', 'thrust', 'weight', 'stability'] },
    { id: 'control', title: 'CONTROL SYSTEMS', items: ['sensors', 'motion', 'feedback', 'hmi'] },
    { id: 'apps', title: 'REAL-WORLD USES', items: ['app_pilot', 'app_edu', 'app_hmi', 'app_robotics', 'app_research', 'app_focus', 'app_fun'] },
    { id: 'notes', title: 'FLIGHT NOTES', locked: true, items: ['corridor', 'reaction', 'terrain', 'turbulence', 'precision', 'focus', 'storm'] }
  ];

  // Items that count towards AERODYNAMIC THINKER
  AU.LAB_REQUIRED = AU.LAB.filter((s) => !s.locked).flatMap((s) => s.items);

  AU.lessonById = (id) => AU.LESSONS[id] || AU.APPLICATIONS[id];

  /* ------------------------------------------------------------
     DATA CHIP FACTS — collected in flight
  ------------------------------------------------------------ */
  AU.DATA_FACTS = [
    'THE MPU6050 HOLDS A 3-AXIS ACCELEROMETER AND A 3-AXIS GYROSCOPE ON ONE CHIP.',
    'THE ESP32 HAS BOTH WI-FI AND BLUETOOTH BUILT IN.',
    'YOUR CONTROLLER SENDS ABOUT 20 TILT READINGS EVERY SECOND.',
    'EACH READING IS PLAIN TEXT: "ROLL,PITCH" IN DEGREES.',
    'THE SENSOR TALKS TO THE ESP32 OVER I2C USING JUST TWO WIRES: SDA AND SCL.',
    'BLUETOOTH LOW ENERGY USES SERVICES AND CHARACTERISTICS TO ORGANISE DATA.',
    'ROLL IS CALCULATED WITH ATAN2 OF THE Y AND Z ACCELERATION.',
    'THE FOUR FORCES OF FLIGHT ARE LIFT, WEIGHT, THRUST AND DRAG.',
    'AILERONS CONTROL ROLL, THE ELEVATOR CONTROLS PITCH, THE RUDDER CONTROLS YAW.',
    'SMOOTHING FILTERS REMOVE SENSOR JITTER SO CONTROL FEELS STEADY.'
  ];

  AU.DISCLAIMER = 'AAKASH UDAAN IS AN EDUCATIONAL PROTOTYPE AND ARCADE GAME. IT IS NOT A CERTIFIED FLIGHT SIMULATOR, A PROFESSIONAL TRAINING DEVICE, OR A MEDICAL TOOL.';
})(window.AU);
