// All coordinates are world units. Solids use centres; actors use feet.
// The renderer and physics both consume this table; meshes are never colliders.
export const REGIONS = [
  { id: 'bamboo', name: '青竹林', subtitle: '竹影初行', start: 0, end: 100 },
  { id: 'village', name: '山间村', subtitle: '檐上人家', start: 100, end: 200 },
  { id: 'water', name: '水桥渡', subtitle: '一苇渡江', start: 200, end: 300 },
  { id: 'palace', name: '宫门前', subtitle: '长路归城', start: 300, end: 400 },
  { id: 'grotto', name: '石窟栈道', subtitle: '万仞慈航', start: 400, end: 600 },
  { id: 'sky', name: '云海天宫', subtitle: '踏云问天', start: 600, end: 800 },
];

export function createLevelData() {
  const chunks = Array.from({ length: 32 }, (_, id) => ({
    id, start: id * 25, end: (id + 1) * 25,
    theme: REGIONS.find((r) => id * 25 < r.end)?.id ?? 'palace',
  }));
  const solids = [];
  const coins = [];
  const enemies = [];
  const mechanisms = [];
  const traps = [];
  const chunkAt = (x) => Math.max(0, Math.floor(x / 25));
  function solid(id, x, top, w, h, type, extra = {}) {
    solids.push({ id, x, y: top - h / 2, w, h, type, chunk: chunkAt(x), ...extra });
  }
  function coin(x, y, extra = {}) {
    coins.push({ id: `coin-${coins.length}`, x, y, chunk: chunkAt(x), ...extra });
  }
  // Short gaps on the low route; every section also offers a rewarded high route.
  const groundRuns = [[-8,47],[50,91],[94,142],[145,190],[193,218],
    [221,243],[245,267],[269,292],[294,341],[344,380],[383,430],
    [433,468],[471,512],[515,558],[561,598],[601,632],[635,672],[675,711],[714,752],[755,800]];
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
    enemies.push({ id:`goomba-${index}-1`, x:x+51,y:0,w:0.9,h:0.85,minX:x+48,maxX:x+56,speed:1.5+index*.15,hp:1,chunk:chunkAt(x+51) });
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
  const trap=(id,type,x,y,combo,extra={})=>traps.push({id,type,x,y,combo,chunk:chunkAt(x),period:2.4,phase:0,damage:1,...extra});
  // Every live hazard belongs to a readable 3–6 beat sequence. A ghosted,
  // non-damaging preview always appears before that hazard's first live use.
  [['spikes',50],['retractingSpikes',55],['flame',63],['pendulum',110],['blade',205],['flyingBlade',305],['rockfall',405],['rollingRock',420]].forEach(([type,x],i)=>
    trap(`preview-${type}`,type,x,0,'safe-demonstrations',{preview:true,damage:0,phase:i*.17,template:'preview'}));
  // A: jump → dash → jump tutorial.
  trap('bamboo-jump','spikes',60,0,'a-jump-dash-jump',{template:'jump-dash-jump',difficulty:1,w:1.6});
  trap('bamboo-dash','flame',72,0,'a-jump-dash-jump',{template:'jump-dash-jump',difficulty:1,period:3.2,phase:.48,h:2.1});
  trap('bamboo-finish','retractingSpikes',84,0,'a-jump-dash-jump',{template:'jump-dash-jump',difficulty:1,period:2.6,phase:.2,w:1.5});
  // B: three pendulums with evenly offset phases.
  for(let i=0;i<3;i++)trap(`village-pendulum-${i}`,'pendulum',124+i*7,3.35,'b-pendulum-array',{template:'pendulum-array',difficulty:2,period:3.3,phase:i/3,range:2.25});
  // C: alternating bridge fire and blades.
  trap('water-fire-a','flame',224,0,'c-alternating-fire',{template:'alternating-fire',difficulty:3,period:3,phase:.05,h:2});
  trap('water-blade','blade',234,1.1,'c-alternating-fire',{template:'alternating-fire',difficulty:3,period:2.8,phase:.4,range:1.4});
  trap('water-fire-b','flame',244,0,'c-alternating-fire',{template:'alternating-fire',difficulty:3,period:3,phase:.55,h:2});
  // D: short reaction corridor.
  trap('palace-flying-a','flyingBlade',326,1.1,'d-running-corridor',{template:'running-corridor',difficulty:4,period:2.6,phase:.1,range:1.8});
  trap('palace-rockfall','rockfall',338,7,'d-running-corridor',{template:'running-corridor',difficulty:4,triggerX:6,delay:.8});
  trap('palace-flying-b','flyingBlade',350,1.3,'d-running-corridor',{template:'running-corridor',difficulty:4,period:2.5,phase:.6,range:2});
  // E: continuous grotto gauntlet over collapsing boards.
  trap('grotto-rock','rollingRock',452,.6,'e-grotto-gauntlet',{template:'running-corridor',difficulty:5,period:3.8,range:4.5});
  trap('grotto-flying','flyingBlade',466,1.3,'e-grotto-gauntlet',{template:'running-corridor',difficulty:5,period:2.4,phase:.25,range:2});
  trap('grotto-fall','rockfall',480,8,'e-grotto-gauntlet',{template:'running-corridor',difficulty:5,triggerX:7,delay:.7});
  // F: a rolling pursuit, then an elite guard ring before South Heaven Gate.
  trap('sky-pursuit','rollingRock',630,.7,'f-graduation-run',{template:'graduation-run',difficulty:6,pursuit:true,endX:705,chaseSpeed:7.2});
  trap('sky-fire','flame',660,0,'f-graduation-run',{template:'graduation-run',difficulty:6,period:2.6,phase:.35,h:2.3});
  trap('sky-flying','flyingBlade',675,1.5,'f-graduation-run',{template:'graduation-run',difficulty:6,period:2.1,phase:.65,range:2.3});
  trap('guard-spikes','spikes',764,0,'f-elite-guard',{template:'elite-guard',difficulty:6,w:1.5});
  trap('guard-blade','blade',771,2.2,'f-elite-guard',{template:'elite-guard',difficulty:6,period:2.4,range:1.5});
  trap('guard-flame','flame',782,2.2,'f-elite-guard',{template:'elite-guard',difficulty:6,period:2.8,phase:.55,h:2});
  // Palace finale, followed by the cave's slowly breathing Buddha palms.
  for(let i=0;i<4;i++)solid(`stair-${i}`,383+i*1.1,(i+1)*.28,1.1,(i+1)*.28,'stone');
  solid('palace-dais',393,1.12,13,1.12,'stone');
  enemies.push({id:'elite-palace',x:393,y:1.12,w:1.55,h:1.6,minX:389,maxX:397,speed:1.65,hp:3,elite:true,chunk:15});
  solid('buddha-palm-low',468,2.2,6.5,.72,'moving',{baseX:468,baseY:1.84,range:1.3,speed:.36,axis:'y'});
  solid('buddha-palm-high',535,4.1,7.2,.72,'moving',{baseX:535,baseY:3.74,range:2.1,speed:.3,axis:'x'});
  solid('grotto-ledger',575,5.2,11,.7,'stone');
  // Cloud steps climb toward the golden South Heaven Gate.
  for(let i=0;i<7;i++)solid(`cloud-step-${i}`,690+i*5,1.1+i*.68,4.2,.5,'stone');
  solid('sky-final-dais',785,2.2,27,1.2,'stone');
  enemies.push({id:'elite-sky',x:775,y:0,w:1.55,h:1.6,minX:770,maxX:780,speed:1.9,hp:3,elite:true,chunk:31});
  return {
    length:800, regions:REGIONS.map(r=>({...r})), chunks, solids, coins, enemies, mechanisms, traps,
    checkpoints:REGIONS.map((r,i)=>({id:`checkpoint-${i}`,x:r.start+3,y:0,name:r.name})),
    goal:{x:792,y:2.2},
  };
}
