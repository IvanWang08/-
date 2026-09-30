import './style.css';
import * as THREE from 'three';
import { createScene } from './scene/createScene.js';
import { createLevel } from './world/createLevel.js';
import { createPlayer } from './player/createPlayer.js';
import { createCoins } from './world/createCoins.js';
import { createHud } from './ui/createHud.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="game-shell">
    <div id="game" aria-label="超级玛丽 3D 游戏画面"></div>
  </main>
`;

const { scene, camera, renderer } = createScene(document.querySelector('#game'));
const { platforms } = createLevel(scene);
const player = createPlayer(scene, platforms);
const coinSystem = createCoins(scene);
const hud = createHud(document.querySelector('.game-shell'));
const clock = new THREE.Clock();
const state = { score: 0, coins: 0, lives: 3 };
hud.update(state);

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  const elapsed = clock.elapsedTime;
  const { fell } = player.update(delta);
  if (fell) player.reset();

  const coinsCollected = coinSystem.update(elapsed, player.getBounds());
  if (coinsCollected) {
    state.coins += coinsCollected;
    state.score += coinsCollected * 100;
    hud.update(state);
  }

  const cameraTargetX = Math.max(7, player.mesh.position.x + 5);
  camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraTargetX, 4, delta);
  camera.lookAt(camera.position.x - 1, 2.2, 0);
  renderer.render(scene, camera);
});
