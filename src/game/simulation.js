import {FIXED_DT,bounds,solidBounds,overlaps,moveBody,findSupport,isSolid} from '../physics/collision.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(value,target,amount)=>value<target?Math.min(value+amount,target):Math.max(value-amount,target);
export class Simulation {
  constructor(level) { this.level=level; this.reset(); }
  reset() {
    this.solids=this.level.solids.map(s=>({...s,enabled:true,revealed:!s.hidden,crumbleTimer:0,restoreAt:0}));
    this.coins=this.level.coins.map(c=>({...c,collected:false,revealed:!c.hidden}));
    this.enemies=this.level.enemies.map(e=>({...e,maxHp:e.hp,alive:true,direction:-1,vx:0,vy:0,grounded:false,squash:0,stompCooldown:0}));
    this.mechanisms=this.level.mechanisms.map(m=>({...m,cooldown:0}));
    this.traps=(this.level.traps||[]).map(t=>({...t,active:false,currentX:t.x,currentY:t.y,triggered:false,triggerTime:0}));
    this.player={x:3,y:.02,w:.8,h:1.65,vx:0,vy:0,grounded:false,supportId:null,facing:1,invulnerable:0,
      jumpsUsed:0,dashTime:0,dashCooldown:0,attackTime:0,attackCooldown:0,hurtTime:0};
    this.status='ready'; this.score=0; this.coinsCollected=0; this.lives=3;
    this.elapsed=0; this.checkpointIndex=0; this.region=this.level.regions[0];
    this.events=[]; this.secrets=new Set(); this.coyote=0; this.jumpBuffer=0;
    this.pipeCooldown=0; this.springCooldown=0; this.accumulator=0;this.hitStop=0;
    this.pendingJump=false; this.pendingInteract=false;this.pendingAttack=false;this.pendingDash=false;
  }
  start() { if(this.status==='ready') { this.status='playing'; this.emit('region',{name:this.region.name}); } }
  emit(type,data={}) { this.events.push({type,...data}); }
  drainEvents() { const events=this.events; this.events=[]; return events; }
  // Render time never reaches physics directly. Clamp background-tab catch-up to 0.1s.
  advance(frameDt,input={}) {
    if(this.status!=='playing') { this.accumulator=0; return; }
    this.pendingJump ||= !!input.jumpPressed;
    this.pendingInteract ||= !!input.interactPressed;
    this.pendingAttack ||= !!input.attackPressed;
    this.pendingDash ||= !!input.dashPressed;
    this.accumulator+=clamp(frameDt,0,.1);
    while(this.accumulator+1e-10>=FIXED_DT) {
      this.step(FIXED_DT,{...input,jumpPressed:this.pendingJump,interactPressed:this.pendingInteract,attackPressed:this.pendingAttack,dashPressed:this.pendingDash});
      this.pendingJump=false; this.pendingInteract=false;this.pendingAttack=false;this.pendingDash=false;
      this.accumulator-=FIXED_DT;
      if(this.status!=='playing') { this.accumulator=0; break; }
    }
  }
  localSolids(x=this.player.x) { return this.solids.filter(s=>Math.abs(s.x-x)<s.w/2+28); }
  reveal(secret) {
    if(!secret || this.secrets.has(secret)) return;
    this.secrets.add(secret);
    this.coins.forEach(c=>{if(c.secret===secret)c.revealed=true;});
    this.score+=150; this.emit('secret',{name:this.region.name,x:this.player.x,y:this.player.y+1});
  }
  loseLife(reason) {
    if(this.status!=='playing') return;
    this.lives--; this.emit('hurt',{reason,x:this.player.x,y:this.player.y+1});
    if(this.lives<=0) { this.lives=0; this.status='gameOver'; this.emit('gameOver'); return; }
    const cp=this.level.checkpoints[this.checkpointIndex];
    Object.assign(this.player,{x:cp.x,y:cp.y+.02,vx:0,vy:0,grounded:false,supportId:null,invulnerable:1.6});
    this.coyote=0;this.jumpBuffer=0;this.springCooldown=.3;this.pipeCooldown=.5;
    this.emit('respawn',{x:cp.x,name:cp.name});
  }
  damagePlayer(reason,source){
    if(this.player.invulnerable>0||this.player.dashTime>0)return false;
    this.player.hurtTime=.45;this.loseLife(reason);if(source)this.emit('trapHit',{x:source.currentX??source.x,y:source.currentY??source.y,type:source.type});return true;
  }
  updatePlatforms(dt,solids) {
    const p=this.player;
    for(const s of solids) {
      if(s.type==='crumble') {
        if(s.crumbleTimer>0) {
          s.crumbleTimer-=dt;
          if(s.crumbleTimer<=0) {s.enabled=false;s.restoreAt=this.elapsed+4;this.emit('crumble',{x:s.x,y:s.y});}
        } else if(!s.enabled && this.elapsed>=s.restoreAt) {
          // Never restore a platform through a player or an enemy.
          if(![p,...this.enemies.filter(e=>e.alive)].some(b=>overlaps(bounds(b),solidBounds(s)))) s.enabled=true;
        }
      }
      if(s.type!=='moving') continue;
      const oldX=s.x,oldY=s.y;
      const next=(s.axis==='y'?s.baseY:s.baseX)+Math.sin(this.elapsed*s.speed)*s.range;
      if(s.axis==='y')s.y=next;else s.x=next;
      const dx=s.x-oldX,dy=s.y-oldY;
      for(const actor of [p,...this.enemies.filter(e=>e.alive && Math.abs(e.x-s.x)<10)]) {
        const snapshot={...actor};
        let pushX=0,pushY=0;
        if(actor.supportId===s.id && actor.grounded) {pushX=dx;pushY=dy;}
        else if(overlaps(bounds(actor),solidBounds(s))) {
          const a=bounds(actor),b=solidBounds(s);
          if(Math.abs(dy)>Math.abs(dx)) pushY=dy>0?b.top-a.bottom:b.bottom-a.top;
          else pushX=dx>0?b.right-a.left:b.left-a.right;
        }
        if(!pushX && !pushY)continue;
        const desiredX=actor.x+pushX,desiredY=actor.y+pushY;
        moveBody(actor,pushX,pushY,solids,{ignoreId:s.id});
        if(Math.abs(actor.x-desiredX)>.001 || Math.abs(actor.y-desiredY)>.001) {
          Object.assign(actor,snapshot);s.x=oldX;s.y=oldY;break;
        }
      }
    }
  }
  step(dt,input={}) {
    if(this.status!=='playing')return;
    if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt);return;}
    this.elapsed+=dt;
    const p=this.player;
    const solids=this.localSolids();
    p.invulnerable=Math.max(0,p.invulnerable-dt);
    p.hurtTime=Math.max(0,p.hurtTime-dt);
    p.dashCooldown=Math.max(0,p.dashCooldown-dt);p.dashTime=Math.max(0,p.dashTime-dt);
    p.attackCooldown=Math.max(0,p.attackCooldown-dt);p.attackTime=Math.max(0,p.attackTime-dt);
    this.pipeCooldown=Math.max(0,this.pipeCooldown-dt);
    this.springCooldown=Math.max(0,this.springCooldown-dt);
    this.updatePlatforms(dt,solids);
    const support=findSupport(p,solids);
    p.grounded=!!support && p.vy<=0;
    p.supportId=p.grounded?support.id:null;
    if(p.grounded)p.jumpsUsed=0;
    this.coyote=p.grounded?.1:Math.max(0,this.coyote-dt);
    this.jumpBuffer=input.jumpPressed?.13:Math.max(0,this.jumpBuffer-dt);
    const direction=clamp(input.move??0,-1,1);
    if(direction)p.facing=Math.sign(direction);
    if(input.dashPressed && p.dashCooldown<=0){p.dashTime=.2;p.dashCooldown=1;p.invulnerable=Math.max(p.invulnerable,.26);p.vy=Math.max(p.vy,0);this.emit('dash',{x:p.x,y:p.y+1,facing:p.facing});}
    if(input.attackPressed && p.attackCooldown<=0){p.attackTime=.24;p.attackCooldown=.4;this.attack();}
    p.vx=p.dashTime>0?p.facing*18:approach(p.vx,direction*8.2,(p.grounded?62:37)*dt);
    if(this.jumpBuffer>0 && this.coyote>0) {
      p.vy=12; p.grounded=false; p.supportId=null;
      p.jumpsUsed=1;this.coyote=0;this.jumpBuffer=0;this.emit('jump',{x:p.x,y:p.y});
    } else if(input.jumpPressed && !p.grounded && p.jumpsUsed<2) {
      p.vy=9.6;p.jumpsUsed=2;this.jumpBuffer=0;this.springCooldown=.2;
      this.emit('doubleJump',{x:p.x,y:p.y+.1});
    }
    if(!input.jumpHeld && p.vy>6 && this.springCooldown<=0) p.vy=6;
    p.vy-= (p.vy>0?25:21)*dt;
    p.vy=Math.max(-42,p.vy);
    const previous={x:p.x,y:p.y,vy:p.vy};
    const hit=moveBody(p,p.vx*dt,p.vy*dt,solids,{stepHeight:.32});
    p.x=clamp(p.x,-5,this.level.length+3);
    p.grounded=hit.landed; p.supportId=hit.supportId;
    if(hit.landed && hit.impact>7) this.emit('land',{impact:hit.impact});
    for(const id of hit.revealed)this.reveal(this.solids.find(s=>s.id===id)?.secret);
    if(hit.supportId) {
      const floor=solids.find(s=>s.id===hit.supportId);
      if(floor.type==='crumble' && floor.crumbleTimer===0)floor.crumbleTimer=.65;
    }
    if(p.y<-8 || (p.x>=200 && p.x<300 && p.y<-1.6)) {this.loseLife('fall');return;}
    this.updateEnemies(dt,previous);
    if(this.status!=='playing' || (previous.x!==p.x && p.invulnerable>1.59))return;
    this.updateTraps(dt);
    if(this.status!=='playing' || p.invulnerable>1.59)return;
    this.updateMechanisms(input);
    for(const coin of this.coins) {
      if(coin.collected || !coin.revealed)continue;
      const a=bounds(p);
      if(overlaps(a,{left:coin.x-.38,right:coin.x+.38,bottom:coin.y-.38,top:coin.y+.38})) {
        coin.collected=true;this.coinsCollected++;this.score+=100;this.emit('coin',{x:coin.x,y:coin.y});
      }
    }
    for(let i=1;i<this.level.checkpoints.length;i++) {
      if(i>this.checkpointIndex && p.x>=this.level.checkpoints[i].x) {
        this.checkpointIndex=i;this.emit('checkpoint',{name:this.level.checkpoints[i].name});
      }
    }
    const region=this.level.regions.find(r=>p.x>=r.start && p.x<r.end)??this.region;
    if(region.id!==this.region.id) {this.region=region;this.emit('region',{name:region.name});}
    const goal=this.level.goal;
    if(p.x+p.w/2>=goal.x && p.y>=goal.y-.15 && p.y<goal.y+7) {
      this.status='won';this.score+=1000+this.lives*200;this.emit('win');
    }
  }
  updateEnemies(dt,previous) {
    const p=this.player;
    for(const e of this.enemies) {
      e.squash=Math.max(0,e.squash-dt);e.stompCooldown=Math.max(0,e.stompCooldown-dt);
      if(!e.alive){if(e.defeatTime>0){e.defeatTime-=dt;e.x+=e.knockVx*dt;e.y+=e.knockVy*dt;e.knockVy-=20*dt;}continue;}
      if(Math.abs(e.x-p.x)>38)continue;
      const solids=this.localSolids(e.x);
      e.vx=e.direction*e.speed;
      e.vy=Math.max(-42,e.vy-21*dt);
      const hit=moveBody(e,e.vx*dt,e.vy*dt,solids,{stepHeight:.32});
      e.grounded=hit.landed;e.supportId=hit.supportId;
      if(hit.wall || e.x<=e.minX || e.x>=e.maxX) {
        e.x=clamp(e.x,e.minX,e.maxX);e.direction*=-1;
      } else if(e.grounded) {
        const probe={...e,x:e.x+e.direction*(e.w/2+.12),w:.1};
        if(!findSupport(probe,solids,.06))e.direction*=-1;
      }
      if(e.y<-8){e.alive=false;continue;}
      const a=bounds(p),b=bounds(e);
      const acrossX=a.right>b.left && a.left<b.right;
      // Swept feet-vs-head crossing catches fast falls even if final boxes don't overlap.
      const stomp=acrossX && previous.vy<0 && previous.y>=b.top-.08 && p.y<=b.top+.02;
      if(stomp && e.stompCooldown<=0) {
        p.y=b.top+.01;p.vy=10.2;p.grounded=false;p.supportId=null;
        this.springCooldown=.25;e.hp--;e.squash=.28;e.stompCooldown=.4;
        if(e.hp<=0){e.alive=false;e.defeatTime=.55;e.knockVx=0;e.knockVy=4;this.score+=e.elite?750:250;}
        else {e.direction=p.x<e.x?1:-1;this.score+=100;}
        this.emit('stomp',{x:e.x,y:b.top,elite:e.elite,hp:e.hp});
      } else if(overlaps(a,b) && p.invulnerable<=0 && e.stompCooldown<=0) {
        this.damagePlayer('enemy',e);return;
      }
    }
  }
  attack(){
    const p=this.player;let hits=0;
    for(const e of this.enemies){
      if(!e.alive)continue;const dx=(e.x-p.x)*p.facing,dy=(e.y+e.h*.5)-(p.y+p.h*.55);
      const distance=Math.hypot(dx,dy);
      if(dx<-.2||dx>2.15||distance>2.2||Math.abs(dy)>1.75)continue;
      e.hp--;e.stompCooldown=.38;e.squash=.3;hits++;
      if(e.hp<=0){e.alive=false;e.defeatTime=.65;e.knockVx=p.facing*8;e.knockVy=8;this.score+=e.elite?750:250;}
      else {e.direction=p.facing;e.x+=p.facing*.16;this.score+=100;}
      this.emit('strike',{x:e.x,y:e.y+e.h*.65,elite:e.elite,hp:e.hp});
    }
    this.emit('attack',{x:p.x+p.facing*1.1,y:p.y+1,facing:p.facing,hit:hits>0});
    if(hits){this.hitStop=.045;}
  }
  updateTraps(dt){
    const p=this.player,a=bounds(p),time=this.elapsed;
    for(const t of this.traps){
      const cycle=((time/t.period+(t.phase||0))%1+1)%1;t.active=false;t.currentX=t.x;t.currentY=t.y;
      if(t.type==='spikes')t.active=true;
      if(t.type==='retractingSpikes')t.active=cycle>.38&&cycle<.76;
      if(t.type==='flame')t.active=cycle>.16&&cycle<.61;
      if(t.type==='pendulum'){const angle=Math.sin(cycle*Math.PI*2)*1.05;t.currentX=t.x+Math.sin(angle)*(t.range||2.5);t.currentY=t.y-Math.cos(angle)*2.5;t.active=true;}
      if(t.type==='blade'){t.currentX=t.x+Math.sin(cycle*Math.PI*2)*(t.range||1.6);t.active=true;}
      if(t.type==='flyingBlade'){t.currentX=t.x+Math.sin(cycle*Math.PI*2)*(t.range||2.2);t.active=true;}
      if(t.type==='rollingRock'){t.currentX=t.x-(t.range||5)+cycle*(t.range||5)*2;t.active=true;}
      if(t.type==='rockfall'){
        if(!t.triggered&&Math.abs(p.x-t.x)<(t.triggerX||6)){t.triggered=true;t.triggerTime=time+(t.delay||.6);this.emit('trapTrigger',{x:t.x,y:t.y,type:t.type});}
        if(t.triggered&&time>=t.triggerTime){t.currentY=t.y-(time-t.triggerTime)*9;t.active=t.currentY>-2;if(!t.active&&time-t.triggerTime>2.5){t.triggered=false;}}
      }
      if(t.preview||!t.active)continue;
      let hazard;
      if(t.type==='flame')hazard={left:t.x-.36,right:t.x+.36,bottom:t.y,top:t.y+(t.h||2.2)};
      else if(t.type==='spikes'||t.type==='retractingSpikes')hazard={left:t.x-(t.w||1.6)*.43,right:t.x+(t.w||1.6)*.43,bottom:t.y,top:t.y+.44};
      else {const radius=(t.type==='rollingRock'||t.type==='rockfall')?0.58:0.4;hazard={left:t.currentX-radius,right:t.currentX+radius,bottom:t.currentY-radius,top:t.currentY+radius};}
      if(overlaps(a,hazard)&&this.damagePlayer(`trap:${t.type}`,t))break;
    }
  }
  updateMechanisms(input) {
    const p=this.player;
    for(const m of this.mechanisms) {
      if(Math.abs(p.x-m.x)>.8 || Math.abs(p.y-m.y)>.35)continue;
      if(m.type==='spring' && p.vy<=0 && this.springCooldown<=0) {
        p.vy=21;p.grounded=false;p.supportId=null;this.springCooldown=.85;
        this.emit('spring',{x:m.x,y:m.y});
      }
      if(m.type==='pipe' && input.interactPressed && this.pipeCooldown<=0) {
        Object.assign(p,{x:m.targetX,y:m.targetY,vx:0,vy:0,grounded:false,supportId:null});
        this.pipeCooldown=1;this.emit('pipe',{x:p.x,y:p.y});
        if(m.id==='pipe-village-in')this.reveal('village');
        break;
      }
    }
  }
}
