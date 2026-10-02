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
    const palette=kind==='hurt'?['#d84b3d','#ffc08a']:kind==='stomp'?['#e8d5a5','#78a878']:kind==='secret'?['#f4c95d','#79c58a']:kind==='doubleJump'?['#fff1b5','#73cdf0']:['#f4bd38','#fff0a3'];
    const count=kind==='secret'||kind==='doubleJump'?18:kind==='coin'?9:12;
    for(let j=0;j<count;j++){
      const i=cursor++%capacity,p=particles[i],angle=j/count*Math.PI*2+(i%7)*.13,speed=1.5+(i%5)*.38;
      p.life=.48+(i%4)*.09;p.vx=Math.cos(angle)*speed;p.vy=1.4+Math.sin(angle)*speed+(i%3)*.4;p.vz=((i%5)-2)*.35;p.gravity=kind==='secret'?1.7:5.2;
      positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=.35;
      new THREE.Color(palette[i%palette.length]).toArray(colors,i*3);
    }
    geometry.attributes.color.needsUpdate=true;
  }
  function trail(x,y,facing){
    const i=cursor++%capacity,p=particles[i];p.life=.22;p.vx=-facing*(1+(i%3)*.25);p.vy=.25+(i%2)*.2;p.vz=((i%5)-2)*.08;p.gravity=.8;
    positions[i*3]=x-facing*.35;positions[i*3+1]=y+.75+(i%4)*.11;positions[i*3+2]=.2;
    new THREE.Color(i%2?'#ffd36b':'#8ed8ed').toArray(colors,i*3);geometry.attributes.color.needsUpdate=true;
  }
  function staffSweep(x,y,facing){
    for(let j=0;j<18;j++){
      const i=cursor++%capacity,p=particles[i],angle=(-80+j/17*160)*Math.PI/180,radius=1.3+j%3*.65;
      p.life=.16+j%4*.018;p.vx=facing*Math.cos(angle)*1.4;p.vy=Math.sin(angle)*1.4;p.vz=(j%2?1:-1)*.08;p.gravity=.4;
      positions[i*3]=x+facing*Math.cos(angle)*radius;positions[i*3+1]=y+Math.sin(angle)*radius;positions[i*3+2]=.3;
      new THREE.Color(j%3?'#f7c94c':'#fff2a3').toArray(colors,i*3);
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
  return {burst,trail,staffSweep,update,dispose(){scene.remove(points);geometry.dispose();material.dispose();}};
}
