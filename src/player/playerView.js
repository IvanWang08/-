import * as THREE from 'three';

const mat = (color, roughness=.78) => new THREE.MeshStandardMaterial({color,roughness});
const materials = {
  red:mat('#9f4038'), redDark:mat('#682b2a'), blue:mat('#345b71'), blueDark:mat('#263f50'),
  skin:mat('#c89470'), cloth:mat('#b6a178'), ink:mat('#242b29'), gold:mat('#b7954f',.42), sole:mat('#473b31'),
};
function mesh(geometry, material, parent, position, scale=[1,1,1]) {
  const item=new THREE.Mesh(geometry,material);item.position.set(...position);item.scale.set(...scale);
  item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;
}

export function createPlayerView(scene) {
  const root=new THREE.Group(); root.name='hero'; scene.add(root);
  const sphere=new THREE.SphereGeometry(.5,16,10);
  const cylinder=new THREE.CylinderGeometry(.5,.5,1,12);
  const box=new THREE.BoxGeometry(1,1,1);
  const torso=mesh(sphere,materials.red,root,[0,.9,0],[.75,.73,.58]);
  const head=mesh(sphere,materials.skin,root,[0,1.5,0],[.61,.58,.55]);
  const cap=mesh(sphere,materials.red,root,[0,1.79,-.015],[.66,.28,.6]);
  mesh(box,materials.red,root,[.18,1.73,.38],[.58,.08,.36]);
  mesh(sphere,materials.skin,root,[0,1.43,.52],[.17,.15,.18]);
  mesh(sphere,materials.ink,root,[0,1.29,.525],[.35,.09,.12]);
  for(const side of [-1,1]) {
    mesh(sphere,materials.ink,root,[side*.19,1.58,.51],[.055,.1,.04]);
    mesh(sphere,materials.skin,root,[side*.49,1.04,0],[.19,.2,.2]);
  }
  const bib=mesh(box,materials.blue,root,[0,.82,.39],[.55,.58,.1]);
  mesh(box,materials.cloth,root,[0,1.08,.45],[.67,.1,.09]);
  mesh(cylinder,materials.gold,root,[0,1.08,.51],[.095,.05,.095],[Math.PI/2,0,0]);
  for(const side of [-1,1]) mesh(cylinder,materials.blueDark,root,[side*.2,.89,.44],[.055,.7,.055]);
  const legs=[],arms=[];
  for(const side of [-1,1]) {
    const leg=new THREE.Group();leg.position.set(side*.21,.48,0);root.add(leg);legs.push(leg);
    mesh(cylinder,materials.blue,leg,[0,-.12,0],[.17,.52,.17]);
    mesh(sphere,materials.sole,leg,[0,-.39,.09],[.25,.16,.35]);
    const arm=new THREE.Group();arm.position.set(side*.4,1.12,0);root.add(arm);arms.push(arm);
    mesh(cylinder,materials.redDark,arm,[0,-.22,0],[.13,.48,.13]);
  }
  const staffPivot=new THREE.Group();staffPivot.position.set(.34,1.08,.22);root.add(staffPivot);
  const staff=mesh(cylinder,materials.gold,staffPivot,[.75,0,0],[.075,2.75,.075]);staff.rotation.z=Math.PI/2;
  for(const x of [-.48,1.98]){
    const band=mesh(cylinder,materials.redDark,staffPivot,[x,0,0],[.102,.13,.102]);band.rotation.z=Math.PI/2;
  }
  let squash=0;
  function update(player,time,event={}) {
    if(event.stomp)squash=.12;
    squash=Math.max(0,squash-1/60);
    root.position.set(player.x,player.y,0);
    root.rotation.y=player.facing>=0?0:Math.PI;
    const speed=Math.min(1,Math.abs(player.vx)/7);
    const stride=Math.sin(time*12)*.55*speed;
    legs[0].rotation.x=stride;legs[1].rotation.x=-stride;
    arms[0].rotation.x=-stride*.65;arms[1].rotation.x=stride*.65;
    root.rotation.z=player.grounded?Math.sin(time*12)*.018*speed:-player.vx*.012;
    root.scale.set(1+squash*.7,1-squash*1.8,1+squash*.7);
    const blink=player.invulnerable>0 && Math.floor(time*14)%2===0;
    root.visible=!blink;
    bib.rotation.z=Math.sin(time*3)*.015;
    torso.rotation.y=Math.sin(time*2)*.012;
    head.rotation.y=Math.sin(time*1.7)*.02;
    cap.rotation.z=Math.sin(time*2.3)*.01;
    const swing=player.attackTime>0?1-player.attackTime/.24:0;
    staffPivot.rotation.z=player.attackTime>0?1.25-swing*2.65:-.3;
    staffPivot.rotation.x=player.attackTime>0?Math.sin(swing*Math.PI)*.38:0;
    staffPivot.position.y=1.08+Math.sin(swing*Math.PI)*.15;
  }
  return {root,update,dispose(){scene.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}};
}
