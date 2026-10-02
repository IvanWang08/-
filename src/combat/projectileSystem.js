const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class ProjectileSystem{
  constructor({damageBus,emit}){this.damageBus=damageBus;this.emit=emit;this.projectiles=[];this.fields=[];this.serial=0;}
  reset(){this.projectiles.length=0;this.fields.length=0;this.serial=0;}
  spawnWave({x,y,direction=1,vy=0,config,source='sword-wave',createsField=false}){this.projectiles.push({id:`wave-${++this.serial}`,x,y,vx:direction*config.speed,vy,life:config.lifetime??1.25,radius:config.radius,damage:config.damage,splashRadius:config.splashRadius??config.radius,source,createsField,hit:new Set()});this.emit('swordWave',{x,y,direction,vy});}
  spawnFan(player,config){const spread=[-.52,-.26,0,.26,.52];for(let i=0;i<config.waveCount;i++)this.spawnWave({x:player.x+player.facing*.7,y:player.y+1,direction:player.facing,vy:spread[i]*4.8,config:{...config,lifetime:1.2},source:'sword-field',createsField:i===Math.floor(config.waveCount/2)});this.emit('swordFieldCast',{x:player.x,y:player.y+1});}
  update(dt,enemies){
    for(const wave of this.projectiles){wave.life-=dt;wave.x+=wave.vx*dt;wave.y+=wave.vy*dt;for(const enemy of enemies){if(!enemy.alive||wave.hit.has(enemy.id)||distance(wave,{x:enemy.x,y:enemy.y+enemy.h*.5})>wave.radius+enemy.w*.55)continue;wave.hit.add(enemy.id);this.damageBus.emit({targetId:enemy.id,amount:wave.damage,source:wave.source,x:wave.x,y:wave.y});for(const splash of enemies)if(splash.alive&&!wave.hit.has(splash.id)&&distance(enemy,splash)<=wave.splashRadius){wave.hit.add(splash.id);this.damageBus.emit({targetId:splash.id,amount:wave.damage*.55,source:`${wave.source}:splash`,x:splash.x,y:splash.y});}if(wave.createsField)this.fields.push({x:wave.x,y:wave.y,radius:2.4,life:2,tick:0,damage:.35,slow:.45});wave.life=0;break;}}
    this.projectiles=this.projectiles.filter(p=>p.life>0);
    for(const field of this.fields){field.life-=dt;field.tick-=dt;if(field.tick<=0){field.tick=.25;for(const enemy of enemies)if(enemy.alive&&distance(field,enemy)<=field.radius){enemy.slowFactor=field.slow;this.damageBus.emit({targetId:enemy.id,amount:field.damage,source:'sword-intent-field',x:enemy.x,y:enemy.y});}}}
    this.fields=this.fields.filter(f=>f.life>0);for(const enemy of enemies)enemy.slowFactor=Math.min(1,(enemy.slowFactor??1)+dt*.7);
  }
}
