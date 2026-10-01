import * as THREE from 'three';

const desiredOffset = new THREE.Vector3(-10, 18, 14);
const desiredTarget = new THREE.Vector3();
const shakeOffset = new THREE.Vector3();

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa8b9ad);
  scene.fog = new THREE.FogExp2(0xa8b9ad, 0.0175);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 130);
  camera.position.copy(desiredOffset).add(new THREE.Vector3(3, 1.2, 0));

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0xa8b9ad);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xa9c8c1, 0x9c7b50, 2.15));
  const sun = new THREE.DirectionalLight(0xffd5a3, 3.7);
  sun.position.set(-12, 23, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left:-20, right:20, top:22, bottom:-13, near:1, far:58 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.8 ? 55 : 43;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  }
  resize();
  window.addEventListener('resize', resize);

  let shake = 0;
  function updateCamera(player, dt, options = {}) {
    if (options.shake) shake = Math.max(shake, options.shake);
    shake = Math.max(0, shake - dt * 2.7);
    const lookAhead = THREE.MathUtils.clamp((player.vx || 0) * 0.5, -2.8, 4.2);
    desiredTarget.set(player.x + lookAhead + 2.2, Math.max(1.8, player.y + 1.05), 0);
    const destination = desiredTarget.clone().add(desiredOffset);
    // Colliders end at z ±1.6 while the camera stays at z=14; the fixed view ray
    // therefore clears walls and this clamp keeps the lens above every roof.
    destination.y = Math.max(destination.y, 12.5);
    const smoothing = options.snap ? 1 : 1 - Math.exp(-dt * 4.6);
    camera.position.lerp(destination, smoothing);
    if (shake > 0) {
      const strength = shake * shake;
      shakeOffset.set(Math.sin(performance.now() * .073), Math.cos(performance.now() * .091), 0).multiplyScalar(strength * .14);
      camera.position.add(shakeOffset);
    }
    camera.lookAt(desiredTarget);
    sun.position.set(player.x - 12, player.y + 23, 12);
    sun.target.position.set(player.x + 4, player.y, 0);
    sun.target.updateMatrixWorld();
  }

  return { scene, camera, renderer, updateCamera, resize,
    dispose() {
      window.removeEventListener('resize', resize);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
