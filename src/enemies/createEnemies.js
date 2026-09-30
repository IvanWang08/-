import * as THREE from 'three';

function makeGoomba() {
  const group = new THREE.Group();
  const brown = new THREE.MeshStandardMaterial({ color: 0x8b4526, roughness: 0.9 });
  const tan = new THREE.MeshStandardMaterial({ color: 0xe8b878, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const black = new THREE.MeshStandardMaterial({ color: 0x16120e });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 8), brown);
  body.scale.y = 0.78;
  body.position.y = 0.5;
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.6), tan);
  const rightFoot = leftFoot.clone();
  leftFoot.position.set(-0.28, 0.1, 0);
  rightFoot.position.set(0.28, 0.1, 0);

  [-0.17, 0.17].forEach((z) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.08), white);
    eye.position.set(0.4, 0.63, z);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.025), black);
    pupil.position.set(0.465, 0.63, z);
    group.add(eye, pupil);
  });

  group.add(body, leftFoot, rightFoot);
  group.userData.feet = [leftFoot, rightFoot];
  group.traverse((child) => { if (child.isMesh) child.castShadow = true; });
  return group;
}

const SPAWNS = [
  { x: 13.8, y: 0, minX: 10, maxX: 15.3 },
  { x: 24, y: 0, minX: 20, maxX: 28 },
  { x: 30, y: 4.5, minX: 28, maxX: 32 },
  { x: 42, y: 0, minX: 35, maxX: 46 },
  { x: 57, y: 0, minX: 53, maxX: 58 },
  { x: 66, y: 0, minX: 61, maxX: 71 },
];

export function createEnemies(scene) {
  const enemies = SPAWNS.map((spawn, index) => {
    const mesh = makeGoomba();
    mesh.position.set(spawn.x, spawn.y, 0);
    scene.add(mesh);
    return {
      mesh,
      minX: spawn.minX,
      maxX: spawn.maxX,
      direction: index % 2 ? -1 : 1,
      speed: 1.6 + (index % 3) * 0.2,
      defeated: false,
      fallSpeed: 0,
      contactCooldown: 0,
    };
  });

  function update(delta, elapsed) {
    enemies.forEach((enemy, index) => {
      if (!enemy.mesh.visible) return;
      enemy.contactCooldown = Math.max(0, enemy.contactCooldown - delta);
      if (enemy.defeated) {
        enemy.fallSpeed -= 24 * delta;
        enemy.mesh.position.y += enemy.fallSpeed * delta;
        enemy.mesh.rotation.z += delta * 8 * enemy.direction;
        if (enemy.mesh.position.y < -10) enemy.mesh.visible = false;
        return;
      }

      enemy.mesh.position.x += enemy.direction * enemy.speed * delta;
      if (enemy.mesh.position.x <= enemy.minX || enemy.mesh.position.x >= enemy.maxX) {
        enemy.mesh.position.x = THREE.MathUtils.clamp(enemy.mesh.position.x, enemy.minX, enemy.maxX);
        enemy.direction *= -1;
      }
      enemy.mesh.rotation.y = enemy.direction === 1 ? 0 : Math.PI;
      enemy.mesh.userData.feet[0].position.y = 0.1 + Math.sin(elapsed * 12 + index) * 0.035;
      enemy.mesh.userData.feet[1].position.y = 0.1 - Math.sin(elapsed * 12 + index) * 0.035;
    });
  }

  function reset() {
    enemies.forEach((enemy, index) => {
      const spawn = SPAWNS[index];
      enemy.mesh.position.set(spawn.x, spawn.y, 0);
      enemy.mesh.rotation.set(0, 0, 0);
      enemy.mesh.visible = true;
      enemy.defeated = false;
      enemy.fallSpeed = 0;
      enemy.contactCooldown = 0;
    });
  }

  function checkPlayerCollision(playerBounds, playerVelocity) {
    let stomped = 0;
    let hit = false;

    enemies.forEach((enemy) => {
      if (!enemy.mesh.visible || enemy.defeated || enemy.contactCooldown > 0) return;
      const minX = enemy.mesh.position.x - 0.48;
      const maxX = enemy.mesh.position.x + 0.48;
      const minY = enemy.mesh.position.y;
      const maxY = enemy.mesh.position.y + 0.9;
      const overlaps = playerBounds.maxX > minX
        && playerBounds.minX < maxX
        && playerBounds.maxY > minY
        && playerBounds.minY < maxY;
      if (!overlaps) return;

      const landingFromAbove = playerVelocity.y < -1.2 && playerBounds.minY > minY + 0.42;
      if (landingFromAbove) {
        enemy.defeated = true;
        enemy.fallSpeed = 3.5;
        playerVelocity.y = 8.2;
        stomped += 1;
      } else {
        enemy.contactCooldown = 1.25;
        const knockDirection = playerBounds.minX < enemy.mesh.position.x ? -1 : 1;
        playerVelocity.x = knockDirection * 8;
        playerVelocity.y = 5.5;
        hit = true;
      }
    });

    return { stomped, hit };
  }

  return { enemies, update, reset, checkPlayerCollision };
}
