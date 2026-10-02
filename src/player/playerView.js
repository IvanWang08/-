import * as THREE from 'three';
import {createModelPipeline} from './modelPipeline.js';

const mat=(color,roughness=.72,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
const materials={cinnabar:mat('#a83f35',.62),crimson:mat('#63272a',.7),indigo:mat('#244c69',.78),silk:mat('#e3c991',.82),skin:mat('#d0a077',.84),ink:mat('#202827',.7),iron:mat('#252d33',.3,{metalness:.76}),gold:mat('#f0b840',.2,{metalness:.9,emissive:'#7c4b0d',emissiveIntensity:.22}),ghost:mat('#ffd86a',.26,{metalness:.65,transparent:true,opacity:.18,depthWrite:false}),sole:mat('#46362f',.9)};
function mesh(geometry,material,parent,position,scale=[1,1,1],rotation=[0,0,0]){const item=new THREE.Mesh(geometry,material);item.position.set(...position);item.scale.set(...scale);item.rotation.set(...rotation);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;}
function detailedStaff(parent){
  const pivot=new THREE.Group();pivot.name='RightHandSocket';pivot.position.set(.33,1.08,.22);parent.add(pivot);
  const cylinder=new THREE.CylinderGeometry(.5,.5,1,16),torus=new THREE.TorusGeometry(.13,.025,6,18);
  const shaft=mesh(cylinder,materials.iron,pivot,[.78,0,0],[.065,2.35,.065],[0,0,Math.PI/2]);
  for(const x of [-.46,2.02]){mesh(cylinder,materials.gold,pivot,[x,0,0],[.105,.34,.105],[0,0,Math.PI/2]);for(let j=0;j<3;j++)mesh(torus,materials.gold,pivot,[x+(j-1)*.1,0,0],[1,1,1],[0,Math.PI/2,0]);}
  const trails=[];for(let i=0;i<3;i++)trails.push(mesh(cylinder,materials.ghost,pivot,[.78,0,-.06-i*.07],[.09,2.4,.09],[0,0,Math.PI/2]));
  return{pivot,shaft,trails};
}

export function createPlayerView(scene,{onProgress=()=>{}}={}){
  const root=new THREE.Group();root.name='hero';scene.add(root);const visual=new THREE.Group();root.add(visual);
  const sphere=new THREE.SphereGeometry(.5,18,12),cylinder=new THREE.CylinderGeometry(.5,.5,1,14),box=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(.5,1,8);
  const fallback=new THREE.Group();visual.add(fallback);mesh(sphere,materials.cinnabar,fallback,[0,.93,0],[.68,.7,.5]);
  const head=mesh(sphere,materials.skin,visual,[0,1.5,0],[.55,.54,.51]);mesh(sphere,materials.ink,visual,[0,1.83,-.02],[.68,.25,.62]);mesh(box,materials.cinnabar,visual,[.18,1.75,.35],[.56,.07,.32]);mesh(sphere,materials.skin,visual,[0,1.43,.48],[.15,.13,.16]);mesh(sphere,materials.ink,visual,[0,1.3,.49],[.32,.075,.1]);for(const side of [-1,1])mesh(sphere,materials.ink,visual,[side*.17,1.57,.47],[.045,.085,.035]);
  mesh(cone,materials.indigo,visual,[0,.7,-.02],[.78,.9,.62],[0,0,Math.PI]);mesh(box,materials.silk,visual,[0,1.02,.37],[.7,.12,.08]);mesh(box,materials.gold,visual,[0,1.02,.45],[.16,.16,.05]);
  for(const side of [-1,1]){mesh(sphere,materials.gold,visual,[side*.42,1.2,0],[.24,.14,.34]);const arm=mesh(cylinder,materials.crimson,visual,[side*.45,.93,0],[.12,.48,.12],[0,0,side*.14]);mesh(cylinder,materials.iron,arm,[0,-.3,0],[1.18,.3,1.18]);mesh(cylinder,materials.indigo,visual,[side*.2,.34,0],[.15,.58,.15]);mesh(sphere,materials.sole,visual,[side*.2,.08,.1],[.24,.14,.34]);}
  const staff=detailedStaff(visual);let mixer=null,activeAction=null,activeState='',loaded=false,lastTime=0,squash=0,actions=new Map();
  const pipeline=createModelPipeline({onProgress});pipeline.load('/models/original-xiake/xiake.glb').then(gltf=>{
    const model=gltf.scene;model.name='Imported CC0 Xiake Rig';const bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y||1;model.scale.setScalar(1.58/height);model.rotation.y=Math.PI/2;model.position.y=-bounds.min.y*model.scale.y;model.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;object.material=materials.cinnabar;}});fallback.visible=false;visual.add(model);mixer=new THREE.AnimationMixer(model);actions=new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));loaded=true;onProgress(1);
  }).catch(error=>{console.warn('Using procedural hero fallback:',error);onProgress(1);});
  function animationState(player,status){if(status==='gameOver')return'Death';if(player.hurtTime>0)return'Hurt';if(player.attackTime>0)return'Attack';if(player.dashTime>0)return'Dash';if(!player.grounded)return player.jumpsUsed>1?'DoubleJump':'Jump';return Math.abs(player.vx)>.3?'Run':'Idle';}
  function update(player,time,event={}){
    const dt=Math.min(.05,Math.max(0,time-lastTime));lastTime=time;if(event.stomp)squash=.12;squash=Math.max(0,squash-dt);root.position.set(player.x,player.y,0);root.rotation.y=player.facing>=0?0:Math.PI;root.scale.set(1+squash*.6,1-squash*1.5,1+squash*.6);root.visible=!(player.invulnerable>0&&Math.floor(time*14)%2===0);
    const state=animationState(player,event.status);if(loaded&&state!==activeState){const next=actions.get(state);if(next){next.reset().fadeIn(.09).play();activeAction?.fadeOut(.09);activeAction=next;activeState=state;}}mixer?.update(dt*(state==='Dash'?1.8:1));
    const swing=player.attackTime>0?1-player.attackTime/.4:0;staff.pivot.rotation.z=player.attackTime>0?1.35-swing*2.8:-.28;staff.pivot.rotation.x=player.attackTime>0?Math.sin(swing*Math.PI)*.42:0;const extension=player.attackTime>0?1+Math.sin(Math.min(1,swing*1.5)*Math.PI)*.42:1;staff.shaft.scale.y=2.35*extension;staff.trails.forEach((trail,index)=>{trail.visible=player.attackTime>0&&swing<.72;trail.rotation.z=Math.PI/2+(index+1)*.07;trail.scale.y=2.4*extension;});head.rotation.y=Math.sin(time*1.8)*.025;
  }
  return{root,update,get loaded(){return loaded;},dispose(){pipeline.dispose();scene.remove(root);root.traverse(o=>o.geometry?.dispose());}};
}
