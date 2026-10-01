import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/game/simulation.js';
import { createLevelData } from '../src/world/levelData.js';
import { FIXED_DT, bounds, solidBounds, overlaps, isSolid, findSupport } from '../src/physics/collision.js';

// The driver reads the same collision table as a human sees and submits ordinary
// controls. It never sets player position, lives, enemy health, coins, or status.
export function journeyInput(sim, driver) {
  const p = sim.player;
  const solids = sim.localSolids();
  const ground = findSupport(p, solids, .06);
  const nextFloor = findSupport({ ...p, x: p.x + 2.3, w: .15 }, solids, .4);
  const ledge = ground && !nextFloor;
  const obstruction = solids.some(s => {
    if (!isSolid(s)) return false;
    const b = solidBounds(s);
    return b.left > p.x + .2 && b.left < p.x + 2.6 && b.top > p.y + .33 && b.bottom < p.y + p.h;
  });
  const enemy = sim.enemies.some(e => e.alive && e.x > p.x - .2 && e.x < p.x + 3.8 && e.y + e.h > p.y - .2 && e.y < p.y + 2.8);
  const blocked = Math.abs(p.x - driver.lastX) < .0001 && driver.frames > 20;
  const jump = p.grounded && (ledge || obstruction || enemy || blocked);
  driver.lastX = p.x;
  driver.frames++;
  return { move: 1, jumpHeld: true, jumpPressed: jump };
}

test('level has four large regions, high routes, paired pipes and a secret in each region', () => {
  const level = createLevelData();
  assert.ok(level.length >= 400);
  assert.equal(level.regions.length, 4);
  assert.equal(level.checkpoints.length, 4);
  assert.ok(level.solids.filter(s => s.id.startsWith('route-') && !s.id.endsWith('-end')).length >= 3);
  for (const region of level.regions) assert.ok(level.solids.some(s => s.secret === region.id && s.hidden));
  assert.equal(level.mechanisms.filter(m => m.type === 'pipe').length, 4);
  assert.ok(level.solids.every(s => Number.isFinite(s.chunk) && s.w > 0 && s.h > 0));
});

for (let run = 1; run <= 3; run++) {
  test(`complete journey ${run}: ordinary controls traverse the whole map without penetration`, () => {
    const sim = new Simulation(createLevelData());
    sim.start();
    const driver = { lastX: -1, frames: 0 };
    const regions = new Set();
    let highestX = 0;
    let totalFrames = 0;
    let hurt = 0;
    let jumps = 0;
    while (sim.status === 'playing' && totalFrames < 120 * 160) {
      const input = journeyInput(sim, driver);
      sim.step(FIXED_DT, input);
      totalFrames++;
      highestX = Math.max(highestX, sim.player.x);
      regions.add(sim.region.id);
      for (const event of sim.drainEvents()) {
        if (event.type === 'hurt') hurt++;
        if (event.type === 'jump') jumps++;
      }
      assert.ok(Number.isFinite(sim.player.x) && Number.isFinite(sim.player.y));
      for (const s of sim.localSolids().filter(isSolid)) {
        assert.equal(overlaps(bounds(sim.player), solidBounds(s)), false,
          `frame ${totalFrames}, x=${sim.player.x.toFixed(2)}, y=${sim.player.y.toFixed(2)} intersects ${s.id}`);
      }
    }
    assert.equal(sim.status, 'won', `ended ${sim.status} x=${sim.player.x.toFixed(2)} max=${highestX.toFixed(2)} hurt=${hurt} t=${(totalFrames / 120).toFixed(1)}`);
    assert.equal(regions.size, 4);
    assert.equal(sim.checkpointIndex, 3);
    assert.ok(highestX >= 411);
    assert.ok(sim.coinsCollected > 10);
    assert.ok(jumps >= 10);
    assert.ok(sim.lives > 0);
    assert.ok(sim.score >= sim.coinsCollected * 100 + 1000);
  });
}
