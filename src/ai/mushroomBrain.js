export class MushroomBrain{
  update(enemy,player,dt){
    enemy.stateTime=(enemy.stateTime??0)+dt;enemy.hitTime=Math.max(0,(enemy.hitTime??0)-dt);
    if(!enemy.alive)return this.set(enemy,'death');
    if(enemy.hitTime>0)return this.set(enemy,'hurt');
    const dx=player.x-enemy.x,distance=Math.abs(dx),aggro=enemy.aggro??6.5;
    if(enemy.aiState==='patrol'&&distance<aggro){this.set(enemy,'discover');return {speed:0};}
    if(enemy.aiState==='discover'&&enemy.stateTime<.38)return {speed:0};
    if(distance<(enemy.attackRange??1.1)){this.set(enemy,'attack');return {speed:0,attack:enemy.stateTime>.42};}
    if(distance<aggro*1.45){this.set(enemy,'chase');enemy.direction=Math.sign(dx)||enemy.direction;return {speed:enemy.speed*(enemy.slowFactor??1),hop:enemy.grounded&&enemy.stateTime>.72};}
    this.set(enemy,'patrol');return {speed:enemy.speed*.65*(enemy.slowFactor??1)};
  }
  set(enemy,state){if(enemy.aiState!==state){enemy.aiState=state;enemy.stateTime=0;}return {speed:0};}
}
