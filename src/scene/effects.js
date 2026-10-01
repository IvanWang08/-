import * as THREE from 'three';

export function createEffects(scene) {
  const capacity=140,positions=new Float32Array(capacity*3),colors=new Float32Array(capacity*3);
  const particles=Array.from({length:capacity},()=>({life:0,vx:0,vy:0,vz:0,gravity:0}));
  positions.fill(-999);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const material=new THREE.PointsMaterial({size:.13,vertexColors:true,transparent:true,opacity:.9,depthWrite:false,sizeAttenuation:true});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;scene.add(points);
  let cursor=0;
  function burst(x,y,kind='coin') {
    const palette=kind==='hurt'?['#943d36','#d09a74']:kind==='stomp'?['#c3b28c','#6e765f']:kind==='secret'?['#d7bd6f','#78926c']:['#e3bf58','#f4dd8a'];
    const count=kind==='secret'?18:kind==='coin'?9:12;
    for(let j=0;j<count;j++){
      const i=cursor++%capacity,p=particles[i],angle=j/count*Math.PI*2+(i%7)*.13,speed=1.5+(i%5)*.38;
      p.life=.48+(i%4)*.09;p.vx=Math.cos(angle)*speed;p.vy=1.4+Math.sin(angle)*speed+(i%3)*.4;p.vz=((i%5)-2)*.35;p.gravity=kind==='secret'?1.7:5.2;
      positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=.35;
      new THREE.Color(palette[i%palette.length]).toArray(colors,i*3);
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
  return {burst,update,dispose(){scene.remove(points);geometry.dispose();material.dispose();}};
}
