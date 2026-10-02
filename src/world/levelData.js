// Premium-slice level data. Gameplay collision remains 2D and is the only
// source of truth; the renderer samples this table for every road-side prop.
export const REGIONS=[{id:'gorge',name:'玄竹峡',subtitle:'雾锁古桥',start:0,end:96}];

export function createLevelData(){
  const chunks=Array.from({length:4},(_,id)=>({id,start:id*24,end:(id+1)*24,theme:'gorge'}));
  const solids=[],coins=[],enemies=[],mechanisms=[],traps=[];
  const chunkAt=x=>Math.max(0,Math.min(3,Math.floor(x/24)));
  const solid=(id,x,top,w,h,type='ground',extra={})=>solids.push({id,x,y:top-h/2,w,h,type,chunk:chunkAt(x),...extra});
  const coin=(x,y,extra={})=>coins.push({id:`coin-${coins.length}`,x,y,chunk:chunkAt(x),...extra});
  const trap=(id,type,x,y,combo,extra={})=>traps.push({id,type,x,y,combo,chunk:chunkAt(x),period:3,phase:0,damage:1,telegraph:.65,...extra});

  solid('gorge-west',9,0,22,4.2,'ground');
  solid('gorge-approach',26,.15,12,3.4,'stone');
  solid('rope-bridge',45,.05,26,.6,'wood',{visual:'ropeBridge'});
  solid('gorge-east',65,.2,14,3.8,'stone');
  solid('gorge-shrine',83,.45,22,4.5,'ground');
  solid('reward-overlook',91,2.15,6,.65,'stone');
  solid('rhythm-plank',52,1.45,4.8,.5,'moving',{baseX:52,baseY:1.2,range:1.35,speed:1.05,axis:'y'});
  solid('warning-board',61,1.35,4.5,.48,'crumble');

  // Four readable phrases: introduce → pressure → climax → reward/chase.
  for(let i=0;i<3;i++)trap(`pendulum-${i}`,'pendulum',13+i*4.3,5.9,'intro-two-beat',{template:'pendulum-array',difficulty:1,period:3.6,phase:i/3,range:1.6});
  for(let i=0;i<3;i++)trap(`spike-${i}`,'retractingSpikes',31+i*3.7,.15,'pressure-spikes',{template:'telegraphed-spikes',difficulty:2,period:3,phase:i*.22,w:1.3,telegraph:.75});
  trap('climax-flame','flame',57,.2,'climax-collapse',{template:'collapse-run',difficulty:3,period:3.4,phase:.15,h:2.1});
  trap('climax-fall-a','rockfall',62,7,'climax-collapse',{template:'collapse-run',difficulty:3,triggerX:5.5,delay:.9,telegraph:.9});
  trap('climax-fall-b','rockfall',67,8,'climax-collapse',{template:'collapse-run',difficulty:3,triggerX:5,delay:1.15,telegraph:1.15});
  trap('chase-rock','rollingRock',76,.75,'final-chase',{template:'pursuit',difficulty:4,pursuit:true,endX:87,chaseSpeed:6.8});
  trap('chase-spike-a','retractingSpikes',81,.45,'final-chase',{template:'pursuit',difficulty:4,period:2.8,phase:.1,w:1.2});
  trap('chase-spike-b','retractingSpikes',86,.45,'final-chase',{template:'pursuit',difficulty:4,period:2.8,phase:.58,w:1.2});

  [[23,1.3],[27,1.5],[42,1.25],[46,1.45],[50,1.25],[70,1.35],[73,1.6],[89,2.9],[91,3.35],[93,2.9]].forEach(([x,y])=>coin(x,y));
  enemies.push(
    {id:'mushroom-scout',type:'mushroom-melee',x:27,y:.15,w:1,h:.95,minX:24,maxX:29,speed:1.55,hp:3,damage:1,aggro:6,chunk:1},
    {id:'mushroom-guard',type:'mushroom-melee',x:72,y:.2,w:1.05,h:1,minX:69,maxX:75,speed:1.7,hp:4,damage:1,aggro:7,chunk:3},
  );

  return{
    length:96,regions:REGIONS.map(r=>({...r})),chunks,solids,coins,enemies,mechanisms,traps,
    checkpoints:[{id:'west-marker',x:3,y:0,name:'玄竹峡'},{id:'bridge-marker',x:54,y:.2,name:'古桥东岸'}],
    goal:{x:92,y:2.15},
    roadSpline:[[0,0,0],[18,0,-.15],[34,.15,.25],[47,.05,0],[60,.2,-.2],[76,.45,.2],[96,2.15,0]],
  };
}
