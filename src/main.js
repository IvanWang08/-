import './style.css';
import {createScene} from './scene/createScene.js';
import {createLevelData} from './world/levelData.js';
import {createWorldView} from './world/worldView.js';
import {createPlayerView} from './player/playerView.js';
import {Simulation} from './game/simulation.js';
import {createGameUi} from './ui/gameUi.js';
import {createEffects} from './scene/effects.js';
import {DEFAULT_BINDINGS,controlState} from './game/controls.js';

const app=document.querySelector('#app');
app.innerHTML='<main class="game-shell"><div id="game" aria-label="超级玛丽国风大地图游戏画面"></div></main>';
const shell=document.querySelector('.game-shell');
const stage=createScene(document.querySelector('#game'));
const level=createLevelData();
let simulation=new Simulation(level);
const world=createWorldView(stage.scene,level);
const hero=createPlayerView(stage.scene);
const effects=createEffects(stage.scene);
const keys=new Set(),pressed=new Set();
let showFps=false,visual={shake:0,stomp:false},lastTime=performance.now(),fpsClock=0,fpsFrames=0,fps=60;

function start(){simulation.start();ui.update(simulation,{fps,showFps,drawCalls:stage.renderer.info.render.calls});}
function restart(){simulation.reset();simulation.start();stage.updateCamera(simulation.player,1,{snap:true});ui.notice(simulation.region.name);}
function resume(){if(simulation.status==='paused')simulation.status='playing';}
const ui=createGameUi(shell,{start,restart,resume});

const controlled=new Set(Object.values(DEFAULT_BINDINGS).flat());
const bound=(name,code)=>DEFAULT_BINDINGS[name].includes(code);
window.addEventListener('keydown',event=>{
  if(controlled.has(event.code))event.preventDefault();
  if(event.repeat)return;
  if((event.code==='Enter'||event.code==='Space')&&simulation.status==='ready'){start();return;}
  if(bound('pause',event.code)){
    if(simulation.status==='playing')simulation.status='paused';else if(simulation.status==='paused')simulation.status='playing';
    return;
  }
  if(bound('restart',event.code)){restart();return;}
  if(bound('performance',event.code)){showFps=!showFps;return;}
  keys.add(event.code);pressed.add(event.code);
});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>{keys.clear();if(simulation.status==='playing')simulation.status='paused';});

function inputSnapshot(){
  const input=controlState(keys,pressed);
  pressed.clear();return input;
}
function handleEvents(events){
  for(const event of events){
    if(event.type==='region')ui.notice(event.name);
    if(event.type==='checkpoint')ui.notice(`界碑已记 · ${event.name}`);
    if(event.type==='secret')ui.notice(`发现 ${event.name} 暗藏`);
    if(event.type==='respawn')ui.notice(`回到 ${event.name} 界碑`);
    if(event.type==='land')visual.shake=Math.min(.8,event.impact/25);
    if(event.type==='hurt')visual.shake=1;
    if(event.type==='stomp'){visual.stomp=true;visual.shake=.45;}
    if(['coin','stomp','hurt','secret','spring','pipe','doubleJump','strike','attack'].includes(event.type))effects.burst(event.x??simulation.player.x,event.y??simulation.player.y+1,event.type);
  }
}

stage.updateCamera(simulation.player,1,{snap:true});
stage.renderer.setAnimationLoop(now=>{
  const dt=Math.min(.05,Math.max(0,(now-lastTime)/1000));lastTime=now;
  simulation.advance(dt,inputSnapshot());
  handleEvents(simulation.drainEvents());
  world.update(simulation,dt,simulation.elapsed);
  hero.update(simulation.player,simulation.elapsed,{stomp:visual.stomp});visual.stomp=false;
  if(simulation.player.dashTime>0)effects.trail(simulation.player.x,simulation.player.y,simulation.player.facing);
  effects.update(dt);
  stage.updateCamera(simulation.player,dt,{shake:visual.shake});visual.shake=0;
  stage.renderer.render(stage.scene,stage.camera);
  fpsClock+=dt;fpsFrames++;
  if(fpsClock>=.5){fps=fpsFrames/fpsClock;fpsClock=0;fpsFrames=0;}
  ui.update(simulation,{fps,showFps,drawCalls:stage.renderer.info.render.calls});
});

if(import.meta.env.DEV){
  window.__marioDebug={get snapshot(){return {status:simulation.status,player:{...simulation.player},score:simulation.score,lives:simulation.lives,coins:simulation.coinsCollected,region:simulation.region.id,fps,drawCalls:stage.renderer.info.render.calls};}};
}
