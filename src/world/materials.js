import * as THREE from 'three';

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function canvasTexture(paint) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  paint(canvas.getContext('2d'), seeded(2019));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Small, deterministic textures authored locally; no downloaded art assets. */
export function createWorldMaterials() {
  const stone = canvasTexture((ctx, random) => {
    ctx.fillStyle = '#505955';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 5; col++) {
        const x = col * 64 + (row % 2) * 32;
        const light = Math.floor(86 + random() * 24);
        ctx.fillStyle = `rgb(${light + 10},${light + 13},${light + 7})`;
        ctx.fillRect(x + 1, row * 32 + 1, 62, 30);
        ctx.fillStyle = '#b6ba9a33';
        ctx.fillRect(x + 2, row * 32 + 2, 60, 2);
      }
    }
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = random() > 0.5 ? '#dedcc114' : '#142f2520';
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1);
    }
  });
  const wood = canvasTexture((ctx, random) => {
    ctx.fillStyle = '#8c7653';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#987d57' : '#8d7451';
      ctx.fillRect(i * 32 + 1, 0, 30, 256);
      ctx.fillStyle = '#403d2f99';
      ctx.fillRect(i * 32, 0, 1, 256);
      for (let j = 0; j < 14; j++) {
        ctx.strokeStyle = random() > 0.5 ? '#332b2528' : '#d1ad7b35';
        ctx.beginPath();
        const x = i * 32 + random() * 30;
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 7, 90, x - 7, 160, x, 256);
        ctx.stroke();
      }
      ctx.fillStyle = '#494735';
      ctx.fillRect(i * 32 + 7, 15, 2, 2);
      ctx.fillRect(i * 32 + 25, 237, 2, 2);
    }
  });
  const tiles = canvasTexture((ctx) => {
    ctx.fillStyle = '#3f5554';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const gradient = ctx.createLinearGradient(col * 32, 0, col * 32 + 32, 0);
        gradient.addColorStop(0, '#2b4140');
        gradient.addColorStop(0.35, '#74837a');
        gradient.addColorStop(1, '#354c4a');
        ctx.fillStyle = gradient;
        ctx.fillRect(col * 32, row * 32, 32, 30);
        ctx.fillStyle = '#273d3b';
        ctx.fillRect(col * 32, row * 32 + 29, 32, 3);
      }
    }
  });
  const earth = canvasTexture((ctx, random) => {
    ctx.fillStyle = '#6b7054';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 3) {
      ctx.strokeStyle = `rgba(${50 + random() * 35},${57 + random() * 35},42,0.22)`;
      ctx.lineWidth = 1 + random() * 5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(80, y + random() * 10, 170, y - random() * 10, 256, y);
      ctx.stroke();
    }
    for (let i = 0; i < 1100; i++) {
      ctx.fillStyle = '#c0b18a20';
      ctx.fillRect(random() * 256, random() * 256, 2, 1);
    }
  });
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...extra });
  return {
    earth: standard('#d9bd78', { map: earth }),
    stone: standard('#e7dfc5', { map: stone }),
    paleStone: standard('#f1e9d2', { map: stone }),
    roof: standard('#769aaa', { map: tiles }),
    wood: standard('#d69a55', { map: wood }),
    darkWood: standard('#714738', { map: wood }),
    wall: standard('#f0dcad'),
    red: standard('#c54838'),
    gold: standard('#f2bd45', { metalness: 0.62, roughness: 0.24, emissive: '#a96b18', emissiveIntensity: 0.28 }),
    bamboo: standard('#3f9665'),
    bambooJoint: standard('#8abf6f'),
    leaf: standard('#2f8559'),
    lightLeaf: standard('#8fbf6e'),
    willow: standard('#68a86a'),
    grass: standard('#76a85a'),
    moss: standard('#7caa55'),
    bark: standard('#806143'),
    lantern: standard('#e5523f', { emissive: '#c03927', emissiveIntensity: 0.5 }),
    ivory: standard('#fff0be'),
    ink: standard('#263f48'),
    enemyFace: standard('#d8b386'),
    enemyCap: standard('#9a7357'),
    enemyElite: standard('#924940'),
    enemyBoot: standard('#4c483c'),
    spring: standard('#b7b29b', { metalness: 0.62, roughness: 0.35 }),
    flag: standard('#c78058', { side: THREE.DoubleSide }),
    hidden: standard('#b8a45e', { emissive: '#5a4d1d', emissiveIntensity: 0.17 }),
    mountain: standard('#76b7ad', { flatShading: true }),
    distantMountain: standard('#9dcdd2', { flatShading: true }),
    water: new THREE.MeshPhysicalMaterial({
      color: '#43abc0', transparent: true, opacity: 0.72, roughness: 0.22,
      metalness: 0.24, clearcoat: 0.85, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    }),
  };
}
