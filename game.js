/* ============================================================
   Aakash Udaan — 3D tilt-flight game
   ------------------------------------------------------------
   Controls (this is the important part): tilting the ESP32
   controller sends ROLL and PITCH, just like a real plane.
     - ROLL (tilt left/right) banks the plane, and banking turns
       it left/right — you don't move a cursor up and down, you
       fly it like a stick.
     - PITCH (tilt forward/back) noses the plane up or down,
       which climbs or dives.
   Keyboard fallback: arrow keys / WASD map to the same roll and
   pitch, for testing without hardware.
   ============================================================ */

/* ------------------------------------------------------------
   BLUETOOTH — must match the UUIDs in esp32_ble_firmware.ino
------------------------------------------------------------ */
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHAR_UUID     = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

let liveRoll = 0, livePitch = 0;      // raw values from the controller
let targetRoll = 0, targetPitch = 0;  // smoothed, used to fly the plane
let bleConnected = false;
let bleDevice, bleChar;
let rollZero = 0, pitchZero = 0;

const dot = document.getElementById('dot');
const statusText = document.getElementById('statusText');
const connectBtn = document.getElementById('connectBtn');
const recenterBtn = document.getElementById('recenterBtn');

async function connectBLE() {
  if (!navigator.bluetooth) {
    alert("Web Bluetooth isn't available in this browser. Use Chrome or Edge on desktop or Android, and open this file directly rather than through another app's preview.");
    return;
  }
  try {
    statusText.textContent = "Requesting device…";
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }]
    });
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
    statusText.textContent = "Connecting…";
    const server = await bleDevice.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    bleChar = await service.getCharacteristic(CHAR_UUID);
    await bleChar.startNotifications();
    bleChar.addEventListener('characteristicvaluechanged', onTiltData);

    bleConnected = true;
    dot.classList.add('connected');
    statusText.textContent = "Connected: " + (bleDevice.name || "ESP32");
    connectBtn.textContent = "Disconnect";
    recenterBtn.disabled = false;
  } catch (err) {
    console.error(err);
    statusText.textContent = "Connection failed";
    setTimeout(() => { if (!bleConnected) statusText.textContent = "Not connected"; }, 2500);
  }
}

function onDisconnected() {
  bleConnected = false;
  dot.classList.remove('connected');
  statusText.textContent = "Disconnected";
  connectBtn.textContent = "Connect ESP32";
  recenterBtn.disabled = true;
}

function onTiltData(event) {
  const text = new TextDecoder().decode(event.target.value);
  const parts = text.split(',');
  if (parts.length === 2) {
    liveRoll = parseFloat(parts[0]);
    livePitch = parseFloat(parts[1]);
  }
}

connectBtn.addEventListener('click', () => {
  if (bleConnected && bleDevice) bleDevice.gatt.disconnect();
  else connectBLE();
});
recenterBtn.addEventListener('click', () => {
  rollZero = liveRoll; pitchZero = livePitch;
});

/* ------------------------------------------------------------
   KEYBOARD FALLBACK (works with or without the ESP32)
------------------------------------------------------------ */
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ' && crashed) restart();
});
window.addEventListener('keyup', e => keys[e.key] = false);

/* ------------------------------------------------------------
   THREE.JS SCENE
------------------------------------------------------------ */
const COLOR_RED = 0xe0362a;
const COLOR_RED_DARK = 0xa01f18;
const COLOR_GOLD = 0xf4c430;
const COLOR_GOLD_LIGHT = 0xffdb70;
const COLOR_BLUE = 0x2f6fb0;
const COLOR_BLUE_DARK = 0x1c4a7a;
const COLOR_NAVY = 0x12182b;
const COLOR_CREAM = 0xf4ead0;
const COLOR_INK = 0x0a0e1c;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1c1f3a, 60, 420);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Sky as a big gradient-painted sphere, atomic-poster midnight colors,
// plus a scatter of stars — like the night sky behind the rocket in
// the reference poster.
function makeSkyDome() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0a0e1c');
  grad.addColorStop(0.45, '#12182b');
  grad.addColorStop(0.75, '#1c2a4a');
  grad.addColorStop(1, '#2f6fb0');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);

  // scattered stars, gold and cream like the poster's star field
  ctx.fillStyle = '#f4c430';
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 180;
    const r = Math.random() < 0.15 ? 1.6 : 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.SphereGeometry(500, 24, 24);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
  scene.add(new THREE.Mesh(geo, mat));
}
makeSkyDome();

const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x141a2e, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe9b0, 0.85);
sun.position.set(-80, 120, -60);
scene.add(sun);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  new THREE.MeshStandardMaterial({ color: COLOR_BLUE_DARK })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

/* ------------------------------------------------------------
   Cartoon black outlines — the thick-ink-outline look from the
   reference art, added as a wireframe overlay on any mesh.
------------------------------------------------------------ */
function addBlackEdges(mesh) {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: COLOR_INK, linewidth: 2 }));
  mesh.add(line);
}

/* ---- Plane (simple stylised low-poly craft, atomic rocket palette) ---- */
const plane = new THREE.Group();
const bodyMat = new THREE.MeshStandardMaterial({ color: COLOR_RED, metalness: 0.2, roughness: 0.5 });
const wingMat = new THREE.MeshStandardMaterial({ color: COLOR_BLUE, metalness: 0.1, roughness: 0.6 });
const tailMat = new THREE.MeshStandardMaterial({ color: COLOR_GOLD, metalness: 0.1, roughness: 0.6 });

const fuselage = new THREE.Mesh(new THREE.ConeGeometry(1, 4.5, 8), bodyMat);
fuselage.rotation.x = Math.PI / 2;
addBlackEdges(fuselage);
plane.add(fuselage);

const wing = new THREE.Mesh(new THREE.BoxGeometry(7, 0.15, 1.4), wingMat);
wing.position.z = 0.2;
addBlackEdges(wing);
plane.add(wing);

const tailWing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.8), wingMat);
tailWing.position.set(0, 0.2, 1.9);
addBlackEdges(tailWing);
plane.add(tailWing);

const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 1), tailMat);
tailFin.position.set(0, 0.6, 1.9);
addBlackEdges(tailFin);
plane.add(tailFin);

// nose gem, echoing the jewelled ornament style of the reference art
const noseGem = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), new THREE.MeshStandardMaterial({ color: COLOR_CREAM }));
noseGem.position.set(0, 0, -2.1);
plane.add(noseGem);

plane.position.set(0, 40, 0);
scene.add(plane);

// Camera rig — chases behind the plane
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000);

/* ---- Buildings (procedural, recycled as the plane flies forward) ---- */
let LANE_WIDTH = 240; // shrinks as the level increases — see applyDifficultyForLevel
const SEGMENT_LEN = 60;
const SEGMENTS_AHEAD = 14;

// banded, painted-pillar textures instead of flat colors
function makeBandedTexture(baseColor, bandColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 32, 128);
  ctx.fillStyle = bandColor;
  const bandCount = 5;
  for (let i = 0; i < bandCount; i++) {
    const y = (i + 0.5) * (128 / bandCount) - 6;
    ctx.fillRect(0, y, 32, 12);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const buildingPalettes = [
  ['#e0362a', '#f4c430'],
  ['#2f6fb0', '#ffdb70'],
  ['#12182b', '#f4c430'],
  ['#a01f18', '#2f6fb0']
];
const buildingMats = buildingPalettes.map(([base, band]) => {
  const tex = makeBandedTexture(base, band);
  return new THREE.MeshStandardMaterial({ map: tex, metalness: 0.05, roughness: 0.85 });
});
const winMat = new THREE.MeshBasicMaterial({ color: COLOR_GOLD_LIGHT });

const buildings = []; // { mesh, box3, z }
const buildingGeo = new THREE.BoxGeometry(1, 1, 1);

function spawnBuildingAt(z) {
  const count = buildingCountForLevel(level) + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const w = 8 + Math.random() * 14;
    const d = 8 + Math.random() * 14;
    const h = 18 + Math.random() * 70;
    const x = (Math.random() - 0.5) * LANE_WIDTH;
    const mat = buildingMats[Math.floor(Math.random() * buildingMats.length)];
    const mesh = new THREE.Mesh(buildingGeo, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, h / 2, z + (Math.random() - 0.5) * SEGMENT_LEN * 0.6);
    addBlackEdges(mesh);

    if (Math.random() < 0.85) {
      const winPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), winMat);
      winPlane.position.set(0, 0.15, 0.51);
      mesh.add(winPlane);
    }

    scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    buildings.push({ mesh, box, z: mesh.position.z });
  }
}

let furthestZ = 0;
for (let i = 0; i < SEGMENTS_AHEAD; i++) {
  furthestZ -= SEGMENT_LEN;
  spawnBuildingAt(furthestZ);
}

function recycleBuildings(planeZ) {
  while (buildings.length && buildings[0].z > planeZ + SEGMENT_LEN * 2) {
    scene.remove(buildings[0].mesh);
    buildings.shift();
  }
  while (furthestZ > planeZ - SEGMENT_LEN * SEGMENTS_AHEAD) {
    furthestZ -= SEGMENT_LEN;
    spawnBuildingAt(furthestZ);
  }
}

/* ------------------------------------------------------------
   PROGRESSIVE DIFFICULTY
   Every LEVEL_UP_DISTANCE meters flown, the level goes up:
   buildings get denser, the flight lane gets narrower, and the
   top speed cap rises — same idea as an endless runner speeding
   up, applied to a flight sim instead of lane-switching.
------------------------------------------------------------ */
let level = 1;
let distanceAtLastLevelUp = 0;
const LEVEL_UP_DISTANCE = 400;
let maxSpeedForLevel = 60;

function buildingCountForLevel(lvl) {
  return Math.min(2 + Math.floor(lvl / 2), 6);
}

function applyDifficultyForLevel(lvl) {
  maxSpeedForLevel = Math.min(60 + lvl * 7, 150);
  LANE_WIDTH = Math.max(140, 240 - lvl * 8);
}

function showLevelUpBanner() {
  const banner = document.getElementById('levelUpBanner');
  banner.textContent = 'Level ' + level + '!';
  banner.classList.remove('hidden');
  banner.style.animation = 'none';
  void banner.offsetWidth;
  banner.style.animation = '';
  document.getElementById('levelVal').textContent = level;
}

/* ------------------------------------------------------------
   FLIGHT MODEL
   Roll banks the plane, and banking is what turns it (just like
   a real aircraft) — pitch changes the climb/dive rate. This is
   the core control scheme the game is built around.
------------------------------------------------------------ */
let speed = 24;          // forward units/sec, ramps up to maxSpeedForLevel
let bankAngle = 0;        // radians, visual + turn rate
let pitchAngleVisual = 0;
let distance = 0;
let crashed = false;
const planeBox = new THREE.Box3();
const planeSize = new THREE.Vector3(3.5, 1.6, 3.5);

function getControlInputs() {
  // Prefer live BLE tilt data; fall back to keyboard.
  let roll = 0, pitch = 0;
  if (bleConnected) {
    roll = liveRoll - rollZero;
    pitch = livePitch - pitchZero;
  } else {
    if (keys['ArrowLeft'] || keys['a']) roll = -22;
    if (keys['ArrowRight'] || keys['d']) roll = 22;
    if (keys['ArrowUp'] || keys['w']) pitch = -18;
    if (keys['ArrowDown'] || keys['s']) pitch = 18;
  }
  roll = Math.max(-45, Math.min(45, roll));
  pitch = Math.max(-35, Math.min(35, pitch));
  return { roll, pitch };
}

function updateHUDMeters(roll, pitch) {
  const rollPct = 50 + (roll / 45) * 50;
  const pitchPct = 50 + (pitch / 35) * 50;
  document.getElementById('rollBar').style.left = Math.min(rollPct, 50) + '%';
  document.getElementById('rollBar').style.width = Math.abs(rollPct - 50) + '%';
  document.getElementById('pitchBar').style.left = Math.min(pitchPct, 50) + '%';
  document.getElementById('pitchBar').style.width = Math.abs(pitchPct - 50) + '%';
}

function restart() {
  crashed = false;
  document.getElementById('crash').classList.add('hidden');
  plane.position.set(0, 40, 0);
  plane.rotation.set(0, 0, 0);
  speed = 24;
  distance = 0;
  level = 1;
  distanceAtLastLevelUp = 0;
  applyDifficultyForLevel(level);
  document.getElementById('levelVal').textContent = level;
  buildings.forEach(b => scene.remove(b.mesh));
  buildings.length = 0;
  furthestZ = 0;
  for (let i = 0; i < SEGMENTS_AHEAD; i++) { furthestZ -= SEGMENT_LEN; spawnBuildingAt(furthestZ); }
}

applyDifficultyForLevel(level);

const clock = new THREE.Clock();
document.getElementById('msg').classList.remove('hidden');

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (!crashed) {
    const { roll, pitch } = getControlInputs();
    targetRoll += (roll - targetRoll) * Math.min(1, dt * 4);
    targetPitch += (pitch - targetPitch) * Math.min(1, dt * 4);
    updateHUDMeters(targetRoll, targetPitch);

    const msgEl = document.getElementById('msg');
    if (!msgEl.classList.contains('hidden') && (Math.abs(targetRoll) > 3 || Math.abs(targetPitch) > 3 || keys['ArrowUp'] || keys['ArrowLeft'] || keys['ArrowRight'] || keys['ArrowDown'])) {
      msgEl.classList.add('hidden');
    }

    speed = Math.min(maxSpeedForLevel, speed + dt * 1.2);

    // Bank steers left/right; pitch changes climb rate
    bankAngle = THREE.MathUtils.degToRad(targetRoll);
    pitchAngleVisual = THREE.MathUtils.degToRad(-targetPitch);

    const turnRate = -bankAngle * 1.4; // banking yaws the plane, like a real turn
    plane.rotation.z = -bankAngle;
    plane.rotation.x = pitchAngleVisual;
    plane.rotation.y += turnRate * dt;

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, plane.rotation.y, 0));
    plane.position.addScaledVector(forward, speed * dt);
    plane.position.y += (targetPitch * -0.28) * dt * (speed / 24);
    plane.position.y = Math.max(6, Math.min(160, plane.position.y));
    plane.position.x = Math.max(-LANE_WIDTH * 0.65, Math.min(LANE_WIDTH * 0.65, plane.position.x));

    distance += speed * dt;
    recycleBuildings(plane.position.z);

    if (distance - distanceAtLastLevelUp >= LEVEL_UP_DISTANCE) {
      distanceAtLastLevelUp = distance;
      level += 1;
      applyDifficultyForLevel(level);
      showLevelUpBanner();
    }

    // Collision check
    planeBox.setFromCenterAndSize(plane.position, planeSize);
    for (const b of buildings) {
      if (Math.abs(b.z - plane.position.z) > 40) continue;
      if (planeBox.intersectsBox(b.box)) {
        crashed = true;
        document.getElementById('crash').classList.remove('hidden');
        document.getElementById('crashScore').textContent = `Distance: ${Math.floor(distance)}m — Level ${level}`;
        break;
      }
    }

    // Camera chase
    const camOffset = new THREE.Vector3(0, 6, 14).applyEuler(new THREE.Euler(0, plane.rotation.y, 0));
    camera.position.lerp(new THREE.Vector3().copy(plane.position).add(camOffset), 1 - Math.pow(0.001, dt));
    const lookTarget = new THREE.Vector3().copy(plane.position).add(
      new THREE.Vector3(0, 2, -10).applyEuler(new THREE.Euler(0, plane.rotation.y, 0))
    );
    camera.lookAt(lookTarget);

    document.getElementById('scoreVal').textContent = Math.floor(distance);
    document.getElementById('speedVal').textContent = Math.floor(speed);
    document.getElementById('altVal').textContent = Math.floor(plane.position.y);
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
