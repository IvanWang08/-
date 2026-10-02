import * as THREE from 'three';
const COLOR_CACHE=new Map();
const color=(value)=>{if(!COLOR_CACHE.has(value))COLOR_CACHE.set(value,new THREE.Color(value));return COLOR_CACHE.get(value);};

export function createEffects(scene) {
  const capacity=140,positions=new Float32Array(capacity*3),colors=new Float32Array(capacity*3);
  const particles=Array.from({length:capacity},()=>({life:0,vx:0,vy:0,vz:0,gravity:0}));
  positions.fill(-999);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const material=new THREE.PointsMaterial({size:.13,vertexColors:true,transparent:true,opacity:.9,depthWrite:false,sizeAttenuation:true});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;scene.add(points);
  const waveMaterial=new THREE.MeshBasicMaterial({color:'#70cfff',transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const fieldMaterial=new THREE.MeshBasicMaterial({color:'#3c8ee8',transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const waveGeometry=new THREE.RingGeometry(.48,.72,24,1,-1.15,2.3),fieldGeometry=new THREE.RingGeometry(.76,1,48);
  const waveViews=Array.from({length:16},()=>{const m=new THREE.Mesh(waveGeometry,waveMaterial);m.visible=false;m.rotation.y=-Math.PI/2;scene.add(m);return m;});
  const fieldViews=Array.from({length:5},()=>{const m=new THREE.Mesh(fieldGeometry,fieldMaterial);m.visible=false;m.rotation.x=-Math.PI/2;scene.add(m);return m;});
  let cursor=0;
  function burst(x,y,kind='coin') {
    const palette=kind==='hurt'?['#d84b3d','#ffc08a']:kind==='stomp'?['#e8d5a5','#78a878']:kind==='secret'?['#f4c95d','#79c58a']:kind==='doubleJump'?['#fff1b5','#73cdf0']:['#f4bd38','#fff0a3'];
    const count=kind==='secret'||kind==='doubleJump'?18:kind==='coin'?9:12;
    for(let j=0;j<count;j++){
      const i=cursor++%capacity,p=particles[i],angle=j/count*Math.PI*2+(i%7)*.13,speed=1.5+(i%5)*.38;
      p.life=.48+(i%4)*.09;p.vx=Math.cos(angle)*speed;p.vy=1.4+Math.sin(angle)*speed+(i%3)*.4;p.vz=((i%5)-2)*.35;p.gravity=kind==='secret'?1.7:5.2;
      positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=.35;
      color(palette[i%palette.length]).toArray(colors,i*3);
    }
    geometry.attributes.color.needsUpdate=true;
  }
  function trail(x,y,facing){
    const i=cursor++%capacity,p=particles[i];p.life=.22;p.vx=-facing*(1+(i%3)*.25);p.vy=.25+(i%2)*.2;p.vz=((i%5)-2)*.08;p.gravity=.8;
    positions[i*3]=x-facing*.35;positions[i*3+1]=y+.75+(i%4)*.11;positions[i*3+2]=.2;
    color(i%2?'#ffd36b':'#8ed8ed').toArray(colors,i*3);geometry.attributes.color.needsUpdate=true;
  }
  function swordSweep(x,y,facing){
    for(let j=0;j<18;j++){
      const i=cursor++%capacity,p=particles[i],angle=(-80+j/17*160)*Math.PI/180,radius=1.3+j%3*.65;
      p.life=.16+j%4*.018;p.vx=facing*Math.cos(angle)*1.4;p.vy=Math.sin(angle)*1.4;p.vz=(j%2?1:-1)*.08;p.gravity=.4;
      positions[i*3]=x+facing*Math.cos(angle)*radius;positions[i*3+1]=y+Math.sin(angle)*radius;positions[i*3+2]=.3;
      color(j%3?'#5fc7ff':'#d9f4ff').toArray(colors,i*3);
    }
    geometry.attributes.color.needsUpdate=true;
  }
  function update(dt) {
    for(let i=0;i<capacity;i++){
      const p=particles[i];if(p.life<=0)continue;p.life-=dt;
      if(p.life<=0){positions[i*3]=-999;continue;}
      p.vy-=p.gravity*dt;positions[i*3]+=p.vx*dt;positions[i*3+1]+=p.vy*dt;positions[i*3+2]+=p.vz*dt;
    }
    geometry.attributes.position.needsUpdate=true;
  }
  function syncCombat(projectiles=[],fields=[],time=0){
    waveViews.forEach((view,i)=>{const wave=projectiles[i];view.visible=!!wave;if(!wave)return;view.position.set(wave.x,wave.y,.35);view.rotation.z=wave.vx<0?Math.PI:0;view.scale.setScalar(1+Math.sin(time*18+i)*.08);});
    fieldViews.forEach((view,i)=>{const field=fields[i];view.visible=!!field;if(!field)return;view.position.set(field.x,.035,.05);view.scale.setScalar(field.radius*(1+Math.sin(time*6)*.04));view.rotation.z=time*.45;});
  }
  return {burst,trail,swordSweep,update,syncCombat,dispose(){scene.remove(points);for(const v of [...waveViews,...fieldViews])scene.remove(v);geometry.dispose();material.dispose();waveGeometry.dispose();fieldGeometry.dispose();waveMaterial.dispose();fieldMaterial.dispose();}};
}
