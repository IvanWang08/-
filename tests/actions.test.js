import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/game/simulation.js';
import { createLevelData } from '../src/world/levelData.js';
import { FIXED_DT } from '../src/physics/collision.js';
import { CAMERA_LOCK } from '../src/scene/createScene.js';
import { controlState } from '../src/game/controls.js';

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

test('custom bindings expose staff, dash and jump without hard-coded keys',()=>{
  const bindings={left:['KeyQ'],right:['KeyE'],jump:['KeyI'],interact:['KeyO'],attack:['KeyU'],dash:['KeyP']};
  assert.deepEqual(controlState(new Set(['KeyE','KeyI']),new Set(['KeyU','KeyP']),bindings),{
    move:1,jumpHeld:true,jumpPressed:false,interactPressed:false,attackPressed:true,dashPressed:true,
  });
});

test('staff defeats a normal enemy and needs three separated hits for an elite',()=>{
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

test('swept staff hits twenty reasonable poses but never reaches through a wall',()=>{
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

test('trap table contains eight mechanisms, previews and five rhythm combinations',()=>{
  const traps=createLevelData().traps;
  assert.ok(new Set(traps.map(t=>t.type)).size>=8);
  assert.ok(new Set(traps.filter(t=>!t.preview).map(t=>t.combo)).size>=5);
  for(const type of new Set(traps.map(t=>t.type)))assert.ok(traps.some(t=>t.type===type&&t.preview),`${type} has no preview`);
  assert.ok(traps.every(t=>Number.isFinite(t.period)&&Number.isFinite(t.chunk)));
});
