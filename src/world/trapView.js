import * as THREE from 'three';
import {groundHeightAt} from './layers.js';

export function createTrapView(parent,level,premiumMaterials={}){
  const root=new THREE.Group();root.name='Rhythm hazards';parent.add(root);
  const fallback=name=>new THREE.MeshStandardMaterial({color:name,roughness:.7});
  const red=premiumMaterials.cloth||fallback('#5a211f');
  const gold=premiumMaterials.gold||fallback('#80612f');
  const dark=premiumMaterials.iron||fallback('#343a38');
  const stone=premiumMaterials.stone||fallback('#556158');
  const fire=new THREE.MeshStandardMaterial({color:'#c86f28',emissive:'#f04f18',emissiveIntensity:1.45,transparent:true,opacity:.82,roughness:.36});
  const crackMaterial=new THREE.MeshStandardMaterial({color:'#211a15',emissive:'#a34d25',emissiveIntensity:.22,roughness:1,transparent:true,opacity:.72,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  const cone=new THREE.ConeGeometry(.22,.7,7),box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(.5,.5,1,14),rock=new THREE.IcosahedronGeometry(.72,2),crackGeo=new THREE.RingGeometry(.24,.7,20,2);
  const views=new Map();
  const add=(g,geo,mat,pos,scale=[1,1,1])=>{const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  for(const trap of level.traps||[]){
    const g=new THREE.Group();g.position.set(trap.x,trap.y,trap.preview?-3.4:0);root.add(g);const pieces=[];let crack=null;
    if(trap.type==='spikes'||trap.type==='retractingSpikes'){
      add(g,box,dark,[0,.04,0],[trap.w||1.6,.08,1.3]);for(let i=0;i<5;i++)pieces.push(add(g,cone,gold,[-(trap.w||1.6)*.4+i*(trap.w||1.6)*.2,.39,0]));
    } else if(trap.type==='flame'){
      add(g,cylinder,dark,[0,.18,0],[.45,.36,.45]);for(let i=0;i<4;i++)pieces.push(add(g,cone,fire,[0,.55+i*.38,0],[1-i*.13,1.1,1-i*.13]));
    } else if(trap.type==='pendulum'){
      const rope=add(g,cylinder,dark,[0,-1.25,0],[.055,2.5,.055]);pieces.push(rope,add(g,rock,gold,[0,-2.5,0],[.78,.78,.78]));
      add(g,cylinder,red,[0,.05,0],[.18,.4,.18]);
    } else if(trap.type==='rockfall'||trap.type==='rollingRock'){
      pieces.push(add(g,rock,stone,[0,0,0],[1,1,1]));
      if(trap.type==='rockfall'){
        crack=add(g,crackGeo,crackMaterial,[0,groundHeightAt(level,trap.x,{fallback:0})-trap.y+.012,.25],[1,1,1]);
        crack.rotation.x=-Math.PI/2;crack.castShadow=false;crack.receiveShadow=false;
      }
    } else {
      const hub=add(g,cylinder,gold,[0,0,0],[.35,.2,.35]);hub.rotation.x=Math.PI/2;pieces.push(hub);
      for(let i=0;i<4;i++){const blade=add(g,box,dark,[0,0,0],[1.7,.16,.12]);blade.rotation.z=i*Math.PI/2;pieces.push(blade);}
    }
    if(trap.preview){g.scale.setScalar(.7);g.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.68;}});}
    views.set(trap.id,{group:g,pieces,baseY:trap.y,crack});
  }
  function update(sim,time){
    for(const trap of sim.traps||[]){const view=views.get(trap.id);if(!view)continue;const {group,pieces,baseY,crack}=view;
      group.visible=Math.abs(trap.x-sim.player.x)<65;
      group.position.x=trap.currentX;group.position.y=trap.type==='pendulum'?trap.y:trap.currentY;group.position.z=trap.preview?-3.4:0;
      if(trap.type==='retractingSpikes')group.scale.y=trap.active?1:.15;
      if(trap.type==='flame')pieces.forEach((p,i)=>{
        p.visible=trap.active;
        p.scale.y=trap.active?(0.85+Math.sin(time*14+i)*0.18):0.05;
      });
      if(trap.type==='pendulum'){const dx=trap.currentX-trap.x,dy=trap.currentY-trap.y;group.rotation.z=Math.atan2(-dx,-dy);}
      if(['blade','flyingBlade'].includes(trap.type))group.rotation.z=time*(trap.type==='blade'?8:11);
      if(trap.type==='rollingRock'||trap.type==='rockfall')group.rotation.z-=.09;
      if(trap.type==='rockfall'){
        if(!trap.triggered)group.position.y=baseY;
        if(crack){crack.visible=trap.triggered&&time<trap.triggerTime;crack.scale.setScalar(.82+Math.sin(time*18)*.12);}
      }
    }
  }
  return{root,update,dispose(){parent.remove(root);for(const geo of [cone,box,cylinder,rock,crackGeo])geo.dispose();fire.dispose();crackMaterial.dispose();if(!premiumMaterials.stone)for(const mat of [red,gold,dark,stone])mat.dispose();}};
}
