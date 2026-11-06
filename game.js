
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ==========================================
// VOXELCRAFT ENGINE
// ==========================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc9e8);
scene.fog = new THREE.Fog(0x9bc9e8, 25, 85);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// ==========================================
// SUN AND CLOUDS
// ==========================================

// Sun
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(4, 16, 16),
  new THREE.MeshBasicMaterial({
    color: 0xffee88,
    fog: false
  })
);

sun.position.set(0, 26, -60);
scene.add(sun);

// Clouds
const clouds = [];

const cloudMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  fog: false
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

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 2.22, 6);

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

// Upper arm
const arm = new THREE.Mesh(
  new THREE.BoxGeometry(0.22, 0.48, 0.22),
  skinMaterial
);

arm.position.set(0.35, -0.48, -0.65);
hand.add(arm);

// Initial hand position
hand.position.set(0, 0, 0);

// Animation state
let handBobTime = 0;
let handMoveAmount = 0;
let handActionTime = 0;
let handActionType = null;

const handBasePosition = new THREE.Vector3(0, 0, 0);

// ==========================================
// HAND ANIMATION SYSTEM
// ==========================================

function triggerHandAction(type) {
  handActionType = type;
  handActionTime = 0;
}

function updateHandAnimation(dt) {
  const moving =
    keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD;

  // Smooth walking transition
  handMoveAmount = THREE.MathUtils.lerp(
    handMoveAmount,
    moving ? 1 : 0,
    Math.min(dt * 12, 1)
  );

  // Minecraft-style walking bob
  handBobTime += dt * 12;

  const walkY =
    Math.abs(Math.sin(handBobTime)) * 0.10 * handMoveAmount;

  const walkX =
    Math.cos(handBobTime) * 0.065 * handMoveAmount;

  let actionY = 0;
  let actionZ = 0;
  let actionRotation = 0;

  // Continuous mining swing while holding left mouse button
  if (miningHeld && locked) {
    const swing = Math.sin(performance.now() * 0.018);

    actionY = -Math.max(0, swing) * 0.16;
    actionZ = -Math.max(0, swing) * 0.20;
    actionRotation = Math.max(0, swing) * 0.85;
  }

  // One-shot block placement animation
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

  // Combine walking and interaction animations
  hand.position.set(
    handBasePosition.x + walkX,
    handBasePosition.y + walkY + actionY,
    handBasePosition.z + actionZ
  );

  // Animate the arm
  arm.rotation.x = actionRotation * 0.8 - walkY * 2;
  arm.rotation.y = walkX * 0.5;
  arm.rotation.z = -walkX * 2;

  // Animate the entire hand
  hand.rotation.x = actionRotation;
  hand.rotation.y = walkX * 1.2;
  hand.rotation.z = -walkX * 0.8;
}


// ==========================================
// PROCEDURAL PIXEL TEXTURES
// ==========================================

// BLOCK TEXTURE GENERATOR
// Replace your existing texture/material generation section with this.

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
  if (!['grass', 'wood'].includes(type)) {
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
};

// Held block shown in the player's right hand
const heldBlock = new THREE.Mesh(
  new THREE.BoxGeometry(0.24, 0.24, 0.24),
  materials.dirt
);

heldBlock.position.set(0.35, -0.67, -0.82);
heldBlock.rotation.set(0.25, 0.35, 0.15);
heldBlock.visible = false;

hand.add(heldBlock);

function updateHeldBlock() {
  const type = hotbarSlots[selected];

  const placeableBlocks = [
    'grass', 'dirt', 'cobblestone', 'stone',
    'coal', 'iron', 'diamond', 'wood',
    'leaves', 'sand', 'flint', 'tnt', 'planks'
  ];

  if (
    type &&
    placeableBlocks.includes(type) &&
    inventory[type] > 0
  ) {
    heldBlock.material = Array.isArray(materials[type])
      ? materials[type][0]
      : materials[type];

    heldBlock.visible = true;
  } else {
    heldBlock.visible = false;
  }
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

const hotbarSlots = Array(10).fill(null);
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

  if (e.code === 'KeyE') {
    toggleCraft();
  }

  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));

    // Keys 1-9 select slots 1-9.
    // Key 0 selects slot 10.
    if (n >= 1 && n <= 9) {
      selected = n - 1;
      renderHotbar();
    } else if (n === 0) {
      selected = 9;
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

  hotbarSlots.forEach((type, i) => {
    const slot = document.createElement('div');

    slot.className = 'slot' + (
      selected === i ? ' selected' : ''
    );

    const count = type ? (inventory[type] || 0) : 0;

    slot.innerHTML = `
      <span class="number">${i === 9 ? 0 : i + 1}</span>

${type ? `
  <div class="block-preview"
    style="
      background-color:${blockColors[type] || '#777'};
      background-image:url('${(
          (Array.isArray(materials[type])
            ? materials[type][0]
            : materials[type])?.map?.image?.toDataURL?.()
        ) || ''}');
      background-size:cover;
      background-position:center;
      image-rendering:pixelated;
    ">
  </div>

  <span class="block-name">${type.toUpperCase()}</span>
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

document.addEventListener('wheel', e => {
  if (!document.querySelector('#crafting').classList.contains('hidden')) {
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
  woodenPickaxe: 0
};

function addInventoryItem(type, amount = 1) {
  const current = inventory[type] || 0;

  if (current + amount > MAX_STACK) {
    toast('Stack is full!');
    return false;
  }

  let slot = hotbarSlots.indexOf(type);

  if (slot === -1) {
    slot = hotbarSlots.indexOf(null);
  }

  if (slot === -1) {
    toast('Not enough inventory space!');
    return false;
  }

  hotbarSlots[slot] = type;
  inventory[type] = current + amount;

  renderHotbar();
  return true;
}

function removeInventoryItem(type, amount = 1) {
  if ((inventory[type] || 0) < amount) return false;

  inventory[type] -= amount;

  if (inventory[type] <= 0) {
    inventory[type] = 0;

    hotbarSlots.forEach((item, index) => {
      if (item === type) hotbarSlots[index] = null;
    });
  }

  renderHotbar();
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
    velocityY: 2 + Math.random() * 2,
    velocityX: (Math.random() - 0.5) * 2,
    velocityZ: (Math.random() - 0.5) * 2
  };

  drops.add(mesh);
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

    // Magnet attraction: accelerate toward the player.
    if (distance < 2) {
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
    if (drop.position.distanceTo(playerPosition) < 0.55) {
      const count = inventory[p.type] || 0;

      if (count >= MAX_STACK) {
        continue;
      }

      let slot = hotbarSlots.indexOf(p.type);

      if (slot === -1) {
        slot = hotbarSlots.indexOf(null);
      }

      if (slot === -1) {
        toast('Hotbar is full!');
        continue;
      }

      hotbarSlots[slot] = p.type;
      inventory[p.type] = count + 1;

      drops.remove(drop);
      renderHotbar();

      toast(`Collected ${p.type}: ${inventory[p.type]}/64`);
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

  if (!document.querySelector('#crafting').classList.contains('hidden')) {
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

  // Rotate the large crafting character preview.
  const bigAvatar = document.querySelector('.big-avatar');

  if (bigAvatar) {
    bigAvatar.style.transform =
      `rotateY(${nx * 30}deg) rotateX(${-ny * 15}deg)`;
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
    const type = hotbarSlots[selected];
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
      'planks'
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

    addBlock(x, y, z, type);

    inventory[type]--;

    if (inventory[type] <= 0) {
      inventory[type] = 0;
      hotbarSlots[selected] = null;
    }

    renderHotbar();
    triggerHandAction('place');
  }
});

document.addEventListener('mouseup', e => {
  if (e.button === 0) {
    miningHeld = false;
    miningTarget = null;
    miningTime = 0;
  }
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

  if (
    hardBlocks.includes(type) &&
    hotbarSlots[selected] !== 'woodenPickaxe'
  ) {
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
    ? 1.2
    : BLOCK_BREAK_TIME;

  if (miningTime >= breakTime) {
    const mesh = miningTarget;

    miningTarget = null;
    miningTime = 0;

    if (mesh.userData.type === 'tnt') {
      explode(mesh.position.clone());
    } else {
      destroyBlock(mesh);
    }
  }
}

// ==========================================
// FLINT AND STEEL CRAFTING
// ==========================================

// ==========================================
// BASIC CRAFTING RECIPES
// ==========================================

function createRecipe(id, name, ingredients, output, amount, color) {
  const recipes = document.querySelector('.craft-recipes');

  if (!recipes || document.getElementById(id)) return;

  const recipe = document.createElement('div');

  recipe.className = 'recipe';
  recipe.id = id;

  const ingredientText = ingredients
    .map(item => `${item.amount} ${item.type}`)
    .join(' + ');

  recipe.innerHTML = `
    <span class="recipe-icon" style="background:${color}"></span>

    <div>
      <b>${name}</b>
      <small>${ingredientText} → ${amount} ${output}</small>
    </div>

    <button type="button">CRAFT</button>
  `;

  recipes.appendChild(recipe);

  recipe.querySelector('button').onclick = () => {
    // Check all ingredients first.
    const hasIngredients = ingredients.every(item =>
      (inventory[item.type] || 0) >= item.amount
    );

    if (!hasIngredients) {
      toast(`Not enough materials for ${name}!`);
      return;
    }

    // Consume ingredients.
    ingredients.forEach(item => {
      removeInventoryItem(item.type, item.amount);
    });

    // Give the crafted item.
    if (!addInventoryItem(output, amount)) {
      // Restore ingredients if the output cannot fit.
      ingredients.forEach(item => {
        addInventoryItem(item.type, item.amount);
      });

      return;
    }

    toast(`Crafted ${amount} ${output}!`);
  };
}

function addCraftingRecipes() {

  // 1 Wood -> 4 Planks.
  createRecipe(
    'recipe-planks',
    'Wooden Planks',
    [{ type: 'wood', amount: 1 }],
    'planks',
    4,
    '#bd8b50'
  );

  // 2 Planks vertically -> 4 Sticks.
  createRecipe(
    'recipe-sticks',
    'Sticks',
    [{ type: 'planks', amount: 2 }],
    'sticks',
    4,
    '#c49a62'
  );

  // 3 Planks + 2 Sticks -> 1 Wooden Pickaxe.
  createRecipe(
    'recipe-wooden-pickaxe',
    'Wooden Pickaxe',
    [
      { type: 'planks', amount: 3 },
      { type: 'sticks', amount: 2 }
    ],
    'woodenPickaxe',
    1,
    '#a8753e'
  );
  // 1 Iron + 1 Flint -> 1 Flint and Steel.
  createRecipe(
    'recipe-flint-steel',
    'Flint and Steel',
    [
      { type: 'iron', amount: 1 },
      { type: 'flint', amount: 1 }
    ],
    'flintSteel',
    1,
    '#777777'
  );
}

addCraftingRecipes();

// ==========================================
// CRAFTING WINDOW
// ==========================================

function toggleCraft() {

  const panel = document.querySelector('#crafting');

  panel.classList.toggle('hidden');

  if (!panel.classList.contains('hidden')) {
    document.exitPointerLock?.();
  } else {
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
// GAME LOOP
// ==========================================

let last = performance.now();

function animate(now) {

  requestAnimationFrame(animate);

  const dt = Math.min((now - last) / 1000, 0.04);

  last = now;

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
