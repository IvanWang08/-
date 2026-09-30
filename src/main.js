import './style.css';
import * as THREE from 'three';
import { createScene } from './scene/createScene.js';
import { createLevel } from './world/createLevel.js';
import { createPlayer } from './player/createPlayer.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="game-shell">
    <div id="game" aria-label="超级玛丽 3D 游戏画面"></div>
  </main>
`;

const { scene, camera, renderer } = createScene(document.querySelector('#game'));
const { platforms } = createLevel(scene);
const player = createPlayer(scene, platforms);
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  const { fell } = player.update(delta);
  if (fell) player.reset();

  const cameraTargetX = Math.max(7, player.mesh.position.x + 5);
  camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraTargetX, 4, delta);
  camera.lookAt(camera.position.x - 1, 2.2, 0);
  renderer.render(scene, camera);
});
