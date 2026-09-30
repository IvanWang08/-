import * as THREE from 'three';

const PLAYER_WIDTH = 0.9;
const PLAYER_HEIGHT = 1.6;

function box(width, height, depth, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildMario() {
  const group = new THREE.Group();
  const legs = box(0.76, 0.58, 0.7, 0x2451a4);
  legs.position.y = 0.29;
  const torso = box(0.86, 0.62, 0.72, 0xe4372c);
  torso.position.y = 0.88;
  const head = box(0.7, 0.56, 0.68, 0xffc28a);
  head.position.y = 1.45;
  const cap = box(0.8, 0.25, 0.76, 0xd92121);
  cap.position.set(0, 1.78, 0);
  const brim = box(0.28, 0.1, 0.82, 0xd92121);
  brim.position.set(0.28, 1.65, 0);
  const nose = box(0.18, 0.2, 0.18, 0xf0a36f);
  nose.position.set(0.43, 1.42, 0);
  group.add(legs, torso, head, cap, brim, nose);
  return group;
}

export function createPlayer(scene, platforms) {
  const mesh = buildMario();
  scene.add(mesh);

  const spawn = new THREE.Vector3(2, 0.02, 0);
  const velocity = new THREE.Vector2();
  const keys = new Set();
  let grounded = false;
  let jumpHeldTime = 0;
  let facing = 1;

  const onKeyDown = (event) => {
    keys.add(event.code);
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code)) event.preventDefault();
  };
  const onKeyUp = (event) => keys.delete(event.code);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function reset(position = spawn) {
    mesh.position.copy(position);
    velocity.set(0, 0);
    grounded = false;
    jumpHeldTime = 0;
  }

  function getBounds() {
    return {
      minX: mesh.position.x - PLAYER_WIDTH / 2,
      maxX: mesh.position.x + PLAYER_WIDTH / 2,
      minY: mesh.position.y,
      maxY: mesh.position.y + PLAYER_HEIGHT,
    };
  }

  function update(delta) {
    const moveLeft = keys.has('ArrowLeft') || keys.has('KeyA');
    const moveRight = keys.has('ArrowRight') || keys.has('KeyD');
    const wantsJump = keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW');
    const targetSpeed = (Number(moveRight) - Number(moveLeft)) * 7.5;
    const acceleration = grounded ? 30 : 18;
    velocity.x = THREE.MathUtils.damp(velocity.x, targetSpeed, acceleration, delta);

    if (Math.abs(targetSpeed) > 0.1) facing = Math.sign(targetSpeed);
    mesh.rotation.y = facing === 1 ? 0 : Math.PI;

    if (wantsJump && grounded) {
      velocity.y = 10.8;
      grounded = false;
      jumpHeldTime = 0;
    }
    if (wantsJump && velocity.y > 0 && jumpHeldTime < 0.18) {
      velocity.y += 17 * delta;
      jumpHeldTime += delta;
    }
    if (!wantsJump) jumpHeldTime = 1;

    velocity.y -= 26 * delta;
    const previousBottom = mesh.position.y;
    mesh.position.x += velocity.x * delta;
    mesh.position.y += velocity.y * delta;
    mesh.position.x = Math.max(-1, mesh.position.x);

    grounded = false;
    if (velocity.y <= 0) {
      const bounds = getBounds();
      for (const platform of platforms) {
        const p = platform.userData.bounds;
        const overlapsX = bounds.maxX > p.minX + 0.08 && bounds.minX < p.maxX - 0.08;
        const crossedTop = previousBottom >= p.maxY - 0.08 && mesh.position.y <= p.maxY;
        if (overlapsX && crossedTop) {
          mesh.position.y = p.maxY;
          velocity.y = 0;
          grounded = true;
          break;
        }
      }
    }

    if (grounded && Math.abs(velocity.x) > 0.2) {
      mesh.rotation.z = Math.sin(performance.now() * 0.018) * 0.035;
    } else {
      mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, 0, 12, delta);
    }

    return { fell: mesh.position.y < -10 };
  }

  reset();
  return { mesh, velocity, update, reset, getBounds, isGrounded: () => grounded };
}
