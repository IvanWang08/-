import * as THREE from 'three';

export function createTrapView(scene,level){
  const root=new THREE.Group();root.name='Rhythm hazards';scene.add(root);
  const red=new THREE.MeshStandardMaterial({color:'#d84d3f',roughness:.55});
  const gold=new THREE.MeshStandardMaterial({color:'#f5bd38',metalness:.55,roughness:.28,emissive:'#9d5c13',emissiveIntensity:.25});
  const dark=new THREE.MeshStandardMaterial({color:'#46565c',metalness:.48,roughness:.42});
  const fire=new THREE.MeshStandardMaterial({color:'#ff9d32',emissive:'#ff521f',emissiveIntensity:1.8,transparent:true,opacity:.88});
  const stone=new THREE.MeshStandardMaterial({color:'#a99b83',roughness:.9,flatShading:true});
  const cone=new THREE.ConeGeometry(.22,.7,5),box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(.5,.5,1,10),rock=new THREE.IcosahedronGeometry(.72,1);
  const views=new Map();
  const add=(g,geo,mat,pos,scale=[1,1,1])=>{const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  for(const trap of level.traps||[]){
    const g=new THREE.Group();g.position.set(trap.x,trap.y,trap.preview?-3.4:0);root.add(g);const pieces=[];
    if(trap.type==='spikes'||trap.type==='retractingSpikes'){
      add(g,box,dark,[0,.04,0],[trap.w||1.6,.08,1.3]);for(let i=0;i<5;i++)pieces.push(add(g,cone,gold,[-(trap.w||1.6)*.4+i*(trap.w||1.6)*.2,.39,0]));
    } else if(trap.type==='flame'){
      add(g,cylinder,dark,[0,.18,0],[.45,.36,.45]);for(let i=0;i<4;i++)pieces.push(add(g,cone,fire,[0,.55+i*.38,0],[1-i*.13,1.1,1-i*.13]));
    } else if(trap.type==='pendulum'){
      const rope=add(g,cylinder,dark,[0,-1.25,0],[.055,2.5,.055]);pieces.push(rope,add(g,rock,gold,[0,-2.5,0],[.78,.78,.78]));
      add(g,cylinder,red,[0,.05,0],[.18,.4,.18]);
    } else if(trap.type==='rockfall'||trap.type==='rollingRock'){
      pieces.push(add(g,rock,stone,[0,0,0],[1,1,1]));
    } else {
      const hub=add(g,cylinder,gold,[0,0,0],[.35,.2,.35]);hub.rotation.x=Math.PI/2;pieces.push(hub);
      for(let i=0;i<4;i++){const blade=add(g,box,dark,[0,0,0],[1.7,.16,.12]);blade.rotation.z=i*Math.PI/2;pieces.push(blade);}
    }
    if(trap.preview){g.scale.setScalar(.7);g.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.68;}});}
    views.set(trap.id,{group:g,pieces,baseY:trap.y});
  }
  function update(sim,time){
    for(const trap of sim.traps||[]){const view=views.get(trap.id);if(!view)continue;const {group,pieces,baseY}=view;
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
      if(trap.type==='rockfall'&&!trap.triggered)group.position.y=baseY;
    }
  }
  return{root,update,dispose(){scene.remove(root);for(const geo of [cone,box,cylinder,rock])geo.dispose();for(const mat of [red,gold,dark,fire,stone])mat.dispose();}};
}
