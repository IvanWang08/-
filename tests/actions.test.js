import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/game/simulation.js';
import { createLevelData } from '../src/world/levelData.js';
import { FIXED_DT } from '../src/physics/collision.js';
import { CAMERA_LOCK } from '../src/scene/createScene.js';
import { controlState } from '../src/game/controls.js';
import { Z_LAYERS, groundedY, groundHeightAt } from '../src/world/layers.js';

const floor = { id:'test-floor', x:20, y:-1, w:80, h:2, type:'ground', chunk:0, enabled:true };
function actionSimulation(enemies=[],traps=[]) {
  const level=createLevelData();
  Object.assign(level,{solids:[{...floor}],coins:[],enemies,mechanisms:[],traps,goal:{x:70,y:0}});
  const sim=new Simulation(level);sim.start();
  Object.assign(sim.player,{x:0,y:0,grounded:true,supportId:'test-floor'});
  return sim;
}
function tick(sim,seconds,input={}) {
  const frames=Math.ceil(seconds/FIXED_DT);
  for(let i=0;i<frames;i++)sim.step(FIXED_DT,i===0?input:{...input,jumpPressed:false,dashPressed:false,attackPressed:false});
}

test('camera pose stays in the requested shallow side-view range',()=>{
  assert.ok(CAMERA_LOCK.pitchDegrees>=15&&CAMERA_LOCK.pitchDegrees<=25);
  assert.equal(CAMERA_LOCK.near,0.1);assert.ok(CAMERA_LOCK.far<=150);
  assert.ok(CAMERA_LOCK.leadX>0&&CAMERA_LOCK.offsetZ>=20);
  assert.equal(Object.isFrozen(CAMERA_LOCK),true);
});

test('custom bindings expose sword, skill, dash and jump without hard-coded keys',()=>{
  const bindings={left:['KeyQ'],right:['KeyE'],jump:['KeyI'],interact:['KeyO'],attack:['KeyU'],skill:['KeyY'],dash:['KeyP']};
  assert.deepEqual(controlState(new Set(['KeyE','KeyI']),new Set(['KeyU','KeyY','KeyP']),bindings),{
    move:1,jumpHeld:true,jumpPressed:false,interactPressed:false,attackPressed:true,skillPressed:true,dashPressed:true,
  });
});

test('sword defeats a normal enemy and needs three separated hits for an elite',()=>{
  const normal=actionSimulation([{id:'normal',x:1.45,y:0,w:.9,h:.85,minX:1,maxX:2,speed:0,hp:1}]);
  normal.step(FIXED_DT,{attackPressed:true});
  tick(normal,.3);
  assert.equal(normal.enemies[0].alive,false);assert.equal(normal.player.attackHit,true);
  const elite=actionSimulation([{id:'elite',x:1.5,y:0,w:1.2,h:1.35,minX:1,maxX:2,speed:0,hp:3,elite:true}]);
  for(let hit=0;hit<3;hit++){
    elite.step(FIXED_DT,{attackPressed:true});
    tick(elite,.35);
    if(hit<2){assert.equal(elite.enemies[0].alive,true);tick(elite,.2);}
  }
  assert.equal(elite.enemies[0].alive,false);
});

test('swept sword hits twenty reasonable poses but never reaches through a wall',()=>{
  for(let attempt=0;attempt<20;attempt++){
    const enemy={id:`target-${attempt}`,x:1.25+(attempt%5)*.3,y:.08+Math.floor(attempt/5)*.16,w:.9,h:.85,minX:1,maxX:3,speed:0,hp:1};
    const sim=actionSimulation([enemy]);sim.step(FIXED_DT,{attackPressed:true});tick(sim,.34);
    assert.equal(sim.enemies[0].alive,false,`missed pose ${attempt}`);
  }
  const blocked=actionSimulation([{id:'blocked',x:1.7,y:0,w:.9,h:.85,minX:1.5,maxX:2,speed:0,hp:1}]);
  blocked.solids.push({id:'attack-wall',x:1,y:1.5,w:.25,h:3,type:'stone',enabled:true});
  blocked.step(FIXED_DT,{attackPressed:true});tick(blocked,.4);
  assert.equal(blocked.enemies[0].alive,true);
});

test('dash covers its target distance and ignores an active flame hitbox',()=>{
  const flame={id:'test-flame',type:'flame',x:2.2,y:0,period:2,phase:.3,h:2.2,damage:1};
  const sim=actionSimulation([], [flame]);
  tick(sim,.2,{move:1,dashPressed:true});
  assert.ok(sim.player.x>=3&&sim.player.x<=4.2,`dash ended at ${sim.player.x}`);
  assert.equal(sim.lives,3);assert.ok(sim.player.dashCooldown>.7);
});

test('double jump fires once in air and resets only after landing',()=>{
  const sim=actionSimulation();
  sim.step(FIXED_DT,{jumpPressed:true,jumpHeld:true});
  assert.equal(sim.player.jumpsUsed,1);
  tick(sim,.12,{jumpHeld:true});
  sim.step(FIXED_DT,{jumpPressed:true,jumpHeld:true});
  assert.equal(sim.player.jumpsUsed,2);const secondVelocity=sim.player.vy;
  sim.step(FIXED_DT,{jumpPressed:true,jumpHeld:true});
  assert.ok(sim.player.vy<secondVelocity);
  tick(sim,2.2);
  assert.equal(sim.player.grounded,true);assert.equal(sim.player.jumpsUsed,0);
});

test('premium slice contains only telegraphed rhythm combinations',()=>{
  const traps=createLevelData().traps;
  assert.ok(new Set(traps.map(t=>t.type)).size>=5);
  assert.equal(new Set(traps.map(t=>t.combo)).size,4);
  assert.ok(traps.every(t=>Number.isFinite(t.period)&&Number.isFinite(t.chunk)));
  const live=traps.filter(t=>!t.preview);
  assert.ok(live.every(t=>t.combo&&t.template&&t.telegraph>=.6&&t.difficulty>=1&&t.difficulty<=4));
  const combos=Map.groupBy(live,t=>t.combo);
  for(const [name,beats] of combos)assert.ok(beats.length>=3&&beats.length<=6,`${name} has ${beats.length} beats`);
  const ordered=[...live].sort((a,b)=>a.x-b.x);
  for(let i=1;i<ordered.length;i++)assert.ok(ordered[i].difficulty>=ordered[i-1].difficulty,'difficulty must not decrease');
});

test('decoration layers are ordered and grounding uses the canonical collision table',()=>{
  assert.ok(Z_LAYERS.farBackground.max<=Z_LAYERS.midDecoration.min);
  assert.ok(Z_LAYERS.midDecoration.max<=Z_LAYERS.nearDecoration.min);
  assert.ok(Z_LAYERS.nearDecoration.max<=Z_LAYERS.gameplay.min);
  assert.ok(Z_LAYERS.gameplay.max<=Z_LAYERS.foreground.min);
  const level=createLevelData();
  for(const x of [5,25,45,65,83,91]){
    const y=groundHeightAt(level,x);
    assert.ok(Number.isFinite(y));
    assert.ok(Math.abs(groundedY(level,x,.24)-(y+.126))<1e-9);
  }
});

test('third sword strike launches a projectile and sword field is cooldown driven',()=>{
  const sim=actionSimulation([{id:'target',type:'mushroom-melee',x:8,y:0,w:1,h:1,minX:7,maxX:9,speed:0,hp:6}]);
  for(let i=0;i<3;i++){sim.step(FIXED_DT,{attackPressed:true});tick(sim,.3);}
  assert.ok(sim.projectiles.projectiles.length>0);
  sim.step(FIXED_DT,{skillPressed:true});
  assert.equal(sim.projectiles.projectiles.length,6);assert.ok(sim.player.skillCooldown>7);
});

test('pursuit rock activates behind the player and advances through its configured interval',()=>{
  const level=createLevelData(),rock=level.traps.find(t=>t.pursuit);
  const sim=actionSimulation([], [rock]);
  sim.level.goal.x=900;
  Object.assign(sim.solids[0],{x:rock.x,y:-1,w:200,h:2});
  Object.assign(sim.player,{x:rock.x-2,y:0,supportId:'test-floor'});
  sim.step(FIXED_DT,{});
  const started=sim.traps[0].currentX;
  assert.equal(sim.traps[0].triggered,true);assert.ok(started<sim.player.x);
  tick(sim,.5);
  assert.ok(sim.traps[0].currentX>started);assert.ok(sim.traps[0].currentX<=rock.endX);
});
