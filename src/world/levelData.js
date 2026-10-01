// All coordinates are world units. Solids use centres; actors use feet.
// The renderer and physics both consume this table; meshes are never colliders.
export const REGIONS = [
  { id: 'bamboo', name: '青竹林', subtitle: '竹影初行', start: 0, end: 100 },
  { id: 'village', name: '山间村', subtitle: '檐上人家', start: 100, end: 200 },
  { id: 'water', name: '水桥渡', subtitle: '一苇渡江', start: 200, end: 300 },
  { id: 'palace', name: '宫门前', subtitle: '长路归城', start: 300, end: 428 },
];

export function createLevelData() {
  const chunks = Array.from({ length: 18 }, (_, id) => ({
    id, start: id * 25, end: (id + 1) * 25,
    theme: REGIONS.find((r) => id * 25 < r.end)?.id ?? 'palace',
  }));
  const solids = [];
  const coins = [];
  const enemies = [];
  const mechanisms = [];
  const chunkAt = (x) => Math.max(0, Math.floor(x / 25));
  function solid(id, x, top, w, h, type, extra = {}) {
    solids.push({ id, x, y: top - h / 2, w, h, type, chunk: chunkAt(x), ...extra });
  }
  function coin(x, y, extra = {}) {
    coins.push({ id: `coin-${coins.length}`, x, y, chunk: chunkAt(x), ...extra });
  }
  // Short gaps on the low route; every section also offers a rewarded high route.
  const groundRuns = [[-8,47],[50,91],[94,142],[145,190],[193,218],
    [221,243],[246,267],[270,292],[295,341],[344,380],[383,428]];
  groundRuns.forEach(([start,end], run) => {
    // Split long land masses so a single nearby chunk never loads the whole map.
    for (let x = start; x < end; x += 12) {
      const right = Math.min(x + 12, end);
      solid(`land-${run}-${x}`, (x + right) / 2, 0, right - x, 2.4,
        x >= 200 && x < 295 ? 'wood' : 'ground');
    }
  });
  REGIONS.forEach((region, index) => {
    const x = region.start;
    solid(`step-${index}-1`, x + 19, 1.3, 4, 0.65, 'stone');
    solid(`step-${index}-2`, x + 25, 2.7, 4.5, 0.65, 'stone');
    solid(`route-${index}`, x + 33, 4, 8, 0.65, index === 1 ? 'roof' : 'wood');
    solid(`route-${index}-end`, x + 41, 2.5, 5, 0.65, 'stone');
    solid(`secret-${index}`, x + 9, 3, 1.4, 0.65, 'hidden', { hidden: true, secret: region.id });
    solid(`moving-${index}`, x + 61, 2.3, 4.5, 0.65, 'moving',
      { baseX: x + 61, baseY: 2.3 - 0.325, range: 2.2, speed: 0.8, axis: index % 2 ? 'y' : 'x' });
    solid(`crumble-${index}`, x + 79, 1.7, 5, 0.5, 'crumble');
    mechanisms.push({ id: `spring-${index}`, type: 'spring', x: x + 14, y: 0, chunk: chunkAt(x+14) });
    for (const px of [6, 55, 70, 86, 96]) coin(x + px, 1.1);
    for (const px of [19,25,30,32,34,36,41]) {
      coin(x + px, px === 19 ? 2.3 : px === 25 ? 3.7 : px === 41 ? 3.5 : 5);
    }
    for (let i = 0; i < 5; i++) coin(x + 7 + i, 4 + Math.sin(i / 4 * Math.PI), { hidden: true, secret: region.id });
    coin(x + 61, 3.6);
    coin(x + 79, 2.8);
    enemies.push({ id:`goomba-${index}-1`, x:x+38,y:0,w:0.9,h:0.85,minX:x+31,maxX:x+44,speed:1.5+index*.15,hp:1,chunk:chunkAt(x+38) });
    enemies.push({ id:`goomba-${index}-2`, x:x+85,y:0,w:0.9,h:0.85,minX:x+81,maxX:x+89,speed:1.7,hp:1,chunk:chunkAt(x+85) });
  });
  // Village attic: a pipe shortcut reaches a second hidden roof route.
  solid('attic-roof', 166, 4.2, 10, 0.6, 'roof');
  for (let i=0;i<7;i++) coin(162+i*1.3,5.4);
  mechanisms.push(
    {id:'pipe-village-in',type:'pipe',x:138,y:0,targetX:163,targetY:4.25,chunk:5},
    {id:'pipe-village-out',type:'pipe',x:168,y:4.2,targetX:135,targetY:.05,chunk:6},
    {id:'pipe-water-in',type:'pipe',x:225,y:0,targetX:263,targetY:.05,chunk:9},
    {id:'pipe-water-out',type:'pipe',x:265,y:0,targetX:223,targetY:.05,chunk:10},
  );
  // Low stone stairs: automatic step-up is limited to 0.32 world units.
  for (let i=0;i<4;i++) solid(`stair-${i}`,393+i*1.1,(i+1)*.28,1.1,(i+1)*.28,'stone');
  solid('palace-dais',404,1.12,17,1.12,'stone');
  enemies.push({id:'elite',x:405,y:1.12,w:1.55,h:1.6,minX:400,maxX:408,speed:1.65,hp:3,elite:true,chunk:16});
  return {
    length:420, regions:REGIONS.map(r=>({...r})), chunks, solids, coins, enemies, mechanisms,
    checkpoints:REGIONS.map((r,i)=>({id:`checkpoint-${i}`,x:r.start+3,y:0,name:r.name})),
    goal:{x:412,y:1.12},
  };
}
