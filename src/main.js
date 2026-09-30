import './style.css';
import * as THREE from 'three';
import { createScene } from './scene/createScene.js';
import { createLevel } from './world/createLevel.js';
import { createPlayer } from './player/createPlayer.js';
import { createCoins } from './world/createCoins.js';
import { createHud } from './ui/createHud.js';
import { createEnemies } from './enemies/createEnemies.js';
import { createOverlay } from './ui/createOverlay.js';
import { createGoal } from './world/createGoal.js';

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
const enemySystem = createEnemies(scene);
const goal = createGoal(scene);
const hud = createHud(document.querySelector('.game-shell'));
const clock = new THREE.Clock();
const state = { score: 0, coins: 0, lives: 3, status: 'playing' };
hud.update(state);

function restartGame() {
  Object.assign(state, { score: 0, coins: 0, lives: 3, status: 'playing' });
  player.reset();
  coinSystem.reset();
  enemySystem.reset();
  camera.position.x = 7;
  hud.update(state);
  overlay.hide();
}

const overlay = createOverlay(document.querySelector('.game-shell'), restartGame);
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyR') restartGame();
});

function loseLife() {
  if (state.status !== 'playing') return;
  state.lives -= 1;
  hud.update(state);
  if (state.lives <= 0) {
    state.status = 'gameOver';
    overlay.showGameOver(state.score);
    return;
  }
  player.reset();
}

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  const elapsed = clock.elapsedTime;
  if (state.status !== 'playing') {
    renderer.render(scene, camera);
    return;
  }

  const { fell } = player.update(delta);
  if (fell) loseLife();
  enemySystem.update(delta, elapsed);
  goal.update(elapsed);
  const enemyContact = enemySystem.checkPlayerCollision(player.getBounds(), player.velocity);
  if (enemyContact.stomped) {
    state.score += enemyContact.stomped * 250;
    hud.update(state);
  }
  if (enemyContact.hit) loseLife();

  if (state.status === 'playing' && goal.reached(player.getBounds())) {
    state.status = 'won';
    state.score += 1000 + state.lives * 200;
    hud.update(state);
    overlay.showWin(state.score);
  }

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
