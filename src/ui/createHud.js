export function createHud(root) {
  const hud = document.createElement('section');
  hud.className = 'hud';
  hud.setAttribute('aria-label', '游戏状态');
  hud.innerHTML = `
    <div class="brand"><span class="brand-mark">M</span><span>WORLD 1–1</span></div>
    <div class="stats">
      <span>SCORE <strong data-score>000000</strong></span>
      <span>COINS <strong data-coins>× 00</strong></span>
      <span>LIVES <strong data-lives>× 03</strong></span>
    </div>
    <div class="controls">A D / ← → 移动 · SPACE 跳跃 · R 重开</div>
  `;
  root.appendChild(hud);

  const score = hud.querySelector('[data-score]');
  const coins = hud.querySelector('[data-coins]');
  const lives = hud.querySelector('[data-lives]');

  return {
    update(state) {
      score.textContent = String(state.score).padStart(6, '0');
      coins.textContent = `× ${String(state.coins).padStart(2, '0')}`;
      lives.textContent = `× ${String(state.lives).padStart(2, '0')}`;
    },
  };
}

