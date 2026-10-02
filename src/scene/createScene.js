import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

export const CAMERA_LOCK = Object.freeze({ fov:55, near:.1, far:105, offsetX:0, offsetY:2.8, offsetZ:22, leadX:12.5, pitchDegrees:19.1 });
const desiredPosition = new THREE.Vector3();
const shakeOffset = new THREE.Vector3();

export function createScene(container) {
  const query=new URLSearchParams(location.search),performanceMode=query.get('performance')==='1';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x243638);
  scene.fog = new THREE.FogExp2(0x34484a, 0.016);
  const camera = new THREE.PerspectiveCamera(CAMERA_LOCK.fov, 1, CAMERA_LOCK.near, CAMERA_LOCK.far);
  camera.position.set(3 + CAMERA_LOCK.leadX, 1.1 + CAMERA_LOCK.offsetY, CAMERA_LOCK.offsetZ);
  camera.rotation.set(THREE.MathUtils.degToRad(-CAMERA_LOCK.pitchDegrees),0,0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x243638);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  // Three r186 removed PCFSoftShadowMap and falls back with a console warning.
  // PCFShadowMap is the supported filtered shadow path in this release.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  // The composer uses several full-screen passes. Reset once per rendered frame
  // so renderer.info reports the complete scene cost instead of the final pass.
  renderer.info.autoReset = false;
  container.appendChild(renderer.domElement);

  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const gradePass=new ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D tDiffuse;uniform float time;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+time)*43758.5453);}void main(){vec2 d=vUv-.5;float edge=smoothstep(.82,.18,length(d));float ca=.00055*length(d);float r=texture2D(tDiffuse,vUv+vec2(ca,0.)).r;float g=texture2D(tDiffuse,vUv).g;float b=texture2D(tDiffuse,vUv-vec2(ca,0.)).b;vec3 c=vec3(r,g,b);c*=mix(.8,1.,edge);c+=(hash(gl_FragCoord.xy)-.5)/255.*1.7;gl_FragColor=vec4(c,1.);}`});composer.addPass(gradePass);composer.addPass(new OutputPass());

  const sky = new THREE.Mesh(new THREE.SphereGeometry(88,24,14),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 vPos; void main(){float h=clamp(normalize(vPos).y*.55+.48,0.,1.);vec3 dusk=vec3(.16,.20,.18);vec3 cyan=vec3(.19,.32,.34);vec3 zenith=vec3(.08,.14,.17);vec3 c=mix(dusk,cyan,smoothstep(.05,.55,h));c=mix(c,zenith,smoothstep(.62,1.,h));gl_FragColor=vec4(c,1.);}',
  }));
  sky.renderOrder=-10;scene.add(sky);
  scene.add(new THREE.HemisphereLight(0x83b4bd, 0x342d25, 2.7));
  const sun = new THREE.DirectionalLight(0xe8a65f, 5.1);
  sun.position.set(-15, 21, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left:-20, right:20, top:22, bottom:-13, near:1, far:58 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.018;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0x6caeb7, 1.05);
  fill.position.set(8,10,16);scene.add(fill);

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.8 ? 60 : CAMERA_LOCK.fov;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const quality4K=query.get('quality')==='4k';
    renderer.setPixelRatio(quality4K?Math.max(1,3840/width):Math.min(window.devicePixelRatio,1.5));
    composer.setSize(width,height);
  }

  function render(time=0){renderer.info.reset();gradePass.uniforms.time.value=time;if(performanceMode)renderer.render(scene,camera);else composer.render();}
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

  function capture4K(filename='scene.png') {
    const size=renderer.getSize(new THREE.Vector2()),pixelRatio=renderer.getPixelRatio(),aspect=camera.aspect;
    renderer.setPixelRatio(1);renderer.setSize(3840,2160,false);camera.aspect=16/9;camera.updateProjectionMatrix();
    composer.setSize(3840,2160);renderer.info.reset();gradePass.uniforms.time.value=0;composer.render();
    return new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>{
      renderer.setPixelRatio(pixelRatio);renderer.setSize(size.x,size.y,false);composer.setSize(size.x,size.y);camera.aspect=aspect;camera.updateProjectionMatrix();
      if(!blob){reject(new Error('Unable to encode 4K capture'));return;}
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);resolve();
    },'image/png'));
  }

  return { scene, camera, renderer, updateCamera, resize, render, capture4K,
    dispose() {
      window.removeEventListener('resize', resize);
      renderer.setAnimationLoop(null);
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
