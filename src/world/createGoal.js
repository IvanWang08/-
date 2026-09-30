import * as THREE from 'three';

export function createGoal(scene) {
  const group = new THREE.Group();
  group.position.set(72, 0, 0);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 7, 12),
    new THREE.MeshStandardMaterial({ color: 0xf7f1da, metalness: 0.2, roughness: 0.45 }),
  );
  pole.position.y = 3.5;
  pole.castShadow = true;

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0xffd43b, metalness: 0.45, roughness: 0.3 }),
  );
  ball.position.y = 7.05;

  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(2.25, -0.75);
  flagShape.lineTo(0, -1.5);
  flagShape.closePath();
  const flag = new THREE.Mesh(
    new THREE.ShapeGeometry(flagShape),
    new THREE.MeshStandardMaterial({ color: 0xe6382f, side: THREE.DoubleSide, roughness: 0.75 }),
  );
  flag.position.set(0.12, 6.65, 0);
  flag.castShadow = true;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.8, 0.35, 16),
    new THREE.MeshStandardMaterial({ color: 0xededdf, roughness: 0.8 }),
  );
  base.position.y = 0.18;
  base.receiveShadow = true;

  group.add(pole, ball, flag, base);
  scene.add(group);

  return {
    reached(playerBounds) {
      return playerBounds.maxX > 71.75 && playerBounds.minX < 72.45;
    },
    update(elapsed) {
      flag.rotation.y = Math.sin(elapsed * 3) * 0.08;
    },
  };
}

