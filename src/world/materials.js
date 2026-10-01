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
    earth: standard('#b7ae86', { map: earth }),
    stone: standard('#d4d1b3', { map: stone }),
    paleStone: standard('#c1c1ab', { map: stone }),
    roof: standard('#bfcebe', { map: tiles }),
    wood: standard('#d2bb92', { map: wood }),
    darkWood: standard('#5b4939', { map: wood }),
    wall: standard('#c6b99a'),
    red: standard('#8e483d'),
    gold: standard('#dcb765', { metalness: 0.58, roughness: 0.28, emissive: '#714719', emissiveIntensity: 0.15 }),
    bamboo: standard('#597c55'),
    bambooJoint: standard('#859667'),
    leaf: standard('#466c52'),
    lightLeaf: standard('#7c9363'),
    willow: standard('#637e57'),
    grass: standard('#687954'),
    moss: standard('#697754'),
    bark: standard('#645c48'),
    lantern: standard('#bc6349', { emissive: '#b65331', emissiveIntensity: 0.22 }),
    ivory: standard('#e1d5ae'),
    ink: standard('#263c35'),
    enemyFace: standard('#d8b386'),
    enemyCap: standard('#9a7357'),
    enemyElite: standard('#924940'),
    enemyBoot: standard('#4c483c'),
    spring: standard('#b7b29b', { metalness: 0.62, roughness: 0.35 }),
    flag: standard('#c78058', { side: THREE.DoubleSide }),
    hidden: standard('#b8a45e', { emissive: '#5a4d1d', emissiveIntensity: 0.17 }),
    mountain: standard('#718e80', { flatShading: true }),
    distantMountain: standard('#90a499', { flatShading: true }),
    water: new THREE.MeshPhysicalMaterial({
      color: '#577f7a', transparent: true, opacity: 0.74, roughness: 0.27,
      metalness: 0.24, clearcoat: 0.85, side: THREE.DoubleSide,
    }),
  };
}
