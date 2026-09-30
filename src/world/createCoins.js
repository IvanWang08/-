import * as THREE from 'three';

const COIN_LOCATIONS = [
  [6, 1.5], [11, 4.3], [13, 4.3], [21, 3.5], [28.5, 5.3],
  [31.5, 5.3], [38, 1.5], [42, 3.8], [44, 3.8], [55, 5.1],
  [61, 1.5], [67, 1.5],
];

export function createCoins(scene) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffd43b,
    emissive: 0x9b5d00,
    emissiveIntensity: 0.25,
    metalness: 0.35,
    roughness: 0.28,
  });

  const coins = COIN_LOCATIONS.map(([x, y], index) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.12, 8, 18), material);
    mesh.position.set(x, y, 0);
    mesh.castShadow = true;
    mesh.userData.baseY = y;
    mesh.userData.phase = index * 0.55;
    scene.add(mesh);
    return mesh;
  });

  function update(elapsed, playerBounds) {
    let collected = 0;
    coins.forEach((coin) => {
      if (!coin.visible) return;
      coin.rotation.y = elapsed * 3 + coin.userData.phase;
      coin.position.y = coin.userData.baseY + Math.sin(elapsed * 2.5 + coin.userData.phase) * 0.12;
      const overlaps = playerBounds.maxX > coin.position.x - 0.42
        && playerBounds.minX < coin.position.x + 0.42
        && playerBounds.maxY > coin.position.y - 0.42
        && playerBounds.minY < coin.position.y + 0.42;
      if (overlaps) {
        coin.visible = false;
        collected += 1;
      }
    });
    return collected;
  }

  function reset() {
    coins.forEach((coin) => { coin.visible = true; });
  }

  return { coins, update, reset };
}

