import * as THREE from 'three';

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);

function addBlock(scene, position, scale, color, roughness = 0.8) {
  const mesh = new THREE.Mesh(
    blockGeometry,
    new THREE.MeshStandardMaterial({ color, roughness }),
  );
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addCloud(scene, x, y, z, scale = 1) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [[-0.8, 0, 0], [0, 0.25, 0], [0.9, 0, 0], [0.2, -0.2, 0]].forEach(([cx, cy, cz], index) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(index === 1 ? 0.85 : 0.65, 12, 8), material);
    puff.position.set(cx, cy, cz);
    group.add(puff);
  });
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  scene.add(group);
}

export function createLevel(scene) {
  const platforms = [];
  const addPlatform = (x, y, width, color = 0xc8682c) => {
    const platform = addBlock(scene, [x, y, 0], [width, 1, 5], color);
    platform.userData.bounds = {
      minX: x - width / 2,
      maxX: x + width / 2,
      minY: y - 0.5,
      maxY: y + 0.5,
    };
    platforms.push(platform);

    const grass = addBlock(scene, [x, y + 0.53, 0], [width + 0.04, 0.08, 5.04], 0x46a83f, 1);
    grass.castShadow = false;
    return platform;
  };

  addPlatform(7, -0.5, 18);
  addPlatform(24, -0.5, 10);
  addPlatform(39, -0.5, 16);
  addPlatform(54, -0.5, 10);
  addPlatform(67, -0.5, 14);
  addPlatform(12, 3, 4, 0xe39b33);
  addPlatform(21, 2.2, 4, 0xe39b33);
  addPlatform(30, 4, 5, 0xe39b33);
  addPlatform(43, 2.5, 5, 0xe39b33);
  addPlatform(56, 3.8, 4, 0xe39b33);

  [5, 19, 35, 50, 64].forEach((x, index) => addCloud(scene, x, 8 + (index % 2), -7, 1 + (index % 3) * 0.15));

  const hillMaterial = new THREE.MeshStandardMaterial({ color: 0x43a95c, roughness: 1 });
  [2, 29, 48, 72].forEach((x, index) => {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(4 + index % 2, 7, 20), hillMaterial);
    hill.position.set(x, 1.5, -8);
    hill.receiveShadow = true;
    scene.add(hill);
  });

  return { platforms };
}

