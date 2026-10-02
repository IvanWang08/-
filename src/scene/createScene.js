import * as THREE from 'three';

export const CAMERA_LOCK = Object.freeze({ fov:55, near:.1, far:105, offsetX:0, offsetY:2.8, offsetZ:22, leadX:12.5, pitchDegrees:19.1 });
const desiredPosition = new THREE.Vector3();
const shakeOffset = new THREE.Vector3();

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd8ee);
  scene.fog = new THREE.FogExp2(0xc9e1df, 0.0125);
  const camera = new THREE.PerspectiveCamera(CAMERA_LOCK.fov, 1, CAMERA_LOCK.near, CAMERA_LOCK.far);
  camera.position.set(3 + CAMERA_LOCK.leadX, 1.1 + CAMERA_LOCK.offsetY, CAMERA_LOCK.offsetZ);
  camera.rotation.set(THREE.MathUtils.degToRad(-CAMERA_LOCK.pitchDegrees),0,0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x9fd8ee);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.26;
  container.appendChild(renderer.domElement);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(88,24,14),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 vPos; void main(){float h=clamp(normalize(vPos).y*.55+.48,0.,1.);vec3 warm=vec3(.98,.92,.76);vec3 cyan=vec3(.32,.72,.91);vec3 zenith=vec3(.18,.52,.82);vec3 c=mix(warm,cyan,smoothstep(.05,.55,h));c=mix(c,zenith,smoothstep(.62,1.,h));gl_FragColor=vec4(c,1.);}',
  }));
  sky.renderOrder=-10;scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xc8eeff, 0xc8955e, 3.25));
  const sun = new THREE.DirectionalLight(0xffd49b, 4.3);
  sun.position.set(-12, 23, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left:-20, right:20, top:22, bottom:-13, near:1, far:58 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.018;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0x8fd8ff, .95);
  fill.position.set(8,10,16);scene.add(fill);

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.8 ? 60 : CAMERA_LOCK.fov;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  }
  resize();
  window.addEventListener('resize', resize);

  let shake = 0, trackedY = 1.1;
  function updateCamera(player, dt, options = {}) {
    if (options.shake) shake = Math.max(shake, options.shake);
    shake = Math.max(0, shake - dt * 2.7);
    // Pose is immutable: input and facing never change yaw, pitch or roll.
    // Only the target translates. A 1.25-unit vertical dead zone filters small hops.
    const actorCenter = player.y + player.h * .5;
    if(options.snap) trackedY=actorCenter;
    else if(actorCenter>trackedY+1.25)trackedY=actorCenter-1.25;
    else if(actorCenter<trackedY-1.25)trackedY=actorCenter+1.25;
    desiredPosition.set(player.x + CAMERA_LOCK.leadX, trackedY + CAMERA_LOCK.offsetY, CAMERA_LOCK.offsetZ);
    // Colliders end at z ±1.6 while the lens stays at z=22, safely behind every
    // wall; the height clamp also prevents a low checkpoint from dragging it down.
    desiredPosition.y = Math.max(desiredPosition.y, 3.35);
    const smoothing = options.snap ? 1 : 1 - Math.exp(-dt * 4.6);
    camera.position.lerp(desiredPosition, smoothing);
    if (shake > 0) {
      const strength = shake * shake;
      shakeOffset.set(Math.sin(performance.now() * .073), Math.cos(performance.now() * .091), 0).multiplyScalar(strength * .14);
      camera.position.add(shakeOffset);
    }
    // Reassert the immutable pose every frame: only translation may change.
    camera.rotation.set(THREE.MathUtils.degToRad(-CAMERA_LOCK.pitchDegrees),0,0);
    sky.position.set(player.x,4,0);
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
