
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ==========================================
// VOXELCRAFT ENGINE
// ==========================================

const scene = new THREE.Scene();

const DAY_COLOR = new THREE.Color(0x9bc9e8);
const SUNSET_COLOR = new THREE.Color(0xff784f);
const NIGHT_COLOR = new THREE.Color(0x000000);

scene.background = DAY_COLOR.clone();
scene.fog = new THREE.Fog(DAY_COLOR.clone(), 25, 85);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// ==========================================
// SUN AND CLOUDS
// ==========================================

const sunMaterial = new THREE.MeshBasicMaterial({
  color: 0xffee88,
  fog: false,
  transparent: true
});

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(4, 16, 16),
  sunMaterial
);

scene.add(sun);

// Clouds
const clouds = [];

const cloudMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  fog: false,
  transparent: true,
  depthWrite: false
});

function createCloud(x, y, z) {
  const cloud = new THREE.Group();

  const puffPositions = [
    [0, 0, 0, 2.5],
    [2, 0.5, 0, 2],
    [-2, 0.3, 0, 2],
    [0.8, 1, 0, 2],
    [-1, 1, 0, 1.8]
  ];

  puffPositions.forEach(([px, py, pz, size]) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 8),
      cloudMaterial
    );

    puff.position.set(px, py, pz);
    cloud.add(puff);
  });

  cloud.position.set(x, y, z);
  scene.add(cloud);

  clouds.push(cloud);
}

// Generate clouds around the world.
createCloud(-20, 20, -35);
createCloud(15, 23, -45);
createCloud(30, 19, -15);
createCloud(-35, 22, 10);
createCloud(5, 25, 20);
createCloud(-10, 18, 45);

// Move clouds slowly.
function updateClouds(dt) {
  clouds.forEach(cloud => {
    cloud.position.x += dt * 0.7;

    if (cloud.position.x > 55) {
      cloud.position.x = -55;
    }
  });
}

// ==========================================
// DAY AND NIGHT CYCLE
// ==========================================

// Full day + night cycle duration in seconds.
const DAY_CYCLE_DURATION = 600;

// Start at midday.
let dayTime = 0.25;

const skyColor = new THREE.Color();

function updateDayNight(dt) {

  // Progress the clock.
  dayTime = (dayTime + dt / DAY_CYCLE_DURATION) % 1;

  // Calculate sun movement.
  const angle = dayTime * Math.PI * 2;

  const sunHeight = Math.sin(angle);
  const daylight = Math.max(0, sunHeight);

  // Sunset and sunrise color intensity.
  const twilight = Math.max(
    0,
    1 - Math.abs(sunHeight) * 5
  );

  // Move the sun across the sky.
  sun.position.set(
    Math.cos(angle) * 60,
    sunHeight * 60,
    -60
  );

  // Sun disappears below the horizon.
  sun.visible = sunHeight > 0;

  sunMaterial.opacity = Math.min(
    1,
    daylight * 3 + twilight * 0.4
  );

  // Gradually change the sky color.
  skyColor.copy(NIGHT_COLOR);
  skyColor.lerp(SUNSET_COLOR, twilight);
  skyColor.lerp(DAY_COLOR, daylight);

  scene.background.copy(skyColor);
  scene.fog.color.copy(skyColor);

  // Daylight illumination.
  ambientLight.intensity =
    1.5 * daylight + 0.08 * twilight;

  directionalLight.intensity =
    2 * daylight + 0.1 * twilight;

  // Follow the sun with directional lighting.
  directionalLight.position.set(
    sun.position.x,
    sun.position.y,
    sun.position.z
  );

  // Clouds fade away as night approaches.
  cloudMaterial.opacity = daylight;

}

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 2.22, 6);

scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.2));
renderer.shadowMap.enabled = false;
document.querySelector('#game').appendChild(renderer.domElement);

// ==========================================
// FIRST-PERSON RIGHT HAND
// ==========================================

const hand = new THREE.Group();
camera.add(hand);

const skinMaterial = new THREE.MeshLambertMaterial({
  color: 0xc58b63
});

// Horizontal forearm extending from the bottom-right.
const arm = new THREE.Mesh(
  new THREE.BoxGeometry(0.22, 0.20, 0.48),
  skinMaterial
);

arm.position.set(0.88, -0.38, -0.62);
arm.rotation.set(-0.08, 0, 0);
hand.add(arm);

hand.position.set(0, 0, 0);

// ==========================================
// HAND ANIMATION SYSTEM
// ==========================================

const handBasePosition = new THREE.Vector3(0, 0, 0);

let handMoveAmount = 0;
let handBobTime = 0;
let handActionType = null;
let handActionTime = 0;

function triggerHandAction(type) {
  handActionType = type;
  handActionTime = 0;
}

function updateHandAnimation(dt) {
  const moving =
    keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD;

  handMoveAmount = THREE.MathUtils.lerp(
    handMoveAmount,
    moving ? 1 : 0,
    Math.min(dt * 12, 1)
  );

  handBobTime += dt * 8;

  const walkY =
    Math.abs(Math.sin(handBobTime)) * 0.06 * handMoveAmount;

  const walkX = 0;

  let actionY = 0;
  let actionZ = 0;
  let actionRotation = 0;

  // Mining animation
  if (miningHeld && locked) {
    const swing = Math.sin(performance.now() * 0.018);

    actionY = -Math.max(0, swing) * 0.16;
    actionZ = -Math.max(0, swing) * 0.20;
    actionRotation = Math.max(0, swing) * 0.85;
  }

  // Block placement animation
  if (handActionType === 'place') {
    handActionTime += dt;

    const progress = Math.min(handActionTime / 0.22, 1);
    const swing = Math.sin(progress * Math.PI);

    actionY -= swing * 0.16;
    actionZ -= swing * 0.20;
    actionRotation -= swing * 0.75;

    if (progress >= 1) {
      handActionType = null;
    }
  }

  hand.position.set(
    handBasePosition.x + walkX,
    handBasePosition.y + walkY + actionY,
    handBasePosition.z + actionZ
  );

  arm.rotation.x = -0.08 + actionRotation * 0.8 - walkY * 2;
  arm.rotation.y = walkX * 0.5;
  arm.rotation.z = -0.12 - walkX * 2;

  hand.rotation.x = actionRotation;
  hand.rotation.y = walkX * 1.2;
  hand.rotation.z = -walkX * 0.8;
}


// BLOCK TEXTURE GENERATOR
// Replace your existing texture/material generation section with this.

// ---------- texture helpers ----------
function finishTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// amount > 0 lightens, < 0 darkens
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const mix = c => Math.round(c + (target - c) * p);
  return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

// Planks take their color from the wood palette, so they always match the logs.
const WOOD_PALETTE = ['#79502c', '#583719', '#a87843'];

function drawPlanks(ctx) {
  const base = shade(WOOD_PALETTE[0], 0.38);
  const light = shade(WOOD_PALETTE[2], 0.3);
  const dark = shade(WOOD_PALETTE[1], 0.35);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 64, 64);

  for (let board = 0; board < 4; board++) {
    const y = board * 16;

    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = i % 2 ? light : dark;
      ctx.fillRect(Math.floor(Math.random() * 62), y + 2 + Math.floor(Math.random() * 12), 6, 2);
    }

    ctx.fillStyle = dark;                       // gap under each board
    ctx.fillRect(0, y + 14, 64, 2);
    ctx.fillRect(board % 2 ? 20 : 44, y, 2, 14); // staggered seam
  }
}

const textureCache = {};

function createBlockTexture(type, face = 'side') {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const palettes = {
    dirt: ['#79502f', '#684126', '#98643a'],
    stone: ['#777777', '#626262', '#929292'],
    cobblestone: ['#666666', '#4e4e4e', '#858585'],
    coal: ['#555555', '#292929', '#777777'],
    iron: ['#888888', '#b1a99b', '#686868'],
    diamond: ['#36c9c9', '#159b9b', '#83eeee'],
    wood: ['#79502c', '#583719', '#a87843'],
    leaves: ['#28752c', '#1d5d22', '#3d963d'],
    sand: ['#d8c17c', '#c5ad68', '#edda9c'],
    flint: ['#454545', '#292929', '#666666'],
    planks: ['#bd8b50', '#a8753e', '#d3a66b'],
  };

  if (type === 'planks') {
    drawPlanks(ctx);
    return finishTexture(canvas);
  }

  if (type === 'crafting_table') {
    if (face === 'bottom') {
      drawPlanks(ctx);
    } else if (face === 'top') {
      ctx.fillStyle = '#a15f36';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#4b2d17';                 // frame
      ctx.fillRect(0, 0, 64, 5);
      ctx.fillRect(0, 59, 64, 5);
      ctx.fillRect(0, 0, 5, 64);
      ctx.fillRect(59, 0, 5, 64);
      ctx.fillStyle = '#6d4121';                 // 3x3 grid lines
      for (const p of [22, 40]) {
        ctx.fillRect(p, 5, 3, 54);
        ctx.fillRect(5, p, 54, 3);
      }
      ctx.fillStyle = '#b97a4a';
      for (let i = 0; i < 30; i++) {
        ctx.fillRect(6 + Math.floor(Math.random() * 50), 6 + Math.floor(Math.random() * 50), 3, 2);
      }
    } else {
      drawPlanks(ctx);
      ctx.fillStyle = '#4a3320';                 // dark log frame
      ctx.fillRect(0, 0, 64, 7);
      ctx.fillRect(0, 0, 7, 64);
      ctx.fillRect(57, 0, 7, 64);
      ctx.fillStyle = '#2f2012';
      ctx.fillRect(3, 0, 2, 64);
      ctx.fillRect(59, 0, 2, 64);
      // saw
      ctx.fillStyle = '#c9ced1'; ctx.fillRect(14, 22, 14, 6);
      ctx.fillStyle = '#7a5530'; ctx.fillRect(14, 28, 4, 8);
      // hammer
      ctx.fillStyle = '#7a5530'; ctx.fillRect(42, 24, 3, 20);
      ctx.fillStyle = '#8a8f93'; ctx.fillRect(38, 20, 12, 6);
    }
    return finishTexture(canvas);
  }
  // TNT: red background, white label, black TNT text.
  if (type === 'tnt') {
    ctx.fillStyle = '#d92323';
    ctx.fillRect(0, 0, 64, 64);

    // Red pixel details.
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = i % 2 ? '#bd1717' : '#ed3838';
      ctx.fillRect(
        Math.floor(Math.random() * 64),
        Math.floor(Math.random() * 64),
        2, 2
      );
    }

    // White label across the middle.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 21, 64, 22);

    // Black TNT text.
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
  }

  // Grass has different top, bottom and side textures.
  if (type === 'grass' && face === 'top') {
    ctx.fillStyle = '#4c9b35';
    ctx.fillRect(0, 0, 64, 64);

    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = i % 2 ? '#367d29' : '#65b849';
      ctx.fillRect(
        Math.random() * 64,
        Math.random() * 64,
        3, 3
      );
    }
  } else if (type === 'grass' && face === 'bottom') {
    ctx.fillStyle = '#79502f';
    ctx.fillRect(0, 0, 64, 64);
  } else if (type === 'grass') {
    ctx.fillStyle = '#79502f';
    ctx.fillRect(0, 0, 64, 64);

    // Green grass strip at the top.
    ctx.fillStyle = '#4c9b35';
    ctx.fillRect(0, 0, 64, 17);

    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = i % 2 ? '#367d29' : '#65b849';
      ctx.fillRect(Math.random() * 64, Math.random() * 17, 3, 3);
    }
  } else if (type === 'wood' && face === 'top') {
    // Tree trunk rings.
    ctx.fillStyle = '#a87843';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#583719';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(32, 32, 12, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const colors = palettes[type] || palettes.stone;

    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, 64, 64);

    // Pixel variation for a block-like appearance.
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() > 0.7 ? 6 : 3;
      ctx.fillRect(
        Math.floor(Math.random() * 64),
        Math.floor(Math.random() * 64),
        size, size
      );
    }

    // Wood bark lines.
    if (type === 'wood') {
      ctx.fillStyle = '#583719';
      for (let x = 8; x < 64; x += 16) {
        ctx.fillRect(x, 0, 3, 64);
      }
    }

    // Leaf details.
    if (type === 'leaves') {
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = i % 2 ? '#164b1b' : '#58a83c';
        ctx.fillRect(Math.random() * 64, Math.random() * 64, 4, 4);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}


// Creates all six face materials for each block.
function createBlockMaterials(type) {
  if (textureCache[type]) return textureCache[type];

  // Most blocks use one texture on every face.
  // This avoids six separate material groups per block.
  if (!['grass', 'wood', 'crafting_table'].includes(type)) {
    const texture = createBlockTexture(type, 'side');

    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshLambertMaterial({
      map: texture
    });

    textureCache[type] = material;
    return material;
  }

  // Grass and wood retain their different face textures.
  const faces = [
    'side',
    'side',
    'top',
    'bottom',
    'side',
    'side'
  ];

  const result = faces.map(face => {
    const cacheKey = `${type}_${face}`;

    if (!textureCache[cacheKey]) {
      const texture = createBlockTexture(type, face);

      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.colorSpace = THREE.SRGBColorSpace;

      textureCache[cacheKey] = texture;
    }

    return new THREE.MeshLambertMaterial({
      map: textureCache[cacheKey]
    });
  });

  textureCache[type] = result;
  return result;
}


// All block types used in the game.
const materials = {
  grass: createBlockMaterials('grass'),
  dirt: createBlockMaterials('dirt'),
  stone: createBlockMaterials('stone'),
  cobblestone: createBlockMaterials('cobblestone'),
  coal: createBlockMaterials('coal'),
  iron: createBlockMaterials('iron'),
  diamond: createBlockMaterials('diamond'),
  wood: createBlockMaterials('wood'),
  leaves: createBlockMaterials('leaves'),
  sand: createBlockMaterials('sand'),
  flint: createBlockMaterials('flint'),
  tnt: createBlockMaterials('tnt'),
  planks: createBlockMaterials('planks'),
  crafting_table: createBlockMaterials('crafting_table'),
};

// Pickaxe head color + mining speed multiplier
const PICKAXES = {
  woodenPickaxe: {
    head: '#a8753e',
    speed: 0.65,
    durability: 25
  },

  stonePickaxe: {
    head: '#8a8a8a',
    speed: 1,
    durability: 60
  },

  ironPickaxe: {
    head: '#d8d8d8',
    speed: 1.6,
    durability: 150
  },

  diamondPickaxe: {
    head: '#36c9c9',
    speed: 2.5,
    durability: 350
  }
};

// ==========================================
// PICKAXE DURABILITY UI
// ==========================================

const durabilityUI = document.createElement('div');

durabilityUI.id = 'pickaxe-durability';

durabilityUI.style.cssText = `
  position: fixed;
  bottom: 115px;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  height: 9px;
  background: rgba(0,0,0,0.75);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 5px;
  overflow: hidden;
  display: none;
  z-index: 100;
  pointer-events: none;
`;

const durabilityFill = document.createElement('div');

durabilityFill.style.cssText = `
  width: 100%;
  height: 100%;
  background: #35e45b;
  transition: width 0.1s linear;
`;

durabilityUI.appendChild(durabilityFill);
document.body.appendChild(durabilityUI);

function updatePickaxeDurabilityUI(item) {
  if (!item || !PICKAXES[item.type]) {
    durabilityUI.style.display = 'none';
    return;
  }

  const max = PICKAXES[item.type].durability;

  if (item.durability === undefined) {
    item.durability = max;
  }

  const percentage = Math.max(0, item.durability / max * 100);

  durabilityFill.style.width = percentage + '%';
  durabilityFill.style.background = '#35e45b';

  durabilityUI.style.display = 'block';
}

function hidePickaxeDurabilityUI() {
  durabilityUI.style.display = 'none';
}

function damagePickaxe(item) {
  if (!item || !PICKAXES[item.type]) return;

  const max = PICKAXES[item.type].durability;

  if (item.durability === undefined) {
    item.durability = max;
  }

  item.durability--;

  updatePickaxeDurabilityUI(item);

  if (item.durability <= 0) {
    const type = item.type;

    hotbarSlots[selected] = null;

    hidePickaxeDurabilityUI();
    updateInventoryCounts();
    renderHotbar();
    renderInventory();

    toast(`${type.replace('Pickaxe', ' pickaxe')} broke!`);
  }
}

// ==========================================
// FIRST-PERSON HELD ITEM
// ==========================================

const heldItem = new THREE.Group();
hand.add(heldItem);

// Light follows the player while a torch is held.
const heldTorchLight = new THREE.PointLight(
  0xffb84a,
  3.5,
  10,
  2
);

heldTorchLight.position.set(0.7, -0.35, -1.0);
heldTorchLight.visible = false;
camera.add(heldTorchLight);

// Position held item at the front of the right hand.
heldItem.position.set(0.90, -0.38, -0.98);
heldItem.rotation.set(0.15, 0.35, -0.15);

// Held block geometry.
const heldBlockGeometry = new THREE.BoxGeometry(0.24, 0.24, 0.24);

// Pickaxe geometry
const pickaxeHandleGeometry = new THREE.BoxGeometry(0.065, 0.42, 0.065);
const pickaxeHeadGeometry = new THREE.BoxGeometry(0.38, 0.09, 0.11);
const pickaxeEdgeGeometry = new THREE.BoxGeometry(0.13, 0.09, 0.11);

function createHeldItem(type) {
  const group = new THREE.Group();

  // Block items.
  if (materials[type]) {
    const material = Array.isArray(materials[type])
      ? materials[type][0]
      : materials[type];

    const block = new THREE.Mesh(
      heldBlockGeometry,
      material
    );

    group.add(block);
    return group;
  }

  // Torch.
  if (type === 'torch') {
    const stick = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.32, 0.07),
      new THREE.MeshLambertMaterial({ color: 0xa8753e })
    );
    const flame = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.09),
      new THREE.MeshBasicMaterial({ color: 0xffc94a })
    );
    flame.position.y = 0.2;
    group.add(stick, flame);
    return group;
  }

  // Minecraft-style pickaxe (all tiers).
  if (PICKAXES[type]) {
    const handleMaterial = new THREE.MeshLambertMaterial({
      color: 0x79502f
    });

    const headMaterial = new THREE.MeshLambertMaterial({
      color: PICKAXES[type].head,
      flatShading: true
    });

    // Full-length wooden handle.
    const handle = new THREE.Mesh(
      pickaxeHandleGeometry,
      handleMaterial
    );

    handle.position.y = -0.08;
    group.add(handle);

    // Full horizontal metal head.
    const head = new THREE.Mesh(
      pickaxeHeadGeometry,
      headMaterial
    );

    head.position.y = 0.14;
    group.add(head);

    // Left pointed end.
    const leftEdge = new THREE.Mesh(
      pickaxeEdgeGeometry,
      headMaterial
    );

    leftEdge.position.set(-0.23, 0.11, 0);
    leftEdge.rotation.z = -0.65;
    group.add(leftEdge);

    // Right pointed end.
    const rightEdge = new THREE.Mesh(
      pickaxeEdgeGeometry,
      headMaterial
    );

    rightEdge.position.set(0.23, 0.11, 0);
    rightEdge.rotation.z = 0.65;
    group.add(rightEdge);

    // Central connection between handle and head.
    const connector = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      handleMaterial
    );

    connector.position.y = 0.10;
    group.add(connector);

    return group;
  }

  // Sticks.
  if (type === 'sticks') {
    const stick = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.32, 0.07),
      new THREE.MeshLambertMaterial({ color: 0xc49a62 })
    );

    group.add(stick);
    return group;
  }

  // Flint and steel.
  if (type === 'flintSteel') {
    const tool = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.20, 0.07),
      new THREE.MeshLambertMaterial({ color: 0x777777 })
    );

    group.add(tool);
    return group;
  }

  return null;
}

let currentHeldType = null;
let currentHeldObject = null;

function updateHeldBlock() {
  const type = hotbarSlots[selected]?.type || null;

  // Remove the previous item.
  if (currentHeldObject) {
    heldItem.remove(currentHeldObject);
    currentHeldObject = null;
  }

  currentHeldType = type;
  heldTorchLight.visible = type === 'torch';

  // Nothing in the selected hotbar slot = empty hand.
  if (!type) return;

  currentHeldObject = createHeldItem(type);
  if (!currentHeldObject) return;

  heldItem.add(currentHeldObject);
}

// ==========================================
// WORLD AND BLOCKS
// ==========================================

const world = new THREE.Group();
scene.add(world);

const blocks = new Map();
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

// CHUNK SYSTEM
const CHUNK_SIZE = 8;

const chunkBlocks = new Map();
const chunkMeshes = new Map();
const dirtyChunks = new Set();

function getChunkKey(x, z) {
  const chunkX = Math.floor(x / CHUNK_SIZE);
  const chunkZ = Math.floor(z / CHUNK_SIZE);

  return `${chunkX},${chunkZ}`;
}

let chunkBatchDepth = 0;

function markChunkDirty(x, z) {
  dirtyChunks.add(getChunkKey(x, z));

  if (chunkBatchDepth === 0) {
    flushChunkUpdates();
  }
}

function beginChunkBatch() {
  chunkBatchDepth++;
}

function endChunkBatch() {
  chunkBatchDepth = Math.max(0, chunkBatchDepth - 1);

  if (chunkBatchDepth === 0) {
    flushChunkUpdates();
  }
}

// Each face has its own outward direction and four corners.
const VOXEL_FACES = [
  { neighbor: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { neighbor: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { neighbor: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { neighbor: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { neighbor: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { neighbor: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
];

const FACE_UVS = [[0, 0], [0, 1], [1, 1], [1, 0]];

function disposeChunkMeshes(chunkKey) {
  const oldMeshes = chunkMeshes.get(chunkKey);

  if (!oldMeshes) return;

  for (const mesh of oldMeshes) {
    world.remove(mesh);
    mesh.geometry.dispose();
  }

  chunkMeshes.delete(chunkKey);
}

function rebuildChunk(chunkKey) {
  disposeChunkMeshes(chunkKey);

  const localBlocks = chunkBlocks.get(chunkKey);

  if (!localBlocks || localBlocks.size === 0) return;

  const buckets = new Map();

  for (const block of localBlocks) {
    const d = block.userData;
    const blockMaterials = materials[d.type] || materials.stone;

    for (let faceIndex = 0; faceIndex < VOXEL_FACES.length; faceIndex++) {
      const face = VOXEL_FACES[faceIndex];

      const neighbor = blocks.get(key(
        d.x + face.neighbor[0],
        d.y + face.neighbor[1],
        d.z + face.neighbor[2]
      ));

      if (neighbor && (neighbor.userData.size || 1) >= 0.99) {
        continue;
      }

      const material = Array.isArray(blockMaterials)
        ? blockMaterials[faceIndex]
        : blockMaterials;

      let bucket = buckets.get(material);

      if (!bucket) {
        bucket = {
          positions: [],
          uvs: [],
          normals: [],
          faceBlocks: []
        };

        buckets.set(material, bucket);
      }

      const base = face.corners.map(([vx, vy, vz]) => [
        d.x + vx - 0.5,
        d.y + vy - 0.5,
        d.z + vz - 0.5
      ]);

      const triangles = [0, 1, 2, 0, 2, 3];
      const normal = face.neighbor;

      for (let tri = 0; tri < 2; tri++) {
        for (let vertex = 0; vertex < 3; vertex++) {
          const cornerIndex = triangles[tri * 3 + vertex];
          const v = base[cornerIndex];

          bucket.positions.push(v[0], v[1], v[2]);
          bucket.normals.push(normal[0], normal[1], normal[2]);

          const uv = FACE_UVS[cornerIndex];
          bucket.uvs.push(uv[0], uv[1]);
        }

        bucket.faceBlocks.push(block);
      }
    }
  }

  const meshes = [];

  for (const [material, data] of buckets) {
    if (!data.positions.length) continue;

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(data.positions, 3)
    );

    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(data.normals, 3)
    );

    geometry.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(data.uvs, 2)
    );

    const mesh = new THREE.Mesh(geometry, material);

    mesh.userData.isChunkMesh = true;
    mesh.userData.faceBlocks = data.faceBlocks;
    mesh.frustumCulled = true;

    world.add(mesh);
    meshes.push(mesh);
  }

  if (meshes.length) {
    chunkMeshes.set(chunkKey, meshes);
  }
}

function flushChunkUpdates() {
  if (chunkBatchDepth > 0 || dirtyChunks.size === 0) return;

  const pending = [...dirtyChunks];
  dirtyChunks.clear();

  for (const chunkKey of pending) {
    rebuildChunk(chunkKey);
  }
}

const blockTypes = [
  'grass',
  'dirt',
  'cobblestone',
  'wood',
  'tnt'
];

const hotbarSlots = Array(9).fill(null);
const inventorySlots = Array(36).fill(null);
const craftGrid = Array(4).fill(null); // 2x2, row-major: [0 1 / 2 3]
const tableGrid = Array(9).fill(null); // 3x3, row-major
const MAX_STACK = 64;

const blockColors = {
  grass: '#558b35',
  dirt: '#80502f',
  cobblestone: '#70777a',
  wood: '#85552d',
  tnt: '#d94232',
  planks: '#bd8b50',
  sticks: '#c49a62',
  woodenPickaxe: '#a8753e'
};

// ==========================================
// ITEM ICONS (use the real block textures)
// ==========================================

const iconCache = {};

function drawToolIcon(type) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  const px = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };

  if (type === 'sticks') {
    const cells = [[3, 12], [4, 11], [5, 10], [6, 9], [7, 8], [8, 7], [9, 6], [10, 5], [11, 4], [12, 3]];
    const s = 4;
    const cell = (x, y, c) => px(x * s, y * s, s, s, c);

    cells.forEach(([x, y]) => {                   // outline first
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => cell(x + dx, y + dy, '#4a3018'));
    });
    cells.forEach(([x, y], i) => cell(x, y, i % 2 ? '#a87a45' : '#c9a066'));
  } else if (PICKAXES[type]) {
    const c = PICKAXES[type].head;
    for (let i = 0; i < 5; i++) {
      px(14 + i * 8, 52 - i * 8, 8, 8, '#85552d');   // handle
    }
    px(14, 8, 36, 8, c);                              // head
    px(8, 14, 10, 10, shade(c, -0.25));
    px(46, 14, 10, 10, shade(c, -0.25));
    px(24, 8, 16, 8, shade(c, 0.25));
  } else if (type === 'torch') {
    px(28, 26, 8, 30, '#8a5a2b');                     // stick
    px(28, 26, 3, 30, '#a8753e');
    px(26, 12, 12, 16, '#2b2b2b');                    // coal head
    px(26, 8, 12, 6, '#ffb02e');                      // flame
    px(29, 4, 6, 6, '#ffe27a');
  } else if (type === 'flintSteel') {
    px(14, 30, 36, 22, '#8a8a8a');
    px(18, 34, 28, 14, '#6a6a6a');
    px(34, 12, 16, 20, '#333');
    px(38, 16, 8, 12, '#555');
  } else {
    px(0, 0, 64, 64, '#777');
  }

  return c.toDataURL();
}

function getItemIcon(type) {
  if (iconCache[type]) return iconCache[type];

  let url;
  const mat = materials[type];

  if (mat) {
    // Grass and wood use an array of materials; index 0 is the side face.
    const first = Array.isArray(mat) ? mat[0] : mat;
    const canvas = first.map?.image;
    url = canvas ? canvas.toDataURL() : drawToolIcon(type);
  } else {
    url = drawToolIcon(type);
  }

  iconCache[type] = url;
  return url;
}

const iconStyle = type => `
  background-image:url(${getItemIcon(type)});
  background-size:100% 100%;
  background-position:center;
  image-rendering:pixelated;
`;

const key = (x, y, z) => `${x},${y},${z}`;

function addBlock(x, y, z, type = 'stone', size = 1) {
  const id = key(x, y, z);

  if (blocks.has(id)) return null;

  let geometry = cubeGeometry;
  let blockMaterial = materials[type] || materials.stone;

  if (type === 'wood' && size < 1) {
    geometry = new THREE.CylinderGeometry(
      size / 2,
      size / 2,
      1,
      12
    );

    blockMaterial = [
      materials.wood[0], // Bark
      materials.wood[2], // Top rings
      materials.wood[3]  // Bottom rings
    ];
  } else if (size !== 1) {
    geometry = new THREE.BoxGeometry(size, 1, size);
  }

  const mesh = new THREE.Mesh(
    geometry,
    blockMaterial
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  mesh.userData = {
    x, y, z, type, size
  };

  blocks.set(id, mesh);

  if (size !== 1) {
    world.add(mesh);
  } else {
    const chunkKey = getChunkKey(x, z);

    if (!chunkBlocks.has(chunkKey)) {
      chunkBlocks.set(chunkKey, new Set());
    }

    chunkBlocks.get(chunkKey).add(mesh);
    markChunkDirty(x, z);

    // Update neighboring chunks when a block touches a chunk border.
    if (Math.floor(x / CHUNK_SIZE) !== Math.floor((x + 1) / CHUNK_SIZE)) {
      dirtyChunks.add(getChunkKey(x + 1, z));
    }

    if (Math.floor(x / CHUNK_SIZE) !== Math.floor((x - 1) / CHUNK_SIZE)) {
      dirtyChunks.add(getChunkKey(x - 1, z));
    }

    if (Math.floor(z / CHUNK_SIZE) !== Math.floor((z + 1) / CHUNK_SIZE)) {
      dirtyChunks.add(getChunkKey(x, z + 1));
    }

    if (Math.floor(z / CHUNK_SIZE) !== Math.floor((z - 1) / CHUNK_SIZE)) {
      dirtyChunks.add(getChunkKey(x, z - 1));
    }

    if (chunkBatchDepth === 0) {
      flushChunkUpdates();
    }
  }

  return mesh;
}

function removeBlock(mesh) {
  const p = mesh.userData;

  blocks.delete(key(p.x, p.y, p.z));

  if (p.size !== 1) {
    world.remove(mesh);
  } else {
    const chunkKey = getChunkKey(p.x, p.z);
    const localBlocks = chunkBlocks.get(chunkKey);

    if (localBlocks) {
      localBlocks.delete(mesh);

      if (localBlocks.size === 0) {
        chunkBlocks.delete(chunkKey);
      }
    }

    markChunkDirty(p.x, p.z);

    // Update neighboring chunks at chunk borders.
    if (Math.floor(p.x / CHUNK_SIZE) !== Math.floor((p.x + 1) / CHUNK_SIZE)) {
      dirtyChunks.add(getChunkKey(p.x + 1, p.z));
    }

    if (Math.floor(p.x / CHUNK_SIZE) !== Math.floor((p.x - 1) / CHUNK_SIZE)) {
      dirtyChunks.add(getChunkKey(p.x - 1, p.z));
    }

    if (Math.floor(p.z / CHUNK_SIZE) !== Math.floor((p.z + 1) / CHUNK_SIZE)) {
      dirtyChunks.add(getChunkKey(p.x, p.z + 1));
    }

    if (Math.floor(p.z / CHUNK_SIZE) !== Math.floor((p.z - 1) / CHUNK_SIZE)) {
      dirtyChunks.add(getChunkKey(p.x, p.z - 1));
    }

    if (chunkBatchDepth === 0) {
      flushChunkUpdates();
    }
  }
}

// Checks only nearby block coordinates instead of scanning the entire world.
function forEachNearbyBlock(x, y, z, radiusX, radiusY, radiusZ, callback) {
  const minX = Math.floor(x - radiusX);
  const maxX = Math.ceil(x + radiusX);
  const minY = Math.floor(y - radiusY);
  const maxY = Math.ceil(y + radiusY);
  const minZ = Math.floor(z - radiusZ);
  const maxZ = Math.ceil(z + radiusZ);

  for (let bx = minX; bx <= maxX; bx++) {
    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        const block = blocks.get(key(bx, by, bz));

        if (block) callback(block);
      }
    }
  }
}

// ==========================================
// PROGRESSIVE TERRAIN GENERATION
// ==========================================

const WORLD_SIZE = 12;
const MIN_WORLD_DEPTH = -14;

// The deepest layer currently generated.
let generatedDepth = 0;

function generateTerrainLayer(y) {
  beginChunkBatch();

  for (let x = -WORLD_SIZE; x <= WORLD_SIZE; x++) {
    for (let z = -WORLD_SIZE; z <= WORLD_SIZE; z++) {

      let type = 'stone';

      if (y === -1 || y === -2) {
        type = 'dirt';
      }

      else if (y === -3) {
        type = 'cobblestone';
      }

      else if (y <= -4) {

        const chance = Math.random();

        if (y <= -14 && chance < 0.025) {
          type = 'diamond';
        }

        else if (y <= -10 && chance < 0.06) {
          type = 'iron';
        }

        else if (y <= -7 && chance < 0.10) {
          type = 'coal';
        }

        else if (y <= -5 && chance < 0.015) {
          type = 'flint';
        }
      }

      addBlock(x, y, z, type);
    }
  }

  endChunkBatch();
}

// Generate underground layers only when they become necessary.
function revealLayersThrough(targetY) {

  targetY = Math.max(targetY, MIN_WORLD_DEPTH);

  while (generatedDepth > targetY) {

    generatedDepth--;

    generateTerrainLayer(generatedDepth);

  }

}

// ==========================================
// INITIAL WORLD GENERATION
// ==========================================

function generateWorld() {
  beginChunkBatch();

  // Generate ONLY the grass surface.
  for (let x = -WORLD_SIZE; x <= WORLD_SIZE; x++) {
    for (let z = -WORLD_SIZE; z <= WORLD_SIZE; z++) {

      addBlock(x, 0, z, 'grass');

    }
  }

  // Forest generation.
  for (let i = 0; i < 10; i++) {

    const x = Math.floor(Math.random() * 23) - 11;
    const z = Math.floor(Math.random() * 23) - 11;

    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;

    const height = 3 + Math.floor(Math.random() * 2);
    const treeId = `tree_${i}_${x}_${z}`;

    // Trunk.
    for (let y = 1; y <= height; y++) {

      const block = addBlock(x, y, z, 'wood', 0.36);

      if (block) block.userData.treeId = treeId;

    }

    // Leaves.
    for (let lx = -1; lx <= 1; lx++) {
      for (let lz = -1; lz <= 1; lz++) {
        for (let ly = height - 1; ly <= height + 1; ly++) {

          if (Math.abs(lx) + Math.abs(lz) > 2) continue;

          const leaf = addBlock(
            x + lx,
            ly,
            z + lz,
            'leaves'
          );

          if (leaf) leaf.userData.treeId = treeId;

        }
      }
    }

  }

  endChunkBatch();
}

generateWorld();

function dropSelectedItem() {
  const slot = hotbarSlots[selected];
  if (!slot) return;

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  const pos = camera.position.clone();
  pos.addScaledVector(dir, 0.6);
  pos.y -= 0.3;

  const drop = spawnDrop(pos, slot.type);
  drop.userData.velocityX = dir.x * 5;
  drop.userData.velocityZ = dir.z * 5;
  drop.userData.velocityY = 2.5;
  drop.userData.pickupDelay = 1.2; // seconds before it can be picked up

  slot.count--;
  if (slot.count <= 0) hotbarSlots[selected] = null;

  updateInventoryCounts();
  renderHotbar();      // also updates the held item
  renderInventory();
}

// ==========================================
// PLAYER
// ==========================================

const STANDING_EYE = 1.72;
const STANDING_HEIGHT = 1.75;

const CROUCH_EYE = 1.25;
const CROUCH_HEIGHT = 1.30;

let PLAYER_EYE = STANDING_EYE;
let PLAYER_HEIGHT = STANDING_HEIGHT;

const PLAYER_RADIUS = 0.28;
const CROUCH_SPEED = 1.8;

let isCrouching = false;

const GRAVITY = 38;
const JUMP_FORCE = 12.5;
const MAX_FALL_SPEED = 35;
const SPEED = 5.2;

let velocityY = 0;
let onGround = false;

let yaw = 0;
let pitch = 0;
let locked = false;

const keys = {};

let jumpRequested = false;

document.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if (e.code === 'Space') {
    e.preventDefault();
    jumpRequested = true;
  }

  if (e.code === 'KeyE' && !e.repeat) {
    toggleCraft();
  }

  if (
    e.code === 'KeyQ' &&
    !e.repeat &&
    !isAnyCraftOpen()
  ) {
    dropSelectedItem();
  }

  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));

    if (n >= 1 && n <= 9) {
      selected = n - 1;
      renderHotbar();
    }
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

window.addEventListener('blur', () => {
  for (const code in keys) {
    keys[code] = false;
  }
});

const hotbar = document.querySelector('#hotbar');

let selected = 0;

function renderHotbar() {
  hotbar.innerHTML = '';

  hotbarSlots.forEach((item, i) => {
    const slot = document.createElement('div');

    slot.className = 'slot' + (selected === i ? ' selected' : '');

    const type = item?.type;
    const count = item?.count || 0;

    slot.innerHTML = `
      <span class="number">${i + 1}</span>
      ${type ? `
        <div class="block-preview" style="${iconStyle(type)}"></div>
        <span class="block-name">${type.toUpperCase().replace('_', ' ')}</span>
        <span class="block-count">${count}</span>
      ` : ''}
    `;

    slot.onclick = () => {
      selected = i;
      renderHotbar();
    };

    hotbar.appendChild(slot);
  });

  updateHeldBlock();
}

renderHotbar();
// ==========================================
// 36-SLOT INVENTORY + HOTBAR TRANSFERS
// ==========================================

const inventoryGrid = document.querySelector('#inventory-grid');
const inventoryHotbar = document.querySelector('#inventory-hotbar');



function getArea(area) {
  if (area === 'hotbar') return hotbarSlots;
  if (area === 'craft') return craftGrid;
  if (area === 'table') return tableGrid;
  return inventorySlots;
}

// ---------- click-to-move (cursor holds a stack) ----------
let heldStack = null;

const cursorItemEl = document.createElement('div');
cursorItemEl.style.cssText =
  'position:fixed;z-index:50;width:44px;height:44px;pointer-events:none;display:none;';
document.body.appendChild(cursorItemEl);

document.addEventListener('mousemove', e => {
  cursorItemEl.style.left = (e.clientX - 22) + 'px';
  cursorItemEl.style.top = (e.clientY - 22) + 'px';
});

function updateCursorItem() {
  if (!heldStack) {
    cursorItemEl.style.display = 'none';
    cursorItemEl.innerHTML = '';
    return;
  }
  cursorItemEl.style.display = 'block';
  cursorItemEl.innerHTML = `
    <div style="${iconStyle(heldStack.type)};width:100%;height:100%;border:1px solid #0006;"></div>
    <span style="position:absolute;right:2px;bottom:0;font-size:13px;font-weight:900;color:#fff;text-shadow:2px 2px 2px #000;">${heldStack.count}</span>
  `;
}

function refreshAfterMove() {
  updateInventoryCounts();
  renderHotbar();      // also refreshes the held item in your hand
  renderInventory();
  updateCursorItem();
}

// Left click: pick up, place, merge or swap a whole stack.
function handleSlotClick(area, index) {
  const list = getArea(area);
  const slotItem = list[index];

  if (!heldStack) {
    if (!slotItem) return;
    heldStack = slotItem;
    list[index] = null;
  } else if (!slotItem) {
    list[index] = heldStack;
    heldStack = null;
  } else if (slotItem.type === heldStack.type) {
    const moved = Math.min(MAX_STACK - slotItem.count, heldStack.count);
    slotItem.count += moved;
    heldStack.count -= moved;
    if (heldStack.count <= 0) heldStack = null;
  } else {
    list[index] = heldStack;
    heldStack = slotItem;
  }

  refreshAfterMove();
}

// Right click: pick up half, or place one item at a time.
function handleSlotRightClick(area, index) {
  const list = getArea(area);
  const slotItem = list[index];

  if (!heldStack) {
    if (!slotItem) return;
    const take = Math.ceil(slotItem.count / 2);
    heldStack = { type: slotItem.type, count: take };
    slotItem.count -= take;
    if (slotItem.count <= 0) list[index] = null;
  } else if (!slotItem) {
    list[index] = { type: heldStack.type, count: 1 };
    heldStack.count--;
  } else if (slotItem.type === heldStack.type && slotItem.count < MAX_STACK) {
    slotItem.count++;
    heldStack.count--;
  }

  if (heldStack && heldStack.count <= 0) heldStack = null;
  refreshAfterMove();
}

// Put the cursor stack back when the inventory closes.
function returnHeldStack() {
  if (!heldStack) return;

  const stack = heldStack;
  heldStack = null;

  if (!addInventoryItem(stack.type, stack.count)) {
    // No room: throw it into the world instead of losing it.
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pos = camera.position.clone().addScaledVector(dir, 0.8);
    for (let i = 0; i < stack.count; i++) spawnDrop(pos, stack.type);
  }

  updateCursorItem();
}

function createInventorySlot(item, index, area) {
  const slot = document.createElement('div');

  slot.className = (area === 'craft' || area === 'table')
    ? 'inventory-slot craft-slot'
    : 'inventory-slot';

  if (item) {
    slot.innerHTML = `
      <div class="block-preview" style="${iconStyle(item.type)}"></div>
      <span class="block-count">${item.count}</span>
    `;
    slot.title = `${item.type} x${item.count}`;
  }

  slot.addEventListener('click', () => handleSlotClick(area, index));

  slot.addEventListener('contextmenu', e => {
    e.preventDefault();
    handleSlotRightClick(area, index);
  });

  return slot;
}



function renderInventory() {
  if (!inventoryGrid || !inventoryHotbar) return;

  const views = [[inventoryGrid, inventoryHotbar]];
  const tableOpen = !tableOverlay.classList.contains('hidden');
  if (tableOpen) views.push([tableInvGrid, tableInvHotbar]);

  for (const [grid, bar] of views) {
    grid.innerHTML = '';
    bar.innerHTML = '';

    inventorySlots.forEach((item, index) => {
      grid.appendChild(createInventorySlot(item, index, 'storage'));
    });

    hotbarSlots.forEach((item, index) => {
      bar.appendChild(createInventorySlot(item, index, 'hotbar'));
    });
  }

  renderCraft();
  if (tableOpen) renderTable();
}

// ==========================================
// 2x2 CRAFTING
// ==========================================

const craftLayout = document.querySelector('.craft-grid-layout');
craftLayout.innerHTML = `
  <div id="craft-grid"></div>
  <span class="craft-arrow">➜</span>
  <div id="craft-result"></div>
`;

const craftGridEl = document.querySelector('#craft-grid');
const craftResultEl = document.querySelector('#craft-result');

// ---------- recipes (pattern is matched anywhere in the grid) ----------
const RECIPES = new Map();

// cells are listed row by row, '_' = empty
function addRecipe(rows, cols, cells, result) {
  RECIPES.set(`${rows}x${cols}:${cells.join(',')}`, result);
}

// 1 wood -> 4 planks
addRecipe(1, 1, ['wood'], { type: 'planks', count: 4 });

// 2x2 planks -> crafting table
addRecipe(2, 2, ['planks', 'planks', 'planks', 'planks'], { type: 'crafting_table', count: 1 });

// 2 planks stacked vertically -> 4 sticks
addRecipe(2, 1, ['planks', 'planks'], { type: 'sticks', count: 4 });

// coal above a stick -> 4 torches (works in 2x2 and 3x3)
addRecipe(2, 1, ['coal', 'sticks'], { type: 'torch', count: 4 });

// 3 head blocks across the top + 2 sticks down the middle -> pickaxe (3x3 only)
const PICKAXE_MATERIALS = {
  planks: 'woodenPickaxe',
  cobblestone: 'stonePickaxe',
  iron: 'ironPickaxe',
  diamond: 'diamondPickaxe'
};

for (const [mat, tool] of Object.entries(PICKAXE_MATERIALS)) {
  addRecipe(3, 3,
    [mat, mat, mat,
      '_', 'sticks', '_',
      '_', 'sticks', '_'],
    { type: tool, count: 1 });
}

function matchRecipe(grid, size) {
  let minR = size, maxR = -1, minC = size, maxC = -1;

  grid.forEach((s, i) => {
    if (!s) return;
    const r = Math.floor(i / size), c = i % size;
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  });

  if (maxR < 0) return null;

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(grid[(minR + r) * size + minC + c]?.type || '_');
    }
  }

  return RECIPES.get(`${rows}x${cols}:${cells.join(',')}`) || null;
}

function getCraftResult() { return matchRecipe(craftGrid, 2); }
function getTableResult() { return matchRecipe(tableGrid, 3); }

function renderCraft() {
  if (!craftGridEl || !craftResultEl) return;

  craftGridEl.innerHTML = '';
  craftGrid.forEach((item, index) => {
    craftGridEl.appendChild(createInventorySlot(item, index, 'craft'));
  });

  const result = getCraftResult();

  craftResultEl.className = 'inventory-slot craft-slot';
  craftResultEl.title = result ? `Craft ${result.type} x${result.count}` : '';
  craftResultEl.innerHTML = result
    ? `<div class="block-preview" style="${iconStyle(result.type)}"></div>
       <span class="block-count">${result.count}</span>`
    : '';
  craftResultEl.onclick = takeCraftResult;
}

function takeCraftResult() {
  const result = getCraftResult();
  if (!result) return;

  // Only craft if the result fits in the inventory.
  if (!addInventoryItem(result.type, result.count)) return;

  // Consume one item from each filled slot.
  craftGrid.forEach((slot, i) => {
    if (!slot) return;
    slot.count--;
    if (slot.count <= 0) craftGrid[i] = null;
  });

  renderInventory();
  toast(`Crafted ${result.count} ${result.type.replace('_', ' ')}`);
}

function returnCraftSlot(index) {
  const item = craftGrid[index];
  if (!item) return;

  craftGrid[index] = null;

  if (!addInventoryItem(item.type, item.count)) {
    craftGrid[index] = item; // no room, keep it
    return;
  }

  renderInventory();
}

function returnCraftItems() {
  for (let i = 0; i < craftGrid.length; i++) returnCraftSlot(i);
}

// ==========================================
// CRAFTING TABLE (3x3)
// ==========================================

const tableOverlay = document.createElement('div');
tableOverlay.id = 'table-crafting';
tableOverlay.className = 'hidden';
tableOverlay.innerHTML = `
  <div class="table-window">
    <header>
      <div><small>VOXELCRAFT</small><h2>Crafting Table</h2></div>
      <button id="close-table">×</button>
    </header>

    <div class="table-craft-row">
      <div id="table-grid"></div>
      <span class="craft-arrow">➜</span>
      <div id="table-result"></div>
    </div>

    <h3>Inventory</h3>
    <div id="table-inv-grid" class="slot-grid"></div>
    <h3>Hotbar</h3>
    <div id="table-inv-hotbar" class="slot-grid"></div>
  </div>
`;
document.body.appendChild(tableOverlay);

const tableGridEl = document.querySelector('#table-grid');
const tableResultEl = document.querySelector('#table-result');
const tableInvGrid = document.querySelector('#table-inv-grid');
const tableInvHotbar = document.querySelector('#table-inv-hotbar');

function isAnyCraftOpen() {
  return !document.querySelector('#crafting').classList.contains('hidden') ||
    !tableOverlay.classList.contains('hidden');
}

function renderTable() {
  tableGridEl.innerHTML = '';
  tableGrid.forEach((item, index) => {
    tableGridEl.appendChild(createInventorySlot(item, index, 'table'));
  });

  const result = getTableResult();

  tableResultEl.className = 'inventory-slot craft-slot';
  tableResultEl.title = result ? `Craft ${result.type} x${result.count}` : '';
  tableResultEl.innerHTML = result
    ? `<div class="block-preview" style="${iconStyle(result.type)}"></div>
       <span class="block-count">${result.count}</span>`
    : '';
  tableResultEl.onclick = takeTableResult;
}

function takeTableResult() {
  const result = getTableResult();
  if (!result) return;

  if (!addInventoryItem(result.type, result.count)) return;

  tableGrid.forEach((slot, i) => {
    if (!slot) return;
    slot.count--;
    if (slot.count <= 0) tableGrid[i] = null;
  });

  renderInventory();
  toast(`Crafted ${result.count} ${result.type.replace('_', ' ')}`);
}

function returnTableItems() {
  for (let i = 0; i < tableGrid.length; i++) {
    const item = tableGrid[i];
    if (!item) continue;

    tableGrid[i] = null;
    if (!addInventoryItem(item.type, item.count)) tableGrid[i] = item;
  }
}

function openTable() {
  // Close the normal crafting window first.
  const craftPanel = document.querySelector('#crafting');

  if (!craftPanel.classList.contains('hidden')) {
    returnHeldStack();
    returnCraftItems();
    craftPanel.classList.add('hidden');
  }

  tableOverlay.classList.remove('hidden');

  document.exitPointerLock?.();

  renderInventory();
}

function closeTable() {
  returnHeldStack();
  returnTableItems();
  tableOverlay.classList.add('hidden');
  renderer.domElement.requestPointerLock();
}

document.querySelector('#close-table').onclick = closeTable;

// Move one complete stack from the hotbar to storage.
function moveHotbarToStorage(index) {
  const item = hotbarSlots[index];

  if (!item) return;

  let target = inventorySlots.findIndex(slot =>
    slot && slot.type === item.type &&
    slot.count + item.count <= MAX_STACK
  );

  if (target === -1) {
    target = inventorySlots.findIndex(slot => !slot);
  }

  if (target === -1) {
    toast('Inventory is full!');
    return;
  }

  if (inventorySlots[target]) {
    inventorySlots[target].count += item.count;
  } else {
    inventorySlots[target] = item;
  }

  hotbarSlots[index] = null;

  updateInventoryCounts();
  renderHotbar();
  renderInventory();
}


document.addEventListener('wheel', e => {
  if (isAnyCraftOpen()) {
    return;
  }

  selected += e.deltaY > 0 ? 1 : -1;

  if (selected >= hotbarSlots.length) selected = 0;
  if (selected < 0) selected = hotbarSlots.length - 1;

  renderHotbar();
}, { passive: true });

// ==========================================
// PLAYER COLLISION
// ==========================================

function intersectsPlayer(x, feet, z, block) {

  const p = block.position;
  const size = block.userData.size || 1;

  return (
    x + PLAYER_RADIUS > p.x - size / 2 &&
    x - PLAYER_RADIUS < p.x + size / 2 &&
    feet < p.y + 0.5 &&
    feet + PLAYER_HEIGHT > p.y - 0.5 &&
    z + PLAYER_RADIUS > p.z - size / 2 &&
    z - PLAYER_RADIUS < p.z + size / 2
  );
}

function collides(x, feet, z) {
  let collision = false;

  forEachNearbyBlock(
    x, feet + PLAYER_HEIGHT / 2, z,
    1, 2, 1,
    block => {
      if (!collision && intersectsPlayer(x, feet, z, block)) {
        collision = true;
      }
    }
  );

  return collision;
}

// ==========================================
// DROPPABLE ITEMS AND INVENTORY
// ==========================================

const inventory = {
  grass: 0,
  dirt: 0,
  cobblestone: 0,
  stone: 0,
  coal: 0,
  iron: 0,
  diamond: 0,
  wood: 0,
  leaves: 0,
  flint: 0,
  flintSteel: 0,
  planks: 0,
  sticks: 0,
  woodenPickaxe: 0,
  stonePickaxe: 0,
  ironPickaxe: 0,
  diamondPickaxe: 0,
  torch: 0,
  crafting_table: 0
};

// Recalculate total item counts from both storage and hotbar.
function updateInventoryCounts() {
  Object.keys(inventory).forEach(type => {
    inventory[type] = 0;
  });

  [...hotbarSlots, ...inventorySlots].forEach(slot => {
    if (slot) {
      inventory[slot.type] =
        (inventory[slot.type] || 0) + slot.count;
    }
  });
}

// Add items to an existing stack or an empty slot.
function addInventoryItem(type, amount = 1) {
  let remaining = amount;

  const allSlots = [...hotbarSlots, ...inventorySlots];

  // Check whether enough space exists.
  const available = allSlots.reduce((total, slot) => {
    if (!slot) return total + MAX_STACK;
    if (slot.type === type) return total + MAX_STACK - slot.count;
    return total;
  }, 0);

  if (available < amount) {
    toast('Not enough inventory space!');
    return false;
  }

  // Fill existing stacks first.
  for (const slot of allSlots) {
    if (!slot || slot.type !== type || slot.count >= MAX_STACK) {
      continue;
    }

    const added = Math.min(MAX_STACK - slot.count, remaining);
    slot.count += added;
    remaining -= added;

    if (remaining === 0) break;
  }

  // Fill empty hotbar slots.
  for (let i = 0; i < hotbarSlots.length && remaining > 0; i++) {
    if (!hotbarSlots[i]) {
      const added = Math.min(MAX_STACK, remaining);
      hotbarSlots[i] = { type, count: added };
      remaining -= added;
    }
  }

  // Fill empty inventory slots.
  for (let i = 0; i < inventorySlots.length && remaining > 0; i++) {
    if (!inventorySlots[i]) {
      const added = Math.min(MAX_STACK, remaining);
      inventorySlots[i] = { type, count: added };
      remaining -= added;
    }
  }

  updateInventoryCounts();
  renderHotbar();
  renderInventory();

  return true;
}

// Remove items from hotbar first, then storage.
function removeInventoryItem(type, amount = 1) {
  if ((inventory[type] || 0) < amount) return false;

  let remaining = amount;

  const allSlots = [...hotbarSlots, ...inventorySlots];

  for (const slot of allSlots) {
    if (!slot || slot.type !== type) continue;

    const removed = Math.min(slot.count, remaining);

    slot.count -= removed;
    remaining -= removed;

    if (slot.count <= 0) {
      const hotbarIndex = hotbarSlots.indexOf(slot);
      const inventoryIndex = inventorySlots.indexOf(slot);

      if (hotbarIndex !== -1) {
        hotbarSlots[hotbarIndex] = null;
      }

      if (inventoryIndex !== -1) {
        inventorySlots[inventoryIndex] = null;
      }
    }

    if (remaining <= 0) break;
  }

  updateInventoryCounts();
  renderHotbar();
  renderInventory();

  return true;
}

// Remove one item specifically from the selected hotbar slot.
function removeSelectedHotbarItem() {
  const slot = hotbarSlots[selected];

  if (!slot) return false;

  slot.count--;

  if (slot.count <= 0) {
    hotbarSlots[selected] = null;
  }

  updateInventoryCounts();
  renderHotbar();
  renderInventory();

  return true;
}

// ==========================================
// PLACED TORCHES AND THEIR LIGHTS
// ==========================================

const placedTorches = new Map();

function placeTorch(x, y, z) {
  const id = key(x, y, z);

  if (placedTorches.has(id)) return false;

  const torchGroup = new THREE.Group();

  const woodMaterial = new THREE.MeshLambertMaterial({
    color: 0x79502f
  });

  const flameMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb52e
  });

  const stick = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.48, 0.09),
    woodMaterial
  );

  stick.position.y = -0.20;
  torchGroup.add(stick);

  const flame = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.16, 0.13),
    flameMaterial
  );

  flame.position.y = 0.12;
  torchGroup.add(flame);

  const light = new THREE.PointLight(
    0xffb84a,
    3.5,
    10,
    2
  );

  light.position.y = 0.25;
  torchGroup.add(light);

  torchGroup.position.set(x, y, z);
  scene.add(torchGroup);

  placedTorches.set(id, torchGroup);

  return true;
}

const drops = new THREE.Group();
scene.add(drops);

const dropGeometry = new THREE.BoxGeometry(0.28, 0.28, 0.28);

const dropMaterials = {};

Object.keys(materials).forEach(type => {
  dropMaterials[type] = materials[type];
});

function spawnDrop(position, type) {

  const mesh = new THREE.Mesh(
    dropGeometry,
    dropMaterials[type] || materials.stone
  );

  mesh.position.copy(position);
  mesh.position.x += (Math.random() - 0.5) * 0.4;
  mesh.position.z += (Math.random() - 0.5) * 0.4;

  mesh.userData = {
    type,
    pickupDelay: 0,
    velocityY: 2 + Math.random() * 2,
    velocityX: (Math.random() - 0.5) * 2,
    velocityZ: (Math.random() - 0.5) * 2
  };

  drops.add(mesh);
  return mesh;
}

function destroyBlock(mesh) {

  const type = mesh.userData.type;
  const treeId = mesh.userData.treeId;

  // Breaking any part of a tree collapses the entire tree.
  if (treeId) {

    const treeBlocks = [...blocks.values()].filter(
      block => block.userData.treeId === treeId
    );

    treeBlocks.forEach(block => {

      const blockType = block.userData.type;
      const position = block.position.clone();

      removeBlock(block);
      spawnDrop(position, blockType);

    });

    toast('TREE DESTROYED!');
    return;
  }

  const position = mesh.position.clone();

  removeBlock(mesh);

  // Reveal the next underground layer.
  if (position.y <= generatedDepth && position.y > MIN_WORLD_DEPTH) {
    revealLayersThrough(position.y - 1);
  }

  if (type !== 'tnt') {

    const dropType =
      type === 'grass' ? 'dirt' :
        type === 'stone' ? 'cobblestone' :
          type;

    spawnDrop(position, dropType);

  }

}

function updateDrops(dt) {
  const playerPosition = new THREE.Vector3(
    camera.position.x,
    camera.position.y - 1.0,
    camera.position.z
  );

  for (let i = drops.children.length - 1; i >= 0; i--) {
    const drop = drops.children[i];
    const p = drop.userData;

    const distance = drop.position.distanceTo(playerPosition);

    const canPickup = (p.pickupDelay || 0) <= 0;
    if (!canPickup) p.pickupDelay -= dt;

    // Magnet attraction: accelerate toward the player.
    if (canPickup && distance < 2) {
      const direction = new THREE.Vector3()
        .subVectors(playerPosition, drop.position)
        .normalize();

      p.velocityX += direction.x * 25 * dt;
      p.velocityY += direction.y * 25 * dt;
      p.velocityZ += direction.z * 25 * dt;
    }

    // Gravity always applies, including when the magnet is active.
    p.velocityY -= 15 * dt;

    const previousY = drop.position.y;

    drop.position.x += p.velocityX * dt;
    drop.position.y += p.velocityY * dt;
    drop.position.z += p.velocityZ * dt;

    // Find the highest block surface directly beneath the drop.
    let ground = -Infinity;

    forEachNearbyBlock(
      drop.position.x,
      drop.position.y,
      drop.position.z,
      1, 2, 1,
      block => {
        const size = block.userData.size || 1;

        const close =
          Math.abs(drop.position.x - block.position.x) < size / 2 + 0.14 &&
          Math.abs(drop.position.z - block.position.z) < size / 2 + 0.14;

        const top = block.position.y + 0.5;

        if (close && previousY >= top + 0.14 && drop.position.y <= top + 0.14) {
          ground = Math.max(ground, top);
        }

        // Keep an already-landed drop resting on the surface.
        if (
          close &&
          Math.abs(drop.position.y - (top + 0.14)) < 0.05 &&
          p.velocityY <= 0
        ) {
          ground = Math.max(ground, top);
        }
      }
    );

    if (ground !== -Infinity) {
      drop.position.y = ground + 0.14;
      p.velocityY = 0;
      p.velocityX *= 0.75;
      p.velocityZ *= 0.75;
    }

    // Slow horizontal movement over time.
    p.velocityX *= 0.98;
    p.velocityZ *= 0.98;

    drop.rotation.y += dt * 3;

    // Collect when close enough.
    // Collect into the hotbar or 36-slot storage.
    if (canPickup && drop.position.distanceTo(playerPosition) < 0.55) {
      if (addInventoryItem(p.type, 1)) {
        drops.remove(drop);

        toast(`Collected ${p.type}: ${inventory[p.type]}/64`);
      }
    }
  }
}
// ==========================================
// TNT EXPLOSIONS
// ==========================================

function explode(position) {

  const destroyed = [];

  let deepestDestroyedY = generatedDepth;

  forEachNearbyBlock(
    position.x,
    position.y,
    position.z,
    4, 4, 4,
    block => {

      if (
        block.position.distanceToSquared(position) <
        3.5 * 3.5
      ) {

        destroyed.push(block);

        deepestDestroyedY = Math.min(
          deepestDestroyedY,
          block.position.y
        );

      }

    }
  );

  destroyed.forEach(block => {

    const type = block.userData.type;
    const p = block.position.clone();

    removeBlock(block);

    if (type !== 'tnt') {
      spawnDrop(p, type);
    }

  });

  // Reveal underground layers if the explosion dug deeper.
  if (deepestDestroyedY < generatedDepth) {
    revealLayersThrough(deepestDestroyedY - 1);
  }

  const light = new THREE.PointLight(0xff9b35, 25, 12);

  light.position.copy(position);
  scene.add(light);

  setTimeout(() => scene.remove(light), 300);

  toast('TNT EXPLOSION!');

}

// ==========================================
// MOUSE AND BLOCK INTERACTION
// ==========================================

const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

let currentTargetHit = null;

function targeted() {
  raycaster.setFromCamera(center, camera);

  const hits = raycaster.intersectObjects(world.children, false);
  const hit = hits.find(item => item.distance < 4.5);

  if (!hit) return null;

  if (hit.object.userData.isChunkMesh) {
    const block = hit.object.userData.faceBlocks[hit.faceIndex];

    if (!block) return null;

    hit.block = block;
  } else {
    hit.block = hit.object;
  }

  return hit;
}

let blockOutline = null;
let outlinedMesh = null;

function createThickOutline(target) {
  const bounds = new THREE.Box3().setFromObject(target);
  const min = bounds.min;
  const max = bounds.max;

  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    depthTest: true
  });

  const radius = 0.012;

  const corners = [
    [min.x, min.y, min.z],
    [max.x, min.y, min.z],
    [max.x, max.y, min.z],
    [min.x, max.y, min.z],
    [min.x, min.y, max.z],
    [max.x, min.y, max.z],
    [max.x, max.y, max.z],
    [min.x, max.y, max.z]
  ].map(p => new THREE.Vector3(...p));

  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];

  edges.forEach(([a, b]) => {
    const start = corners[a];
    const end = corners[b];

    const direction = new THREE.Vector3()
      .subVectors(end, start);

    const length = direction.length();

    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 2, length, radius * 2),
      material
    );

    bar.position.copy(start).add(end).multiplyScalar(0.5);

    bar.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );

    group.add(bar);
  });

  return group;
}

function updateBlockOutline() {
  const hit = currentTargetHit;
  const target = hit ? hit.block : null;

  if (target !== outlinedMesh) {
    if (blockOutline) {
      scene.remove(blockOutline);

      blockOutline.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
      });

      blockOutline = null;
    }

    outlinedMesh = target;

    if (target) {
      blockOutline = createThickOutline(target);
      scene.add(blockOutline);
    }
  }
}

renderer.domElement.addEventListener('click', () => {

  if (isAnyCraftOpen()) {
    return;
  }

  renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;

  if (!locked) {
    miningHeld = false;
    miningTarget = null;
    miningTime = 0;
  }
});

document.addEventListener('mousemove', e => {

  const nx = (e.clientX / innerWidth - 0.5) * 2;
  const ny = (e.clientY / innerHeight - 0.5) * 2;

  const eyes = document.querySelector('#avatar .eyes');

  if (eyes) {
    eyes.style.transform = `translate(${nx * 3}px,${ny * 2}px)`;
  }

  const head = document.querySelector('#avatar .avatar-head');

  if (head) {
    head.style.transform = `rotateY(${nx * 9}deg) rotateX(${-ny * 5}deg)`;
  }

  if (!locked) return;

  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;

  pitch = Math.max(-1.48, Math.min(1.48, pitch));
});

document.addEventListener('contextmenu', e => e.preventDefault());

let miningTarget = null;
let miningTime = 0;
let miningHeld = false;

const BLOCK_BREAK_TIME = 0.8;

renderer.domElement.addEventListener('mousedown', e => {
  if (!locked) return;

  if (e.button === 0) {
    miningHeld = true;
    miningTarget = null;
    miningTime = 0;
  }

  if (e.button === 2) {
    const hit = targeted();
    if (!hit) return;

    const mesh = hit.block;
    // Right-click a crafting table to open it (hold Shift to place a block instead).
    if (mesh.userData.type === 'crafting_table' && !isCrouching) {
      openTable();
      return;
    }
    const type = hotbarSlots[selected]?.type || null;
    const placeableBlocks = [
      'grass',
      'dirt',
      'cobblestone',
      'stone',
      'coal',
      'iron',
      'diamond',
      'wood',
      'leaves',
      'sand',
      'flint',
      'tnt',
      'planks',
      'crafting_table',
      'Torch'
    ];

    if (type && !placeableBlocks.includes(type)) {
      toast('You cannot place this item!');
      return;
    }

    if (!type || inventory[type] <= 0) {
      toast('Select a collected block first!');
      return;
    }

    const normal = hit.face.normal.clone();
    const position = mesh.position.clone().add(normal);

    const x = Math.round(position.x);
    const y = Math.round(position.y);
    const z = Math.round(position.z);

    if (blocks.has(key(x, y, z))) return;

    if (intersectsPlayer(
      camera.position.x,
      camera.position.y - PLAYER_EYE,
      camera.position.z,
      {
        position: new THREE.Vector3(x, y, z),
        userData: { size: 1 }
      }
    )) return;

    // Place a torch with its own dynamic light.
    if (type === 'torch') {
      if (!placeTorch(x, y, z)) return;

      removeSelectedHotbarItem();
      triggerHandAction('place');
      return;
    }

    addBlock(x, y, z, type);

    removeSelectedHotbarItem();
    triggerHandAction('place');
  }
});

document.addEventListener('mouseup', e => {
  if (e.button === 0) {
    miningHeld = false;
    miningTarget = null;
    miningTime = 0;
  }
  hidePickaxeDurabilityUI();
});

function updateMining(dt) {
  if (!miningHeld || !locked) return;

  const hit = currentTargetHit;

  if (!hit) {
    miningTarget = null;
    miningTime = 0;
    return;
  }

  const target = hit.block;
  const type = target.userData.type;

  // Stone can only be mined with a wooden pickaxe.
  const hardBlocks = [
    'stone',
    'cobblestone',
    'coal',
    'iron',
    'diamond',
    'flint'
  ];

  const heldTool = PICKAXES[hotbarSlots[selected]?.type];

  const heldItemSlot = hotbarSlots[selected];

  if (heldTool && miningHeld) {
    updatePickaxeDurabilityUI(heldItemSlot);
  } else {
    hidePickaxeDurabilityUI();
  }

  if (hardBlocks.includes(type) && !heldTool) {
    if (target !== miningTarget) {
      toast('You need a Wooden Pickaxe to mine this block!');
    }

    miningTarget = target;
    miningTime = 0;
    return;
  }

  if (target !== miningTarget) {
    miningTarget = target;
    miningTime = 0;
  }

  miningTime += dt;

  const breakTime = hardBlocks.includes(type)
    ? 1.2 / (heldTool?.speed || 1)
    : BLOCK_BREAK_TIME;

  if (miningTime >= breakTime) {
    const mesh = miningTarget;

    miningTarget = null;
    miningTime = 0;

    // Damage the pickaxe only when a block is successfully broken.
    if (heldTool && hardBlocks.includes(mesh.userData.type)) {
      damagePickaxe(heldItemSlot);
    }

    if (mesh.userData.type === 'tnt') {
      explode(mesh.position.clone());
    } else {
      destroyBlock(mesh);
    }
  }
}

// ==========================================
// CRAFTING WINDOW
// ==========================================

function toggleCraft() {
  const panel = document.querySelector('#crafting');

  if (panel.classList.contains('hidden')) {
    // Close crafting table before opening normal crafting.
    if (!tableOverlay.classList.contains('hidden')) {
      returnHeldStack();
      returnTableItems();
      tableOverlay.classList.add('hidden');
    }

    panel.classList.remove('hidden');
    document.exitPointerLock?.();

  } else {
    returnHeldStack();
    returnCraftItems();

    panel.classList.add('hidden');

    renderer.domElement.requestPointerLock();
  }
}

document.querySelector('#close-craft').onclick = toggleCraft;

// ==========================================
// TOAST MESSAGES
// ==========================================

function toast(message) {

  const t = document.querySelector('#toast');

  if (!t) return;

  t.textContent = message;
  t.classList.add('show');

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    t.classList.remove('show');
  }, 1600);
}

// Check whether the player has ground beneath all four corners.
function hasCrouchSupport(x, z, feet) {
  const offset = PLAYER_RADIUS * 0.8;

  const corners = [
    [x - offset, z - offset],
    [x + offset, z - offset],
    [x - offset, z + offset],
    [x + offset, z + offset]
  ];

  return corners.every(([cx, cz]) => {
    let supported = false;

    forEachNearbyBlock(cx, feet, cz, 1, 1, 1, block => {
      const size = block.userData.size || 1;
      const top = block.position.y + 0.5;

      const inside =
        cx >= block.position.x - size / 2 &&
        cx <= block.position.x + size / 2 &&
        cz >= block.position.z - size / 2 &&
        cz <= block.position.z + size / 2;

      if (inside && Math.abs(top - feet) < 0.15) {
        supported = true;
      }
    });

    return supported;
  });
}

// Automatically climb obstacles up to one block high.
function tryAutoJump(x, z) {
  if (isCrouching || !onGround || velocityY > 0) {
    return false;
  }

  const feet = camera.position.y - PLAYER_EYE;

  let landingHeight = -Infinity;

  forEachNearbyBlock(x, feet + 0.5, z, 1, 2, 1, block => {
    const size = block.userData.size || 1;
    const top = block.position.y + 0.5;

    const horizontal =
      x + PLAYER_RADIUS > block.position.x - size / 2 &&
      x - PLAYER_RADIUS < block.position.x + size / 2 &&
      z + PLAYER_RADIUS > block.position.z - size / 2 &&
      z - PLAYER_RADIUS < block.position.z + size / 2;

    const heightDifference = top - feet;

    if (
      horizontal &&
      heightDifference > 0.05 &&
      heightDifference <= 1.05
    ) {
      landingHeight = Math.max(landingHeight, top);
    }
  });

  if (landingHeight === -Infinity) return false;

  // Make sure there is enough room above the obstacle.
  if (collides(x, landingHeight + 0.02, z)) {
    return false;
  }

  camera.position.y = landingHeight + PLAYER_EYE;
  velocityY = 0;
  onGround = true;

  return true;
}

function updateMovement(dt) {

  // Shift to crouch, release Shift to stand.
  const wantsCrouch = keys.ShiftLeft || keys.ShiftRight;

  const feetBefore = camera.position.y - PLAYER_EYE;

  if (wantsCrouch) {
    isCrouching = true;
  } else if (isCrouching) {
    // Only stand up if there is enough headroom.
    const oldHeight = PLAYER_HEIGHT;

    PLAYER_HEIGHT = STANDING_HEIGHT;

    if (!collides(
      camera.position.x,
      feetBefore,
      camera.position.z
    )) {
      isCrouching = false;
    } else {
      PLAYER_HEIGHT = oldHeight;
    }
  }

  // Change player height while keeping feet at the same position.
  const newEye = isCrouching ? CROUCH_EYE : STANDING_EYE;
  const newHeight = isCrouching ? CROUCH_HEIGHT : STANDING_HEIGHT;

  const currentFeet = camera.position.y - PLAYER_EYE;

  PLAYER_EYE = newEye;
  PLAYER_HEIGHT = newHeight;

  camera.position.y = currentFeet + PLAYER_EYE;

  const forward = new THREE.Vector3(
    -Math.sin(yaw), 0, -Math.cos(yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(yaw), 0, -Math.sin(yaw)
  );

  const movement = new THREE.Vector3();

  if (keys.KeyW) movement.add(forward);
  if (keys.KeyS) movement.sub(forward);
  if (keys.KeyD) movement.add(right);
  if (keys.KeyA) movement.sub(right);

  if (movement.lengthSq() > 0) {
    const speed = isCrouching ? CROUCH_SPEED : SPEED;
    movement.normalize().multiplyScalar(speed * dt);
  }

  const feet = camera.position.y - PLAYER_EYE;

  // Move horizontally, auto-jumping over one-block obstacles.
  const nextX = camera.position.x + movement.x;

  if (movement.x !== 0) {
    const blocked = collides(
      nextX,
      feet + 0.02,
      camera.position.z
    );

    const safeEdge = !isCrouching || !onGround ||
      hasCrouchSupport(nextX, camera.position.z, feet);

    if (safeEdge && !blocked) {
      camera.position.x = nextX;
    } else if (
      !isCrouching &&
      blocked &&
      tryAutoJump(nextX, camera.position.z)
    ) {
      camera.position.x = nextX;
    }
  }

  const nextZ = camera.position.z + movement.z;

  if (movement.z !== 0) {
    const blocked = collides(
      camera.position.x,
      feet + 0.02,
      nextZ
    );

    const safeEdge = !isCrouching || !onGround ||
      hasCrouchSupport(camera.position.x, nextZ, feet);

    if (safeEdge && !blocked) {
      camera.position.z = nextZ;
    } else if (
      !isCrouching &&
      blocked &&
      tryAutoJump(camera.position.x, nextZ)
    ) {
      camera.position.z = nextZ;
    }
  }

  // Normal jumping with Space.
  if (jumpRequested && onGround && !isCrouching) {
    velocityY = JUMP_FORCE;
    onGround = false;
  }

  jumpRequested = false;

  updateGravity(dt);
}

function updateGravity(dt) {
  const feet = camera.position.y - PLAYER_EYE;

  velocityY = Math.max(
    velocityY - GRAVITY * dt,
    -MAX_FALL_SPEED
  );

  const nextFeet = feet + velocityY * dt;

  if (velocityY <= 0) {
    let highestGround = -Infinity;

    forEachNearbyBlock(
      camera.position.x,
      feet,
      camera.position.z,
      1, 2, 1,
      block => {
        const top = block.position.y + 0.5;

        const horizontal =
          Math.abs(camera.position.x - block.position.x) < 0.5 + PLAYER_RADIUS &&
          Math.abs(camera.position.z - block.position.z) < 0.5 + PLAYER_RADIUS;

        if (
          horizontal &&
          feet >= top - 0.15 &&
          nextFeet <= top
        ) {
          highestGround = Math.max(highestGround, top);
        }
      }
    );

    if (highestGround !== -Infinity) {
      camera.position.y = highestGround + PLAYER_EYE;
      velocityY = 0;
      onGround = true;
      return;
    }
  }

  if (velocityY > 0) {
    let ceiling = Infinity;

    forEachNearbyBlock(
      camera.position.x,
      feet + PLAYER_HEIGHT,
      camera.position.z,
      1, 2, 1,
      block => {
        const bottom = block.position.y - 0.5;

        const horizontal =
          Math.abs(camera.position.x - block.position.x) < 0.5 + PLAYER_RADIUS &&
          Math.abs(camera.position.z - block.position.z) < 0.5 + PLAYER_RADIUS;

        if (
          horizontal &&
          feet + PLAYER_HEIGHT <= bottom &&
          nextFeet + PLAYER_HEIGHT >= bottom
        ) {
          ceiling = Math.min(ceiling, bottom);
        }
      }
    );

    if (ceiling !== Infinity) {
      camera.position.y = ceiling - PLAYER_HEIGHT + PLAYER_EYE;
      velocityY = 0;
      return;
    }
  }

  camera.position.y += velocityY * dt;
  onGround = false;
}

// ==========================================
// 3D CHARACTER PREVIEW (inventory left panel)
// ==========================================

const previewFrame = document.querySelector('.avatar-frame');
let previewRenderer = null;
const previewScene = new THREE.Scene();
const previewCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
const previewMouse = { x: 0, y: 0 };
let previewRotY = 0;
let previewHead = null;
let previewBody = null;

if (previewFrame) {
  previewFrame.innerHTML = '';

  previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  previewFrame.appendChild(previewRenderer.domElement);

  previewScene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
  sunLight.position.set(20, 30, 40);
  previewScene.add(sunLight);

  previewCamera.position.set(0, 0, 80);
  previewCamera.lookAt(0, 0, 0);

  const part = (w, h, d, color, x, y, z, parent) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color })
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  const SKIN = 0xdca477, SHIRT = 0x3979a7, PANTS = 0x334454, HAIR = 0x38291f;

  previewBody = new THREE.Group();
  previewScene.add(previewBody);

  // Head (pivots at the neck)
  previewHead = new THREE.Group();
  previewHead.position.set(0, 8, 0);
  previewBody.add(previewHead);

  part(8, 8, 8, SKIN, 0, 4, 0, previewHead);
  part(8.5, 2.5, 8.5, HAIR, 0, 7.8, 0, previewHead);   // hair top
  part(8.5, 6, 1, HAIR, 0, 4.5, -3.8, previewHead);    // hair back
  part(1.6, 1.6, 0.4, 0xffffff, -2, 4.6, 4.05, previewHead);
  part(1.6, 1.6, 0.4, 0xffffff, 2, 4.6, 4.05, previewHead);
  part(0.8, 1.6, 0.5, 0x242b30, -1.6, 4.6, 4.1, previewHead);
  part(0.8, 1.6, 0.5, 0x242b30, 2.4, 4.6, 4.1, previewHead);

  // Torso, arms, legs
  part(8, 12, 4, SHIRT, 0, 2, 0, previewBody);
  part(4, 12, 4, SKIN, -6, 2, 0, previewBody);
  part(4, 12, 4, SKIN, 6, 2, 0, previewBody);
  part(4.2, 4.5, 4.2, SHIRT, -6, 5.2, 0, previewBody);  // sleeves
  part(4.2, 4.5, 4.2, SHIRT, 6, 5.2, 0, previewBody);
  part(4, 12, 4, PANTS, -2, -10, 0, previewBody);
  part(4, 12, 4, PANTS, 2, -10, 0, previewBody);
  part(4.2, 2, 4.2, 0x2a2a2a, -2, -15, 0, previewBody);  // shoes
  part(4.2, 2, 4.2, 0x2a2a2a, 2, -15, 0, previewBody);

  // Keep the canvas sized to the panel (it is 0x0 while the window is hidden).
  new ResizeObserver(() => {
    const w = previewFrame.clientWidth;
    const h = previewFrame.clientHeight;
    if (!w || !h) return;
    previewRenderer.setSize(w, h, false);
    previewCamera.aspect = w / h;
    previewCamera.updateProjectionMatrix();
  }).observe(previewFrame);

  document.addEventListener('mousemove', e => {
    previewMouse.x = (e.clientX / innerWidth - 0.5) * 2;
    previewMouse.y = (e.clientY / innerHeight - 0.5) * 2;
  });
}

function renderCharacterPreview(now) {
  if (!previewRenderer || !previewFrame.clientWidth) return;

  // The body turns toward the cursor, the head follows a bit more.
  const targetY = previewMouse.x * 0.9;
  previewRotY += (targetY - previewRotY) * 0.12;

  previewBody.rotation.y = previewRotY * 0.6;
  previewHead.rotation.y = previewRotY * 0.5;
  previewHead.rotation.x = previewMouse.y * 0.35;
  previewBody.position.y = Math.sin(now * 0.002) * 0.25; // gentle idle bob

  previewRenderer.render(previewScene, previewCamera);
}

// ==========================================
// GAME LOOP
// ==========================================

let last = performance.now();

function animate(now) {

  requestAnimationFrame(animate);

  const dt = Math.min((now - last) / 1000, 0.04);
  last = now;

  // Pause 3D processing while inventory is open.
  const craftingOpen = isAnyCraftOpen();

  if (craftingOpen) {
    renderer.render(scene, camera); // redraw so the hand updates
    renderCharacterPreview(now);
    return;
  }

  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  updateMovement(dt);
  updateDrops(dt);

  currentTargetHit = locked ? targeted() : null;

  updateHandAnimation(dt);
  updateMining(dt);
  updateBlockOutline();

  updateClouds(dt);
  updateDayNight(dt);

  renderer.render(scene, camera);
  flushChunkUpdates();
}

requestAnimationFrame(animate);

// ==========================================
// RESIZE
// ==========================================

addEventListener('resize', () => {

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});
