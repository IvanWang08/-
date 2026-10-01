export function createGameUi(root, callbacks={}) {
  const layer=document.createElement('div');layer.className='game-ui';
  layer.innerHTML=`
    <header class="hud-v2" aria-label="游戏状态">
      <div class="seal">玛</div><div class="region"><small>山河远行 · v0.3</small><strong data-region>青竹林</strong></div>
      <div class="progress"><i data-progress></i><span data-distance>0 / 420</span></div>
      <div class="meters"><span>得分 <b data-score>000000</b></span><span>铜钱 <b data-coins>00</b></span><span>命数 <b data-lives>三</b></span></div>
      <div class="fps" data-fps hidden>FPS 60 · 0 DRAW</div>
    </header>
    <div class="area-title" data-notice aria-live="polite"><span>青竹林</span></div>
    <section class="game-modal" data-modal aria-live="polite">
      <div class="scroll-card"><p class="chapter">第一卷 · 山河远行</p><h1 data-modal-title>云游四境</h1>
        <p data-modal-copy>越竹林，登村檐，渡水桥，抵达宫门。</p>
        <div class="controls-grid"><span><kbd>A D</kbd> / <kbd>← →</kbd> 行走</span><span><kbd>空格</kbd> 跳跃 / 空中二段跳</span><span><kbd>J</kbd> 金箍棒挥砍</span><span><kbd>Shift</kbd> / <kbd>K</kbd> 冲刺</span><span><kbd>S</kbd> / <kbd>↓</kbd> 入水管</span><span><kbd>Esc</kbd> 暂停 · <kbd>F</kbd> 帧率</span></div>
        <button type="button" data-action>启程</button><small>按 Enter 或空格开始</small>
      </div>
    </section>`;
  root.appendChild(layer);
  const q=s=>layer.querySelector(s),modal=q('[data-modal]'),title=q('[data-modal-title]'),copy=q('[data-modal-copy]'),action=q('[data-action]');
  let noticeTimer=0,lastStatus='ready';
  action.addEventListener('click',()=>lastStatus==='paused'?callbacks.resume?.():lastStatus==='ready'?callbacks.start?.():callbacks.restart?.());
  function notice(text){const el=q('[data-notice]');el.querySelector('span').textContent=text;el.classList.remove('show');requestAnimationFrame(()=>el.classList.add('show'));clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('show'),2300);}
  function update(sim,stats={}) {
    q('[data-score]').textContent=String(sim.score).padStart(6,'0');q('[data-coins]').textContent=String(sim.coinsCollected).padStart(2,'0');
    q('[data-lives]').textContent=['零','一','二','三'][sim.lives]??String(sim.lives);q('[data-region]').textContent=sim.region?.name??'青竹林';
    const distance=Math.max(0,Math.min(sim.level.length,Math.round(sim.player.x)));q('[data-distance]').textContent=`${distance} / ${sim.level.length}`;q('[data-progress]').style.width=`${distance/sim.level.length*100}%`;
    const fps=q('[data-fps]');fps.hidden=!stats.showFps;fps.textContent=`FPS ${Math.round(stats.fps||0)} · ${stats.drawCalls||0} DRAW`;
    lastStatus=sim.status;modal.classList.toggle('hidden',sim.status==='playing');
    if(sim.status==='ready'){title.textContent='云游四境';copy.textContent='越竹林，登村檐，渡水桥，抵达宫门。';action.textContent='启程';}
    if(sim.status==='paused'){title.textContent='且歇片刻';copy.textContent='山河仍在，随时续行。';action.textContent='继续';}
    if(sim.status==='won'){title.textContent='山河已越';copy.textContent=`终局得分 ${String(sim.score).padStart(6,'0')} · 铜钱 ${sim.coinsCollected}`;action.textContent='再走一程';}
    if(sim.status==='gameOver'){title.textContent='行路未竟';copy.textContent=`本局得分 ${String(sim.score).padStart(6,'0')} · 从青竹林重新启程`;action.textContent='重新启程';}
  }
  return {update,notice,destroy(){clearTimeout(noticeTimer);layer.remove();}};
}
