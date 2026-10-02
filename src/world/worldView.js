import * as THREE from 'three';
import { createWorldMaterials } from './materials.js';
import {groundedY,Z_LAYERS} from './layers.js';

const UP = new THREE.Vector3(0, 1, 0);
const TEMP = new THREE.Object3D();
const COLORS = { bamboo: '#64836a', village: '#ac946e', water: '#7b9280', palace: '#9b9d8a' };
const themeAt = (x) => x < 100 ? 'bamboo' : x < 200 ? 'village' : x < 300 ? 'water' : 'palace';
const hash = (value) => {
  let result = 2166136261;
  for (const char of String(value)) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
};
const randomGenerator = (seed) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

function roofGeometry() {
  const points = [], uv = [], indices = [];
  const sections = [-0.5, -0.38, -0.23, 0, 0.23, 0.38, 0.5];
  const heights = [0.17, 0.03, 0.31, 0.59, 0.31, 0.03, 0.17];
  for (let x = 0; x <= 8; x++) {
    const xx = x / 8 - 0.5;
    for (let z = 0; z < sections.length; z++) {
      points.push(xx, heights[z] + Math.pow(Math.abs(xx) * 2, 8) * 0.14, sections[z]);
      uv.push(x / 8, z / 6);
    }
  }
  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 6; z++) {
      const a = x * 7 + z, b = a + 7;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function geometries() {
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 7),
    cone: new THREE.ConeGeometry(0.5, 1, 5),
    sphere: new THREE.SphereGeometry(0.5, 12, 8),
    rock: new THREE.IcosahedronGeometry(0.5, 0),
    roof: roofGeometry(),
    ring: new THREE.TorusGeometry(0.34, 0.075, 5, 14),
    coin: new THREE.TorusGeometry(0.29, 0.09, 6, 12),
    coil: new THREE.TorusGeometry(0.42, 0.045, 4, 12),
    petal: new THREE.SphereGeometry(0.5, 6, 4),
  };
}

/** Every decorative shape in a chunk is combined by geometry/material. */
class BatchBuilder {
  constructor(group, geometry, materials) {
    this.group = group;
    this.geometry = geometry;
    this.materials = materials;
    this.batches = new Map();
  }
  add(shape, material, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const key = `${shape}:${material}`;
    if (!this.batches.has(key)) this.batches.set(key, []);
    TEMP.position.set(x, y, z);
    TEMP.scale.set(sx, sy, sz);
    TEMP.rotation.set(rx, ry, rz);
    TEMP.updateMatrix();
    this.batches.get(key).push(TEMP.matrix.clone());
  }
  line(material, x1, y1, z1, x2, y2, z2, width = 0.1) {
    const delta = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1);
    TEMP.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    TEMP.scale.set(width, delta.length(), width);
    TEMP.quaternion.setFromUnitVectors(UP, delta.normalize());
    TEMP.updateMatrix();
    const key = `cylinder:${material}`;
    if (!this.batches.has(key)) this.batches.set(key, []);
    this.batches.get(key).push(TEMP.matrix.clone());
  }
  build() {
    for (const [key, matrices] of this.batches) {
      const [shape, material] = key.split(':');
      const mesh = new THREE.InstancedMesh(this.geometry[shape], this.materials[material], matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.castShadow = !['grass', 'mountain', 'distantMountain', 'willow'].includes(material);
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }
  }
}

function bamboo(builder, random, x, z, height = 7) {
  const lean = (random() - 0.5) * 0.045;
  builder.add('cylinder', 'bamboo', x, height / 2 - 0.15, z, 0.11, height, 0.11, 0, 0, lean);
  for (let y = 0.8; y < height; y += 0.9) {
    builder.add('cylinder', 'bambooJoint', x - Math.sin(lean) * y, y - 0.15, z, 0.14, 0.065, 0.14);
    if (y < height * 0.35) continue;
    const side = Math.floor(y * 2) % 2 ? -1 : 1;
    for (let k = 0; k < 3; k++) {
      const angle = side * (0.7 + k * 0.23);
      const xx = x + side * (0.25 + k * 0.18);
      builder.add('cone', 'leaf', xx, y + 0.25 + k * 0.1, z + (random() - 0.5) * 0.4,
        0.18, 1 + random() * 0.6, 0.2, 0.25, random() * 2, -angle);
    }
  }
}

function willow(builder, random, x, z, scale = 1) {
  builder.add('cylinder', 'bark', x, 2.6 * scale, z, 0.48 * scale, 5.7 * scale, 0.48 * scale, 0, 0, -0.12);
  for (let side = -1; side <= 1; side += 2) {
    builder.line('bark', x + 0.3, 3.8 * scale, z, x + side * 2.3 * scale, 6 * scale, z, 0.24 * scale);
  }
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2;
    const xx = x + Math.cos(angle) * 1.9 * scale;
    const zz = z + Math.sin(angle) * 1.45 * scale;
    builder.add('sphere', 'willow', xx, (5.8 + random() * 0.6) * scale, zz, 3.4 * scale, 1.5 * scale, 2.6 * scale);
    for (let j = 0; j < 4; j++) {
      const length = 1.6 + random() * 2.5;
      builder.add('cone', 'willow', xx + (random() - 0.5) * 1.7 * scale, (5.3 - length / 2) * scale,
        zz + (random() - 0.5) * 1.5 * scale, 0.16 * scale, length * scale, 0.12 * scale, 0, 0, Math.PI);
    }
  }
}

function lantern(builder, x, y, z, scale = 1) {
  builder.add('cylinder', 'darkWood', x, y + 0.45 * scale, z, 0.035, 0.5 * scale, 0.035);
  builder.add('sphere', 'lantern', x, y, z, 0.53 * scale, 0.62 * scale, 0.5 * scale);
  builder.add('cylinder', 'gold', x, y + 0.29 * scale, z, 0.25 * scale, 0.08 * scale, 0.25 * scale);
  builder.add('cylinder', 'gold', x, y - 0.29 * scale, z, 0.23 * scale, 0.07 * scale, 0.23 * scale);
  builder.add('cone', 'red', x, y - 0.58 * scale, z, 0.14 * scale, 0.45 * scale, 0.14 * scale, 0, 0, Math.PI);
}

function building(builder, x, z, width = 8, height = 4.5, palace = false) {
  const depth = 5.1;
  builder.add('box', 'stone', x, 0.15, z, width + 0.55, 0.5, depth + 0.4);
  builder.add('box', 'wall', x, height / 2, z, width, height, depth);
  builder.add('roof', 'roof', x, height, z, width + 1.8, 2.25, depth + 2);
  for (const dz of [-1, 1]) builder.line('gold', x - width * 0.58, height + 0.28, z + dz * (depth * 0.68), x + width * 0.58, height + 0.28, z + dz * (depth * 0.68), 0.055);
  builder.add('cylinder', 'darkWood', x, height + 1.37, z, 0.2, width + 1.2, 0.2, 0, 0, Math.PI / 2);
  builder.add('box', palace ? 'red' : 'darkWood', x, height - 0.2, z + depth / 2 + 0.02, width, 0.22, 0.22);
  for (let side = -1; side <= 1; side += 2) {
    builder.add('cylinder', palace ? 'red' : 'darkWood', x + side * (width / 2 - 0.25), height / 2, z + depth / 2 + 0.12, 0.22, height, 0.22);
    const wx = x + side * width * 0.3;
    builder.add('box', 'darkWood', wx, height * 0.55, z + depth / 2 + 0.015, width * 0.19, height * 0.36, 0.1);
    for (let k = 0; k < 4; k++) {
      builder.add('box', 'wood', wx - width * 0.073 + k * width * 0.048, height * 0.55, z + depth / 2 + 0.09, 0.055, height * 0.34, 0.04);
    }
    builder.add('box', 'wood', wx, height * 0.55, z + depth / 2 + 0.1, width * 0.18, 0.08, 0.045);
    lantern(builder, x + side * 1.3, height - 0.7, z + depth / 2 + 0.65, palace ? 1.3 : 0.85);
  }
  builder.add('box', palace ? 'red' : 'darkWood', x, height * 0.33, z + depth / 2 + 0.025, 1.55, height * 0.66, 0.1);
  builder.add('box', 'wood', x, height * 0.35, z + depth / 2 + 0.1, 0.065, height * 0.65, 0.1);
  builder.add('sphere', 'gold', x - 0.16, height * 0.32, z + depth / 2 + 0.14, 0.1, 0.1, 0.07);
  builder.add('sphere', 'gold', x + 0.16, height * 0.32, z + depth / 2 + 0.14, 0.1, 0.1, 0.07);
  if (palace) {
    builder.add('box', 'wall', x, height + 1.05, z, width * 0.57, 1.4, depth * 0.61);
    builder.add('roof', 'roof', x, height + 1.8, z, width * 0.74, 1.9, depth * 0.83);
  }
}

function pavilion(builder, x, z, y = 0, width = 5) {
  builder.add('box', 'stone', x, y + 0.1, z, width + 0.7, 0.5, 4.4);
  for (const dx of [-1, 1]) {
    for (const dz of [-1, 1]) {
      builder.add('cylinder', 'red', x + dx * width * 0.37, y + 2.15, z + dz * 1.45, 0.2, 4, 0.2);
      builder.add('box', 'stone', x + dx * width * 0.37, y + 0.36, z + dz * 1.45, 0.43, 0.4, 0.43);
    }
    builder.add('box', 'red', x, y + 3.9, z + dx * 1.45, width * 0.85, 0.24, 0.24);
    lantern(builder, x + dx * width * 0.4, y + 3.4, z + 1.7, 0.85);
  }
  builder.add('roof', 'roof', x, y + 4, z, width + 1.1, 2, 5.3);
  builder.add('roof', 'roof', x, y + 5.02, z, width * 0.52, 1.6, 2.8);
  builder.add('sphere', 'gold', x, y + 6.1, z, 0.26, 0.5, 0.26);
}

function stoneLamp(builder, x, z) {
  builder.add('box', 'stone', x, 0.12, z, 0.65, 0.3, 0.65);
  builder.add('cylinder', 'stone', x, 0.64, z, 0.22, 0.85, 0.22);
  builder.add('box', 'stone', x, 1.04, z, 0.52, 0.16, 0.52);
  builder.add('box', 'ivory', x, 1.27, z, 0.3, 0.38, 0.3);
  builder.add('roof', 'stone', x, 1.48, z, 0.84, 0.45, 0.84);
}

function lanternString(builder, x, y, z, count = 5, spacing = 1.25) {
  const start = x - (count - 1) * spacing / 2;
  builder.line('darkWood', start - 0.35, y + 0.55, z, start + (count - 1) * spacing + 0.35, y + 0.55, z, 0.025);
  for (let i = 0; i < count; i++) lantern(builder, start + i * spacing, y, z, 0.58);
}

function stoneLion(builder, x, z, facing = 1) {
  builder.add('box', 'stone', x, 0.18, z, 1.15, 0.36, 1.05);
  builder.add('sphere', 'stone', x, 0.92, z, 0.9, 1.25, 0.85);
  builder.add('sphere', 'stone', x + facing * 0.12, 1.63, z, 0.72, 0.72, 0.72);
  builder.add('sphere', 'ivory', x + facing * 0.43, 1.68, z - 0.19, 0.11, 0.11, 0.08);
  builder.add('sphere', 'ivory', x + facing * 0.43, 1.68, z + 0.19, 0.11, 0.11, 0.08);
  for (const dz of [-0.31, 0.31]) builder.add('sphere', 'stone', x + facing * 0.36, 0.46, z + dz, 0.35, 0.28, 0.3);
  builder.add('ring', 'gold', x + facing * 0.51, 1.37, z, 0.48, 0.48, 0.48, 0, Math.PI / 2);
}

function lotusPlatform(builder, x, y, z, scale = 1) {
  builder.add('cylinder', 'stone', x, y + 0.13 * scale, z, 1.5 * scale, 0.26 * scale, 1.5 * scale);
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2;
    builder.add('petal', i % 2 ? 'ivory' : 'gold', x + Math.cos(angle) * 0.92 * scale, y + 0.38 * scale,
      z + Math.sin(angle) * 0.92 * scale, 0.75 * scale, 0.22 * scale, 0.42 * scale, 0, -angle, angle * 0.05);
  }
}

function ceremonialSet(builder, chunk, theme) {
  const center = (chunk.start + chunk.end) / 2;
  const z = -4.6;
  // Repeated silhouettes keep the Chinese visual language legible in every region.
  lanternString(builder, center, 4.1, z - 1.8, theme === 'palace' ? 7 : 5, 1.18);
  if (chunk.id % 2 === 0) {
    // War drum and paired standards.
    builder.add('cylinder', 'red', center, 1.15, z, 0.92, 0.85, 0.92, Math.PI / 2);
    builder.add('ring', 'gold', center, 1.15, z - 0.47, 1.32, 1.32, 1.32);
    for (const side of [-1, 1]) {
      builder.add('cylinder', 'darkWood', center + side * 2.25, 2.1, z, 0.07, 4.2, 0.07);
      builder.add('box', side < 0 ? 'red' : 'gold', center + side * 2.72, 3.05, z, 0.88, 1.55, 0.05, 0, 0, side * 0.08);
    }
  } else {
    // Sutra pillar with cloud curls and a lotus plinth.
    lotusPlatform(builder, center, 0, z, 0.62);
    builder.add('cylinder', 'stone', center, 1.72, z, 0.35, 3, 0.35);
    builder.add('roof', 'gold', center, 3.22, z, 1.25, 0.7, 1.25);
    for (const side of [-1, 1]) {
      builder.add('ring', side < 0 ? 'ivory' : 'gold', center + side * 1.05, 2.1, z, 0.85, 0.85, 0.85, Math.PI / 2);
      builder.add('sphere', 'ivory', center + side * 1.55, 2.1, z, 0.7, 0.28, 0.32);
    }
  }
  if (chunk.start === 0 || chunk.start === 100 || chunk.start === 300) {
    stoneLion(builder, chunk.start + 5.1, -3.9, 1);
    stoneLion(builder, chunk.start + 9.4, -3.9, -1);
  }
}

function backdrop(builder, chunk, level) {
  const random = randomGenerator(hash(chunk.id));
  const center = (chunk.start + chunk.end) / 2;
  const theme = themeAt(center);
  // A broad background bank sits behind the playable 3.2-unit-wide path.
  if (theme !== 'water') {
    builder.add('box', 'earth', center, -1.9, -12, chunk.end - chunk.start + 0.2, 3, 20);
    builder.add('box', 'moss', center, -0.35, -12, chunk.end - chunk.start + 0.2, 0.14, 20);
  }
  for (let i = 0; i < 5; i++) {
    builder.add('rock', 'mountain', chunk.start + random() * 25, 2 + random() * 4, Z_LAYERS.midDecoration.default-random()*14,
      12 + random() * 14, 10 + random() * 15, 10 + random() * 13, 0.06, random() * 4, 0);
    builder.add('rock', 'distantMountain', chunk.start + random() * 25, 5 + random() * 5, Z_LAYERS.farBackground.default-random()*14,
      19 + random() * 17, 20 + random() * 24, 15 + random() * 16, 0, random() * 4, 0.05);
  }
  if (theme === 'bamboo') {
    for (let i = 0; i < 17; i++) bamboo(builder, random, chunk.start + random() * 25, -4.5 - random() * 11, 5.5 + random() * 6.2);
    if (chunk.start % 75 === 0) pavilion(builder, center + 1, -9, -0.15, 4);
  } else if (theme === 'village') {
    building(builder, center - 5.8, -8.5, 8.5, 4.1 + random() * 1.5);
    building(builder, center + 7.5, -12, 7, 4.6);
    // Market awning, pottery and a hanging wine pennant.
    builder.add('box', 'wood', center + 3, 0.8, -4.6, 2.5, 0.18, 1.1);
    builder.add('box', 'red', center + 3, 2.25, -4.8, 2.9, 0.1, 1.55, 0.14);
    for (let dx = -1; dx <= 1; dx += 2) builder.add('cylinder', 'darkWood', center + 3 + dx * 1.13, 1.15, -4.8, 0.09, 2.3, 0.09);
    for (let j = 0; j < 4; j++) builder.add('sphere', 'stone', center + 2.2 + j * 0.52, 1.15, -4.6, 0.36, 0.58, 0.36);
    builder.add('cylinder', 'darkWood', center - 0.5, 1.8, -5, 0.1, 3.6, 0.1);
    builder.add('box', 'ivory', center - 0.05, 2.7, -5, 0.82, 1.15, 0.04);
    builder.add('box', 'ink', center - 0.05, 2.72, -4.97, 0.13, 0.63, 0.03);
    willow(builder, random, chunk.start + 1.3, -6.5, 0.85);
  } else if (theme === 'water') {
    builder.add('rock', 'moss', center - 5, -0.8, -11, 12, 2.8, 8);
    willow(builder, random, center - 5, -11, 1.05);
    if (chunk.start % 50 === 0) pavilion(builder, center + 6, -10, -0.25, 5);
    for (let i = 0; i < 10; i++) {
      const x = chunk.start + random() * 25;
      const z = -4 - random() * 3;
      for (let j = 0; j < 3; j++) {
        const height = 0.9 + random() * 1.2;
        builder.add('cylinder', 'grass', x + j * 0.14, height / 2 - 0.7, z, 0.035, height, 0.035, 0, 0, (random() - 0.5) * 0.3);
        builder.add('sphere', 'wood', x + j * 0.14, height - 0.7, z, 0.08, 0.37, 0.08);
      }
    }
  } else {
    building(builder, center, -12, 16, 6.3, true);
    for (let j = 0; j < 4; j++) stoneLamp(builder, chunk.start + 3 + j * 6, -3.7);
    for (let i = 0; i < 6; i++) bamboo(builder, random, chunk.start + random() * 25, -6.5 - random() * 3, 4.5 + random() * 2);
  }
  ceremonialSet(builder, chunk, theme);
  // Low silhouettes keep the camera-facing edge readable instead of occluding it.
  for (let i = 0; i < 55; i++) {
    const x = chunk.start + random() * 25;
    const z = i % 2 ? Z_LAYERS.nearDecoration.default-random()*2 : Z_LAYERS.foreground.default+random();
    const surface = theme === 'water' ? -0.85 : groundHeightAt(level,x,{fallback:0});
    if (theme === 'water' && z > 0) continue;
    const grassHeight=0.35+random()*0.5;
    builder.add('cone', 'grass', x, groundedY(level,x,grassHeight,{fallback:surface}), z, 0.35, grassHeight, 0.22, 0, random() * 6, (random() - 0.5) * 0.35);
    if (i % 7 === 0) builder.add('rock', 'stone', x, groundedY(level,x,.6,{fallback:surface}), z, 0.7, 0.6, 0.7, random()*.15, random(), random()*.15);
  }
}

function solidShape(builder, solid) {
  const { x, y, w, h, type } = solid;
  const top = y + h / 2;
  const material = type === 'wood' || type === 'moving' || type === 'crumble' ? 'wood'
    : type === 'roof' ? 'roof' : type === 'hidden' ? 'hidden' : type === 'ground' ? 'earth' : 'stone';
  builder.add('box', material, x, y, 0, w, h, 3.2);
  // The exact visual top and side limits remain the collision limits.
  if (type === 'ground') {
    // Caps sit fully above the collision mesh. Shared top faces previously caused
    // depth-buffer contention at shallow camera angles.
    builder.add('box', 'stone', x, top + 0.014, 0, w, 0.028, 2.65);
    for (let dx = -w / 2 + 0.35; dx < w / 2; dx += 1.15) {
      builder.add('box', 'moss', x + dx, top + 0.027, -1.43, Math.min(0.9, w), 0.022, 0.3);
      builder.add('box', 'stone', x + dx, top + 0.02, 1.43, Math.min(0.92, w), 0.018, 0.29);
    }
  } else if (type === 'roof') {
    builder.add('box', 'darkWood', x, y - h * 0.3, 1.56, w, h * 0.22, 0.07);
    builder.add('box', 'roof', x, top + 0.014, 0, w, 0.028, 3.2);
  } else if (type === 'wood' || type === 'crumble' || type === 'moving') {
    builder.add('box', 'darkWood', x, y - h * 0.29, -1.3, w, h * 0.35, 0.17);
    builder.add('box', 'darkWood', x, y - h * 0.29, 1.3, w, h * 0.35, 0.17);
    if(type==='moving')builder.add('box','gold',x,top+0.018,0,w*.88,0.026,2.55);
  }
}

function addMechanism(builder, mechanism) {
  const { x, y, type } = mechanism;
  if (type === 'spring') {
    builder.add('box', 'darkWood', x, y + 0.06, 0, 1.2, 0.12, 1.4);
    for (let j = 0; j < 4; j++) builder.add('coil', 'spring', x, y + 0.13 + j * 0.12, 0, 1, 1, 1, Math.PI / 2);
    builder.add('box', 'red', x, y + 0.57, 0, 1.12, 0.13, 1.3);
    builder.add('box', 'gold', x, y + 0.642, 0, 0.55, 0.015, 0.7);
  } else if (type === 'pipe') {
    // Open moon-gate / bamboo-pipe portal: walk inside and press down.
    for (const z of [-1.42, 1.42]) {
      builder.add('cylinder', 'bamboo', x, y + 1.15, z, 0.24, 2.3, 0.24);
      builder.add('cylinder', 'gold', x, y + 0.25, z, 0.29, 0.12, 0.29);
      builder.add('cylinder', 'gold', x, y + 1.85, z, 0.29, 0.12, 0.29);
    }
    builder.add('box', 'bamboo', x, y + 2.35, 0, 0.32, 0.23, 3.15);
    builder.add('roof', 'roof', x, y + 2.48, 0, 3.75, 0.8, 1.2, 0, Math.PI / 2);
    builder.add('box', 'gold', x, y + 0.012, 0, 1.15, 0.024, 2.4);
    builder.add('box', 'bamboo', x, y + 0.027, 0, 0.87, 0.02, 2.1);
  }
}

function makeTextLabel(text, color = '#d5bc89', width = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 52px "Noto Serif SC", "Microsoft YaHei", serif';
  ctx.fillText(text, width / 2, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
}

function checkpointView(point, geometry, materials) {
  const group = new THREE.Group();
  const builder = new BatchBuilder(group, geometry, materials);
  builder.add('box', 'stone', point.x, point.y + 0.45, -2.15, 0.72, 0.95, 0.5);
  builder.add('rock', 'stone', point.x, point.y + 0.98, -2.15, 0.75, 0.4, 0.5);
  builder.add('cylinder', 'darkWood', point.x + 0.6, point.y + 1.45, -2.3, 0.07, 2.9, 0.07);
  builder.build();
  const flagMaterial = materials.flag.clone();
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.58, 4, 1), flagMaterial);
  flag.position.set(point.x + 1.09, point.y + 2.53, -2.3);
  group.add(flag);
  return { group, flag, material: flagMaterial };
}

function goalView(goal, geometry, materials) {
  const group = new THREE.Group();
  const builder = new BatchBuilder(group, geometry, materials);
  const { x, y } = goal;
  for (const z of [-2.35, 2.35]) {
    builder.add('box', 'stone', x, y + 0.22, z, 0.95, 0.5, 0.95);
    builder.add('cylinder', 'red', x, y + 3.1, z, 0.34, 5.9, 0.34);
    builder.add('cylinder', 'gold', x, y + 0.62, z, 0.4, 0.15, 0.4);
    lantern(builder, x - 0.7, y + 4.6, z, 1.22);
  }
  builder.add('box', 'red', x, y + 5.6, 0, 0.5, 0.65, 5.7);
  builder.add('roof', 'roof', x, y + 5.95, 0, 7.5, 1.5, 3, 0, Math.PI / 2);
  builder.add('box', 'ink', x - 0.32, y + 5.5, 0, 0.13, 0.7, 2.5);
  builder.build();
  const title = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 0.58), makeTextLabel('长乐未央'));
  title.position.set(x - 0.395, y + 5.5, 0);
  title.rotation.y = -Math.PI / 2;
  group.add(title);
  return group;
}

function dynamicInstances(geometry, material, count, group) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
function setInstance(mesh, index, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  TEMP.position.set(x, y, z);
  TEMP.scale.set(sx, sy, sz);
  TEMP.rotation.set(rx, ry, rz);
  TEMP.updateMatrix();
  mesh.setMatrixAt(index, TEMP.matrix);
}

function createWater(material) {
  const geometry = new THREE.PlaneGeometry(135, 30, 100, 20);
  geometry.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geometry, material);
  water.position.set(251, -0.85, -3.5);
  water.receiveShadow = true;
  const basePositions = geometry.attributes.position.array.slice();
  return {
    mesh: water,
    update(time) {
      const positions = geometry.attributes.position;
      for (let index = 0; index < positions.count; index++) {
        const x = basePositions[index * 3], z = basePositions[index * 3 + 2];
        positions.setY(index, Math.sin(x * 0.48 + time * 1.05) * 0.055 + Math.cos(z * 1.1 + x * 0.17 + time * 0.8) * 0.035);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    },
  };
}

function createLeaves() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(90 * 3);
  const colors = new Float32Array(90 * 3);
  const random = randomGenerator(8723);
  const phases = [];
  for (let i = 0; i < 90; i++) {
    phases.push({ x: random() * 75 - 37.5, y: random() * 13, z: random() * 13 - 10, speed: 0.28 + random() * 0.45 });
    const color = new THREE.Color(i % 3 ? '#bbaa73' : '#b87c54');
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.68, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    update(x, time) {
      phases.forEach((phase, index) => {
        positions[index * 3] = x + phase.x + Math.sin(time * 0.3 + index) * 2;
        positions[index * 3 + 1] = ((phase.y - time * phase.speed) % 13 + 13) % 13 - 0.4;
        positions[index * 3 + 2] = phase.z + Math.sin(time * 0.45 + index * 2) * 0.6;
      });
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

/** Render only: simulation AABBs are the single source of gameplay geometry. */
export function createWorldView(scene, level) {
  const materials = createWorldMaterials();
  materials.roof.side = THREE.DoubleSide;
  const geometry = geometries();
  const root = new THREE.Group();
  root.name = 'Procedural Jianghu';
  scene.add(root);
  const chunks = [], dynamicSolids = new Map();
  const levelChunks = level.chunks?.length ? level.chunks : Array.from({ length: Math.ceil(level.length / 25) }, (_, i) => ({ id: i, start: i * 25, end: (i + 1) * 25 }));
  const movingTypes = new Set(['moving', 'crumble', 'hidden']);
  for (const chunk of levelChunks) {
    const group = new THREE.Group();
    group.name = `Landscape ${chunk.id}`;
    const builder = new BatchBuilder(group, geometry, materials);
    backdrop(builder, chunk, level);
    for (const solid of level.solids) {
      if (solid.x < chunk.start || solid.x >= chunk.end) continue;
      if (movingTypes.has(solid.type) || solid.hidden) {
        const solidGroup = new THREE.Group();
        const dynamicBuilder = new BatchBuilder(solidGroup, geometry, materials);
        solidShape(dynamicBuilder, { ...solid, x: 0, y: 0 });
        dynamicBuilder.build();
        if(solid.type==='moving')solidGroup.traverse(object=>{if(object.isMesh)object.castShadow=false;});
        solidGroup.position.set(solid.x, solid.y, 0);
        solidGroup.visible = !solid.hidden && solid.type !== 'hidden';
        dynamicSolids.set(solid.id, solidGroup);
        root.add(solidGroup);
      } else solidShape(builder, solid);
    }
    for (const mechanism of level.mechanisms || []) {
      if (mechanism.x >= chunk.start && mechanism.x < chunk.end) addMechanism(builder, mechanism);
    }
    builder.build();
    root.add(group);
    chunks.push({ ...chunk, group });
  }

  const coinCount = level.coins.length;
  const coins = dynamicInstances(geometry.coin, materials.gold, coinCount, root);
  const coinCenters = dynamicInstances(geometry.box, materials.gold, coinCount, root);
  coins.castShadow = coinCenters.castShadow = false;
  const enemyCount = level.enemies.length;
  const caps = dynamicInstances(geometry.sphere, materials.enemyCap, enemyCount, root);
  const faces = dynamicInstances(geometry.sphere, materials.enemyFace, enemyCount, root);
  const feet = dynamicInstances(geometry.sphere, materials.enemyBoot, enemyCount * 2, root);
  const eyes = dynamicInstances(geometry.sphere, materials.ivory, enemyCount * 2, root);
  const pupils = dynamicInstances(geometry.sphere, materials.ink, enemyCount * 2, root);
  const brows = dynamicInstances(geometry.box, materials.enemyBoot, enemyCount * 2, root);
  const eliteRings = dynamicInstances(geometry.ring, materials.gold, enemyCount, root);
  const enemyParts = [caps, faces, feet, eyes, pupils, brows, eliteRings];
  level.enemies.forEach((enemy, index) => caps.setColorAt(index, new THREE.Color((enemy.hp || 1) > 1 ? '#b26250' : '#d0b298')));

  const checkpoints = (level.checkpoints || []).map((point) => {
    const view = checkpointView(point, geometry, materials);
    root.add(view.group);
    return { ...view, point };
  });
  const goal = goalView(level.goal, geometry, materials);
  root.add(goal);
  const water = createWater(materials.water);
  root.add(water.mesh);
  const leaves = createLeaves();
  root.add(leaves.points);
  let frame = 0;
  const capColor = new THREE.Color();

  function update(sim, dt = 1 / 60, time = 0) {
    const playerX = sim.player?.x ?? 0;
    for (const chunk of chunks) chunk.group.visible = chunk.end > playerX - 65 && chunk.start < playerX + 80;
    for (const solid of sim.solids || level.solids) {
      const group = dynamicSolids.get(solid.id);
      if (!group) continue;
      group.visible = Math.abs(solid.x - playerX) < 76 && solid.enabled !== false && (!(solid.hidden || solid.type === 'hidden') || solid.revealed);
      const alpha=sim.renderAlpha??1;
      const renderX=solid.type==='moving'?THREE.MathUtils.lerp(solid.previousX??solid.x,solid.x,alpha):solid.x;
      const renderY=solid.type==='moving'?THREE.MathUtils.lerp(solid.previousY??solid.y,solid.y,alpha):solid.y;
      group.position.set(renderX, renderY, 0);
      if (solid.type === 'crumble' && solid.timer > 0) group.rotation.z = Math.sin(time * 58) * 0.012;
      else group.rotation.z = 0;
    }
    (sim.coins || level.coins).forEach((coin, index) => {
      const visible = !coin.collected && Math.abs(coin.x - playerX) < 72 && (!coin.hidden || coin.revealed);
      const scale = visible ? 1 : 0;
      const bob = Math.sin(time * 2.7 + index * 0.72) * 0.085;
      setInstance(coins, index, coin.x, coin.y + bob, 0, scale, scale, scale, 0.08, time * 1.6 + index * 0.4);
      // A small square center suggests a traditional cash coin at game scale.
      setInstance(coinCenters, index, coin.x, coin.y + bob, 0, scale * 0.12, scale * 0.12, scale * 0.05, 0.08, time * 1.6 + index * 0.4);
    });
    coins.instanceMatrix.needsUpdate = coinCenters.instanceMatrix.needsUpdate = true;
    (sim.enemies || level.enemies).forEach((enemy, index) => {
      const original = level.enemies[index] || enemy;
      const elite = (original.hp || 1) >= 3;
      const visible = (enemy.alive !== false || enemy.squash > 0) && Math.abs(enemy.x - playerX) < 72;
      const size = visible ? (enemy.w || (elite ? 1.4 : 0.9)) : 0;
      const height = (enemy.h || (elite ? 1.55 : 0.95));
      const flat = enemy.alive === false ? Math.max(0.08, Math.min(0.2, enemy.squash || 0.12)) : 1;
      const walk = Math.sin(time * 8 + index) * 0.07 * size;
      const faceY = enemy.y + height * 0.4 * flat;
      setInstance(caps, index, enemy.x, enemy.y + height * 0.73 * flat, 0, size * 1.1, height * 0.67 * flat, size * 0.96);
      setInstance(faces, index, enemy.x, faceY, 0.14, size * 0.84, height * 0.7 * flat, size * 0.75);
      for (let side = 0; side < 2; side++) {
        const sign = side ? 1 : -1;
        const eyeX = enemy.x + sign * size * 0.16;
        setInstance(feet, index * 2 + side, enemy.x + sign * size * 0.28, enemy.y + 0.11 * flat, 0.05 + walk * sign, size * 0.42, height * 0.22 * flat, size * 0.57);
        setInstance(eyes, index * 2 + side, eyeX, enemy.y + height * 0.5 * flat, size * 0.385, size * 0.2, height * 0.27 * flat, size * 0.1);
        setInstance(pupils, index * 2 + side, eyeX - size * 0.015, enemy.y + height * 0.49 * flat, size * 0.431, size * 0.079, height * 0.16 * flat, size * 0.05);
        setInstance(brows, index * 2 + side, eyeX, enemy.y + height * 0.642 * flat, size * 0.439, size * 0.26, height * 0.066 * flat, size * 0.08, 0, 0, sign * 0.23);
      }
      const ringSize = elite && visible ? size * 1.08 : 0;
      setInstance(eliteRings, index, enemy.x, enemy.y + height * 0.9 * flat, 0, ringSize, ringSize, ringSize, Math.PI / 2);
      if (elite) {
        capColor.set((enemy.hp || 0) < (original.hp || 3) ? '#eaa37b' : '#b26250');
        caps.setColorAt(index, capColor);
      }
    });
    for (const part of enemyParts) part.instanceMatrix.needsUpdate = true;
    if (caps.instanceColor) caps.instanceColor.needsUpdate = true;
    checkpoints.forEach(({ point, group, flag, material }, index) => {
      group.visible = Math.abs(point.x - playerX) < 74;
      material.color.set(index <= (sim.checkpointIndex ?? 0) ? '#dab35f' : '#8a856d');
      flag.rotation.y = Math.sin(time * 1.9 + index) * 0.13;
    });
    goal.visible = playerX > level.goal.x - 78;
    water.mesh.visible = playerX > 150 && playerX < 354;
    if (water.mesh.visible && frame++ % 3 === 0) water.update(time);
    leaves.update(playerX, time);
  }

  update({ player: { x: 0 }, solids: level.solids, coins: level.coins, enemies: level.enemies }, 0, 0);
  return {
    update,
    root,
    dispose() {
      scene.remove(root);
      const uniqueGeometries = new Set();
      const uniqueMaterials = new Set();
      root.traverse((object) => {
        if (object.geometry) uniqueGeometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.filter(Boolean).forEach((material) => uniqueMaterials.add(material));
      });
      uniqueGeometries.forEach((item) => item.dispose());
      uniqueMaterials.forEach((item) => { item.map?.dispose(); item.dispose(); });
    },
  };
}
