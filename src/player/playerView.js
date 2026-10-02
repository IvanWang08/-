import * as THREE from 'three';
import {createModelPipeline} from './modelPipeline.js';

const texLoader=new THREE.TextureLoader();
const base=texLoader.load('/textures/weapons/mythic-metal-basecolor.png'),normal=texLoader.load('/textures/weapons/mythic-metal-normal.png'),orm=texLoader.load('/textures/weapons/mythic-metal-orm.png');
base.colorSpace=THREE.SRGBColorSpace;for(const t of [base,normal,orm]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.repeat.set(2.5,.45);}
const mat=(color,roughness=.72,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra,...(extra.normalMap?{normalScale:new THREE.Vector2(.55,.55)}:{})});
const materials={robe:mat('#344642',.88),inner:mat('#b8b6a4',.92),ink:mat('#111917',.68),skin:mat('#b98d70',.82),hair:mat('#101615',.56),jade:mat('#557e72',.18,{metalness:.18,emissive:'#173e39',emissiveIntensity:.22}),silver:mat('#b9cad0',.22,{metalness:.92,map:base,normalMap:normal,aoMap:orm,roughnessMap:orm,metalnessMap:orm}),blue:mat('#5bbbea',.16,{metalness:.82,map:base,normalMap:normal,aoMap:orm,roughnessMap:orm,metalnessMap:orm,emissive:'#155e9a',emissiveIntensity:.48}),gold:mat('#846335',.26,{metalness:.94,map:base,normalMap:normal,aoMap:orm,roughnessMap:orm,metalnessMap:orm}),iron:mat('#272824',.34,{metalness:.8,map:base,normalMap:normal,aoMap:orm,roughnessMap:orm,metalnessMap:orm}),cord:mat('#592421',.92,{map:base,normalMap:normal,aoMap:orm,roughnessMap:orm}),ghost:mat('#59bfff',.18,{transparent:true,opacity:.18,depthWrite:false,emissive:'#258ccc',emissiveIntensity:1.2})};
function mesh(geometry,material,parent,position,scale=[1,1,1],rotation=[0,0,0]){const item=new THREE.Mesh(geometry,material);item.position.set(...position);item.scale.set(...scale);item.rotation.set(...rotation);item.castShadow=item.receiveShadow=true;parent.add(item);if(item.geometry.attributes.uv&&!item.geometry.attributes.uv1)item.geometry.setAttribute('uv1',item.geometry.attributes.uv);return item;}
function diamondBladeGeometry(){const p=[0,0,0,.05,.08,0,.05,0,.045,.05,-.08,0,1.75,0,0],i=[0,1,2,0,2,3,1,4,2,2,4,3,3,4,0,0,4,1];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(i);g.computeVertexNormals();return g;}
function weaponRig(parent){
  const pivot=new THREE.Group();pivot.name='RightHandSocket';pivot.position.set(.28,1.02,.25);parent.add(pivot);
  const sword=new THREE.Group();sword.name='OriginalAzureSword';sword.rotation.z=-.08;pivot.add(sword);
  const blade=mesh(diamondBladeGeometry(),materials.blue,sword,[.34,0,0],[1.18,1,1],[0,0,-Math.PI/2]);
  mesh(new THREE.BoxGeometry(1,1,1),materials.silver,sword,[-.08,0,0],[.12,.52,.13],[0,0,.18]);mesh(new THREE.CylinderGeometry(.09,.1,.5,18),materials.cord,sword,[-.39,0,0],[1,1,1],[0,0,Math.PI/2]);mesh(new THREE.SphereGeometry(.13,16,10),materials.jade,sword,[-.68,0,0],[1,.72,.72]);
  for(let i=0;i<5;i++){const knot=mesh(new THREE.TorusGeometry(.11,.018,6,18),i%2?materials.blue:materials.silver,sword,[-.78-i*.13,-.03-i*.02,0],[1,1,1],[0,Math.PI/2,0]);knot.userData.tassel=i;}
  // The previous staff remains as an ornate sheathed heirloom, not an active attack.
  const staff=new THREE.Group();staff.name='XuanIronHeirloom';staff.position.set(-.05,.95,-.35);staff.rotation.z=-.63;parent.add(staff);mesh(new THREE.CylinderGeometry(.045,.045,1.9,20),materials.iron,staff,[0,0,0]);for(const y of [-.77,.77]){mesh(new THREE.CylinderGeometry(.085,.085,.25,20),materials.gold,staff,[0,y,0]);for(let r=0;r<3;r++)mesh(new THREE.TorusGeometry(.09,.012,6,18),materials.gold,staff,[0,y+(r-1)*.07,0],[1,1,1],[Math.PI/2,0,0]);}for(let k=0;k<7;k++)mesh(new THREE.TorusGeometry(.1,.012,5,14,Math.PI*1.4),materials.gold,staff,[Math.sin(k*.8)*.025,-.55+k*.18,.042],[1,1,1],[0,0,k*.8]);
  const arc=mesh(new THREE.RingGeometry(1.15,1.34,40,1,-1.35,2.7),materials.ghost,pivot,[.1,0,-.08]);arc.visible=false;
  return{pivot,sword,blade,staff,arc,tassels:sword.children.filter(c=>c.userData.tassel!==undefined)};
}

export function createPlayerView(scene,{onProgress=()=>{}}={}){
  const root=new THREE.Group();root.name='hero';scene.add(root);const visual=new THREE.Group();root.add(visual);
  const sphere=new THREE.SphereGeometry(.5,24,18),robeGeo=new THREE.ConeGeometry(.5,1,20,4,true),sleeveGeo=new THREE.CylinderGeometry(.25,.15,1,16,3,true),box=new THREE.BoxGeometry(1,1,1);
  const fallback=new THREE.Group();visual.add(fallback);mesh(sphere,materials.inner,fallback,[0,.82,0],[.52,.78,.38]);
  const head=mesh(sphere,materials.skin,visual,[0,1.5,.01],[.43,.5,.42]);
  const outer=mesh(robeGeo,materials.robe,visual,[0,.73,0],[.78,1.12,.62],[0,0,Math.PI]);const inner=mesh(robeGeo,materials.inner,visual,[0,.78,.07],[.58,1.02,.48],[0,0,Math.PI]);
  mesh(box,materials.ink,visual,[0,1.02,.02],[.72,.13,.55]);mesh(box,materials.jade,visual,[0,1.01,.38],[.14,.19,.07]);
  const sleeves=[];for(const side of [-1,1]){const sleeve=mesh(sleeveGeo,materials.robe,visual,[side*.44,.92,0],[1.05,.92,1.05],[0,0,side*.18]);sleeves.push(sleeve);mesh(sphere,materials.skin,sleeve,[0,-.52,0],[.3,.18,.28]);}
  // Layered hair cards, brows and a restrained top knot keep the face readable.
  mesh(sphere,materials.hair,visual,[0,1.78,-.03],[.5,.25,.48]);for(let i=-2;i<=2;i++){const strand=mesh(new THREE.PlaneGeometry(.13,.62),materials.hair,visual,[i*.09,1.67,-.38-i%2*.01]);strand.rotation.y=i*.05;}
  mesh(new THREE.CylinderGeometry(.12,.18,.3,18),materials.hair,visual,[0,2.01,-.04]);for(const side of [-1,1]){mesh(box,materials.hair,visual,[side*.15,1.59,.42],[.12,.024,.025],[0,0,side*.08]);mesh(sphere,materials.ink,visual,[side*.15,1.54,.43],[.035,.045,.025]);}
  const pendant=mesh(new THREE.OctahedronGeometry(.12,1),materials.jade,visual,[.18,.76,.4]);const weapon=weaponRig(visual);
  let mixer=null,activeAction=null,activeState='',loaded=false,lastTime=0,squash=0,actions=new Map();
  const pipeline=createModelPipeline({onProgress});pipeline.load('/models/original-xiake/xiake.glb').then(gltf=>{const model=gltf.scene;model.name='Imported CC0 Xiake Skeleton';const bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y||1;model.scale.setScalar(1.58/height);model.rotation.y=Math.PI/2;model.position.y=-bounds.min.y*model.scale.y;model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.material=materials.ink;}});fallback.visible=false;visual.add(model);mixer=new THREE.AnimationMixer(model);actions=new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));loaded=true;onProgress(1);}).catch(error=>{console.warn('Using procedural hero fallback:',error);onProgress(1);});
  function state(player,status){if(status==='gameOver')return'Death';if(player.hurtTime>0)return'Hurt';if(player.attackTime>0)return'Attack';if(player.dashTime>0)return'Dash';if(!player.grounded)return player.jumpsUsed>1?'DoubleJump':'Jump';return Math.abs(player.vx)>.3?'Run':'Idle';}
  function update(player,time,event={}){const dt=Math.min(.05,Math.max(0,time-lastTime));lastTime=time;if(event.stomp)squash=.12;squash=Math.max(0,squash-dt);root.position.set(player.x,player.y,0);root.rotation.y=player.facing>=0?0:Math.PI;root.scale.set(1+squash*.4,1-squash*1.2,1+squash*.4);root.visible=!(player.invulnerable>0&&Math.floor(time*14)%2===0);const nextState=state(player,event.status);if(loaded&&nextState!==activeState){const next=actions.get(nextState);if(next){next.reset().fadeIn(.14).play();activeAction?.fadeOut(.14);activeAction=next;activeState=nextState;}}mixer?.update(dt*(nextState==='Dash'?1.7:1));
    const swing=player.attackTime>0?1-player.attackTime/.34:0;weapon.pivot.rotation.z=player.attackTime>0?1.18-swing*2.45:-.12;weapon.pivot.rotation.x=player.attackTime>0?Math.sin(swing*Math.PI)*.28:0;weapon.arc.visible=player.attackTime>0&&swing>.12&&swing<.78;weapon.arc.rotation.z=-.25-swing*2.1;weapon.blade.material.emissiveIntensity=event.lowHealth||player.skillCooldown>6.9?1.45:.48;
    sleeves[0].rotation.z=-.18+Math.sin(time*2.4)*.04+Math.abs(player.vx)*.008;sleeves[1].rotation.z=.18-Math.sin(time*2.4)*.04-Math.abs(player.vx)*.008;outer.rotation.z=Math.sin(time*3.2)*Math.min(.08,Math.abs(player.vx)*.008);inner.rotation.z=-outer.rotation.z*.65;pendant.rotation.z=Math.sin(time*4.4)*.16;weapon.tassels.forEach((t,i)=>{t.rotation.z=Math.sin(time*5-i*.35)*(.12+i*.035)-Math.min(.35,player.vx*.018);});head.rotation.y=Math.sin(time*1.4)*.018;
  }
  return{root,update,get loaded(){return loaded;},dispose(){pipeline.dispose();scene.remove(root);root.traverse(o=>o.geometry?.dispose());}};
}
