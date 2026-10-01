import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED_DT, bounds, solidBounds, overlaps, moveBody, findSupport, isSolid } from '../src/physics/collision.js';
import { Simulation } from '../src/game/simulation.js';
import { createLevelData } from '../src/world/levelData.js';

const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≉ ${expected}`);
const body = (values = {}) => ({ x: 0, y: 0, w: .8, h: 1.65, vx: 0, vy: 0, grounded: false, ...values });
const solid = (id, x, top, w, h, values = {}) => ({ id, x, y: top - h / 2, w, h, enabled: true, ...values });
function isolated(solids, enemies = [], mechanisms = []) {
  const level = createLevelData();
  Object.assign(level, { solids, enemies, mechanisms, coins: [], goal: { x: 419, y: 0 } });
  const sim = new Simulation(level);
  sim.start();
  return sim;
}
function clearOfSolids(actor, solids) {
  for (const s of solids.filter(isSolid)) assert.equal(overlaps(bounds(actor), solidBounds(s)), false, `actor intersects ${s.id}`);
}

test('CCD catches a fast fall at the last sliver of a thin platform', () => {
  const platforms = [solid('thin', 3, 2, 2, .08)];
  const p = body({ x: 4.39, y: 30, vy: -150 });
  const hit = moveBody(p, 0, -45, platforms);
  near(p.y, 2);
  assert.equal(hit.supportId, 'thin');
  assert.equal(p.vy, 0);
  clearOfSolids(p, platforms);
});

test('CCD catches a fast horizontal crossing and an underside head hit', () => {
  const wall = solid('wall', 3, 6, .06, 8);
  const p = body({ y: 1, vx: 100 });
  assert.equal(moveBody(p, 25, 0, [wall]).wall, true);
  near(p.x, 2.57);
  clearOfSolids(p, [wall]);
  const ceiling = solid('ceiling', 0, 4, 3, .2);
  const jumper = body({ vy: 100 });
  assert.equal(moveBody(jumper, 0, 20, [ceiling]).ceiling, true);
  near(jumper.y, 2.15);
  clearOfSolids(jumper, [ceiling]);
});

test('diagonal movement cannot cut through a wall-floor corner', () => {
  const solids = [solid('floor', 0, 0, 30, 1), solid('wall', 2, 4, 1, 4)];
  const p = body({ x: 0, y: 3, vx: 30, vy: -30 });
  moveBody(p, 5, -5, solids);
  near(p.x, 1.1);
  near(p.y, 0);
  clearOfSolids(p, solids);
});

test('descending solver returns the nearest landing collider independent of table order', () => {
  const high = solid('high', 0, 1, 3, .1);
  const low = solid('low', 0, .999, 3, .1);
  for (const solids of [[high, low], [low, high]]) {
    const p = body({ y: 1.1, vy: -40 });
    const hit = moveBody(p, 0, -.2, solids);
    near(p.y, 1);
    assert.equal(hit.supportId, 'high');
  }
});

test('low stairs step up smoothly but a taller wall and a low ceiling block the player', () => {
  const ground = solid('ground', 0, 0, 30, 2);
  const step = solid('step', 1, .28, 1, .28);
  const p = body({ grounded: true });
  moveBody(p, 1.1, -.01, [ground, step], { stepHeight: .32 });
  near(p.y, .28);
  assert.ok(p.x > 1);
  clearOfSolids(p, [ground, step]);
  for (const blockers of [[solid('tall', 1, .5, 1, .5)], [step, solid('ceiling', 1, 1.9, 2, .2)]]) {
    const stopped = body({ grounded: true });
    const hit = moveBody(stopped, 1.1, -.01, [ground, ...blockers], { stepHeight: .32 });
    assert.equal(hit.wall, true);
    assert.ok(stopped.x < .11);
    clearOfSolids(stopped, [ground, ...blockers]);
  }
});

test('hidden bricks are passable from above and reveal only on an underside hit', () => {
  const brick = solid('hidden', 0, 3, 1.4, .65, { hidden: true, revealed: false });
  const dropping = body({ y: 5, vy: -20 });
  moveBody(dropping, 0, -5, [brick]);
  near(dropping.y, 0);
  assert.equal(brick.revealed, false);
  const rising = body({ vy: 12 });
  const hit = moveBody(rising, 0, 2, [brick]);
  assert.deepEqual(hit.revealed, ['hidden']);
  assert.equal(brick.revealed, true);
  near(rising.y, .7);
});

test('fixed accumulator produces the same physics at 30, 60 and 144 Hz', () => {
  const results = [];
  for (const fps of [30, 60, 144]) {
    const sim = isolated([solid('floor', 0, 0, 200, 2)]);
    for (let frame = 0; frame < fps * 2; frame++) sim.advance(1 / fps, { move: 1, jumpHeld: true, jumpPressed: frame === 0 });
    results.push({ x: sim.player.x, y: sim.player.y, elapsed: sim.elapsed });
  }
  results.forEach(result => { near(result.x, results[0].x); near(result.y, results[0].y); near(result.elapsed, 2); });
});

test('jump press survives a render frame shorter than one physics step', () => {
  const sim = isolated([solid('floor', 0, 0, 200, 2)]);
  sim.player.y = 0;
  sim.advance(FIXED_DT / 2, { jumpHeld: true, jumpPressed: true });
  sim.advance(FIXED_DT / 2, { jumpHeld: true });
  assert.ok(sim.player.vy > 11);
});

test('long jump climbs higher than short jump without holding causing repeated jumps', () => {
  function jump(held) {
    const sim = isolated([solid('floor', 0, 0, 200, 2)]);
    sim.player.y = 0;
    let peak = 0;
    for (let i = 0; i < 240; i++) {
      sim.step(FIXED_DT, { jumpPressed: i === 0, jumpHeld: i < held });
      peak = Math.max(peak, sim.player.y);
    }
    assert.equal(sim.drainEvents().filter(e => e.type === 'jump').length, 1);
    return peak;
  }
  assert.ok(jump(240) > jump(1) + 1.5);
});

test('moving platforms carry riders through full cycles without separation or penetration', () => {
  for (const axis of ['x', 'y']) {
    const sim = isolated([solid('moving', 3, 3, 4.5, .65, { type: 'moving', baseX: 3, baseY: 2.675, range: 2.2, speed: .8, axis })]);
    Object.assign(sim.player, { x: 3, y: 3, grounded: true, supportId: 'moving' });
    for (let i = 0; i < 1200; i++) {
      sim.step(FIXED_DT, {});
      const platform = sim.solids[0];
      near(sim.player.y, platform.y + platform.h / 2);
      if (axis === 'x') near(sim.player.x, platform.x);
      clearOfSolids(sim.player, sim.solids);
    }
    assert.equal(sim.lives, 3);
  }
});

test('moving platform stops before crushing a rider into a wall or ceiling', () => {
  for (const axis of ['x', 'y']) {
    const moving = solid('moving', 0, 2, 3, .65, { type: 'moving', baseX: 0, baseY: 1.675, range: 3, speed: .8, axis });
    const obstacle = axis === 'x' ? solid('wall', 2, 7, .5, 7) : solid('ceiling', 0, 4.6, 20, .5);
    const sim = isolated([moving, obstacle]);
    Object.assign(sim.player, { x: 0, y: 2, grounded: true, supportId: 'moving' });
    for (let i = 0; i < 450; i++) {
      sim.step(FIXED_DT, {});
      clearOfSolids(sim.player, sim.solids);
      assert.equal(sim.lives, 3);
    }
  }
});

test('swept enemy head contact catches a fast drop and awards one stomp only', () => {
  const sim = isolated([solid('floor', 0, 0, 30, 2)], [{ id: 'enemy', x: 3, y: 0, w: .9, h: .85, minX: 1, maxX: 5, speed: 0, hp: 1 }]);
  Object.assign(sim.player, { x: 3, y: 1.05, vy: -100 });
  sim.step(FIXED_DT, {});
  assert.equal(sim.enemies[0].alive, false);
  assert.ok(sim.player.vy > 0);
  assert.equal(sim.score, 250);
  assert.equal(sim.lives, 3);
  for (let i = 0; i < 120; i++) sim.step(FIXED_DT, {});
  assert.equal(sim.score, 250);
});

test('elite enemy survives two separated stomps and dies on the third', () => {
  const sim = isolated([solid('floor', 0, 0, 30, 2)], [{ id: 'elite', x: 3, y: 0, w: 1.55, h: 1.6, minX: 1, maxX: 5, speed: 0, hp: 3, elite: true }]);
  for (let hit = 0; hit < 3; hit++) {
    Object.assign(sim.player, { x: 3, y: 1.8, vy: -42 });
    sim.enemies[0].stompCooldown = 0;
    sim.step(FIXED_DT, {});
    assert.equal(sim.enemies[0].hp, 2 - hit);
    assert.equal(sim.enemies[0].alive, hit < 2);
  }
  assert.equal(sim.score, 950);
  assert.equal(sim.lives, 3);
});

test('enemies turn at walls and support edges without entering solid geometry', () => {
  const sim = isolated([solid('floor', 5, 0, 10, 2), solid('wall', 6, 3, .4, 3)], [{ id: 'enemy', x: 4, y: 0, w: .9, h: .85, minX: -10, maxX: 12, speed: 2, hp: 1 }]);
  Object.assign(sim.player, { x: 20, y: 12, invulnerable: 20 });
  let sawRight = false, sawLeft = false;
  for (let i = 0; i < 900; i++) {
    sim.updateEnemies(FIXED_DT, { x: 20, y: 12, vy: 0 });
    const e = sim.enemies[0];
    clearOfSolids(e, sim.solids);
    assert.ok(e.y > -.01);
    sawRight ||= e.direction > 0; sawLeft ||= e.direction < 0;
  }
  assert.ok(sawRight && sawLeft);
});

test('checkpoint respawn, game over and restart preserve life/score invariants', () => {
  const sim = new Simulation(createLevelData());
  sim.start();
  Object.assign(sim.player, { x: 204, y: 0 });
  sim.step(FIXED_DT, {});
  assert.equal(sim.checkpointIndex, 2);
  sim.score = 500; sim.coinsCollected = 5;
  Object.assign(sim.player, { y: -9 });
  sim.step(FIXED_DT, {});
  assert.equal(sim.lives, 2);
  near(sim.player.x, 203);
  near(sim.player.y, .02);
  assert.equal(sim.score, 500);
  sim.loseLife('test'); sim.loseLife('test'); sim.loseLife('test');
  assert.equal(sim.status, 'gameOver');
  assert.equal(sim.lives, 0);
  const stopped = { ...sim.player };
  sim.advance(10, { move: 1, jumpPressed: true });
  assert.deepEqual(sim.player, stopped);
  sim.reset(); sim.start();
  assert.equal(sim.status, 'playing'); assert.equal(sim.lives, 3);
  assert.equal(sim.score, 0); assert.equal(sim.coinsCollected, 0); assert.equal(sim.checkpointIndex, 0);
  assert.equal(sim.secrets.size, 0);
  assert.ok(sim.enemies.every(e => e.alive && e.hp === e.maxHp));
});

test('paired pipes need deliberate interaction and cannot immediately loop', () => {
  const sim = new Simulation(createLevelData());
  sim.start();
  Object.assign(sim.player, { x: 138, y: 0 });
  sim.step(FIXED_DT, {});
  near(sim.player.x, 138);
  sim.step(FIXED_DT, { interactPressed: true });
  near(sim.player.x, 163);
  assert.equal(sim.secrets.has('village'), true);
  clearOfSolids(sim.player, sim.solids);
  Object.assign(sim.player, { x: 168, y: 4.2 });
  sim.step(FIXED_DT, { interactPressed: true });
  near(sim.player.x, 168);
  for (let i = 0; i < 121; i++) sim.step(FIXED_DT, {});
  sim.step(FIXED_DT, { interactPressed: true });
  near(sim.player.x, 135);
  clearOfSolids(sim.player, sim.solids);
});

test('crumbling platforms disappear, do not restore through actors, then recover', () => {
  const sim = isolated([solid('floor', 0, 0, 30, 2), solid('crumble', 3, 2, 5, .5, { type: 'crumble' })]);
  Object.assign(sim.player, { x: 3, y: 2, grounded: true });
  for (let i = 0; i < 90; i++) sim.step(FIXED_DT, {});
  const platform = sim.solids[1];
  assert.equal(platform.enabled, false);
  Object.assign(sim.player, { y: 1.5, vy: 0 });
  sim.elapsed = platform.restoreAt + .1;
  sim.updatePlatforms(FIXED_DT, sim.solids);
  assert.equal(platform.enabled, false);
  sim.player.x = 10;
  sim.updatePlatforms(FIXED_DT, sim.solids);
  assert.equal(platform.enabled, true);
});
