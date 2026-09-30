export function createOverlay(root, onRestart) {
  const overlay = document.createElement('section');
  overlay.className = 'overlay is-hidden';
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <div class="overlay-card">
      <p class="eyebrow">WORLD 1–1</p>
      <h1 data-title>GAME OVER</h1>
      <p data-message>别灰心，再试一次。</p>
      <div class="final-score">SCORE <strong data-final-score>000000</strong></div>
      <button type="button">重新开始 <kbd>R</kbd></button>
    </div>
  `;
  root.appendChild(overlay);

  overlay.querySelector('button').addEventListener('click', onRestart);
  const title = overlay.querySelector('[data-title]');
  const message = overlay.querySelector('[data-message]');
  const finalScore = overlay.querySelector('[data-final-score]');

  return {
    hide() {
      overlay.classList.add('is-hidden');
    },
    showGameOver(score) {
      title.textContent = 'GAME OVER';
      message.textContent = '别灰心，再试一次。';
      finalScore.textContent = String(score).padStart(6, '0');
      overlay.classList.remove('is-hidden');
      overlay.querySelector('button').focus();
    },
  };
}

