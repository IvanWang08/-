import './style.css';
import { createScene } from './scene/createScene.js';
import { createLevel } from './world/createLevel.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="game-shell">
    <div id="game" aria-label="超级玛丽 3D 游戏画面"></div>
  </main>
`;

const { scene, camera, renderer } = createScene(document.querySelector('#game'));
createLevel(scene);

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
