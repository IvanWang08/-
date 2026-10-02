import * as THREE from 'three';
import {groundHeightAt,Z_LAYERS} from './layers.js';
import {createPremiumMaterials} from './pbrMaterials.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function irregularCliff(solid,material){
  const {w,h}=solid,shape=new THREE.Shape();shape.moveTo(-w/2,h/2);shape.lineTo(w/2,h/2);
  shape.lineTo(w/2-.18,-h/2+.22);for(let x=w/2-1;x>-w/2+1;x-=1.1)shape.lineTo(x,-h/2+Math.sin(x*2.7)*.22);shape.lineTo(-w/2+.12,-h/2+.08);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:3.25,bevelEnabled:true,bevelSize:.13,bevelThickness:.12,bevelSegments:2});geometry.translate(0,0,-1.625);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(solid.x,solid.y,0);mesh.castShadow=mesh.receiveShadow=true;mesh.geometry.setAttribute('uv1',mesh.geometry.attributes.uv);return mesh;
}
const mesh=(geo,mat,parent,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);if(m.geometry.attributes.uv&&!m.geometry.attributes.uv1)m.geometry.setAttribute('uv1',m.geometry.attributes.uv);return m;};
function tube(points,radius,material,parent){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),m=mesh(new THREE.TubeGeometry(curve,64,radius,8,false),material,parent,0,0,0);return m;}
function instances(geometry,material,items,parent,name,{castShadow=true}={}){
  if(!items.length)return null;if(geometry.attributes.uv&&!geometry.attributes.uv1)geometry.setAttribute('uv1',geometry.attributes.uv);
  const batch=new THREE.InstancedMesh(geometry,material,items.length),dummy=new THREE.Object3D();batch.name=name;batch.castShadow=castShadow;batch.receiveShadow=true;
  items.forEach((item,index)=>{dummy.position.set(...item.position);dummy.rotation.set(...(item.rotation||[0,0,0]));dummy.scale.set(...(item.scale||[1,1,1]));dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);});
  batch.instanceMatrix.needsUpdate=true;parent.add(batch);return batch;
}

export function createWorldView(scene,level){
  const root=new THREE.Group();root.name='PremiumGorge';scene.add(root);
  const roadRoot=new THREE.Group();roadRoot.name='Road';const propsRoot=new THREE.Group();propsRoot.name='Props';root.add(roadRoot,propsRoot);
  const {materials,dispose:disposeMaterials}=createPremiumMaterials(),views=new Map(),coinViews=new Map(),enemyViews=new Map();
  const rockGeo=new THREE.DodecahedronGeometry(.5,1),bambooGeo=new THREE.CylinderGeometry(.5,.58,1,10),jointGeo=new THREE.TorusGeometry(.52,.06,6,12),leafGeo=new THREE.ConeGeometry(.5,1.9,7),coinGeo=new THREE.TorusGeometry(.27,.075,8,24),plankGeo=new THREE.BoxGeometry(.66,.16,2.75),suspenderGeo=new THREE.CylinderGeometry(.5,.5,1,8),lanternGeo=new THREE.SphereGeometry(.28,16,10);
  const spline=new THREE.CatmullRomCurve3(level.roadSpline.map(p=>new THREE.Vector3(...p)));const pathAt=x=>spline.getPointAt(clamp(x/level.length,0,1));

  for(const solid of level.solids){
    if(solid.visual==='ropeBridge'){
      const g=new THREE.Group(),planks=[],suspenders=[];g.name='OldRopeBridge';roadRoot.add(g);for(let x=solid.x-solid.w/2+.35;x<solid.x+solid.w/2;x+=.72){const sag=Math.sin((x-(solid.x-solid.w/2))/solid.w*Math.PI)*-.14;planks.push({position:[x,solid.y+solid.h/2-.09+sag,0],rotation:[(x%2-.5)*.02,(x%3-1)*.018,(x%2-.5)*.035]});}
      instances(plankGeo,materials.wood,planks,g,'Aged bridge planks');
      for(const z of [-1.45,1.45]){tube([[solid.x-solid.w/2,.15,z],[solid.x,-.72,z],[solid.x+solid.w/2,.15,z]],.055,materials.rope,g);tube([[solid.x-solid.w/2,2.1,z],[solid.x,.55,z],[solid.x+solid.w/2,2.1,z]],.075,materials.rope,g);for(let x=solid.x-solid.w/2;x<=solid.x+solid.w/2;x+=2){const top=1.55-Math.sin((x-solid.x+solid.w/2)/solid.w*Math.PI),length=top-.02;suspenders.push({position:[x,.02+length/2,z],scale:[.044,length,.044]});}}
      instances(suspenderGeo,materials.rope,suspenders,g,'Rope suspenders');
      views.set(solid.id,g);
    }else{const m=irregularCliff(solid,solid.type==='wood'||solid.type==='moving'||solid.type==='crumble'?materials.wood:materials.stone);roadRoot.add(m);views.set(solid.id,m);}
  }

  // An instanced talus skin hides the planar collision hulls from the camera.
  // Collision remains deterministic while the rendered canyon face is layered,
  // chipped and moss-streaked rather than a single rectangular extrusion.
  const faceTransforms=[[],[]],dummy=new THREE.Object3D();
  for(const solid of level.solids.filter(s=>!['ropeBridge','moving','crumble'].includes(s.type))){
    const bottom=solid.y-solid.h/2,top=solid.y+solid.h/2;
    for(let y=bottom+.35,row=0;y<top-.18;y+=.72,row++)for(let x=solid.x-solid.w/2+.35,col=0;x<solid.x+solid.w/2-.25;x+=.86,col++){
      const jitter=Math.sin(x*3.17+y*2.21)*.17;
      faceTransforms[(row+col)%7===0?1:0].push({x:x+jitter,y:y+Math.cos(x*2.4)*.12,z:1.46+((row+col)%3)*.12,sx:.72+((row*3+col)%5)*.08,sy:.58+((row+col*2)%4)*.11,sz:.42+((row+col)%3)*.08,ry:(row*.53+col*.31)%Math.PI,rz:jitter});
    }
  }
  faceTransforms.forEach((items,index)=>{
    const instanced=new THREE.InstancedMesh(rockGeo,index?materials.moss:materials.stone,items.length);instanced.name=index?'MossTalus':'WetRockTalus';instanced.castShadow=instanced.receiveShadow=true;
    items.forEach((t,i)=>{dummy.position.set(t.x,t.y,t.z);dummy.rotation.set(t.ry*.22,t.ry,t.rz);dummy.scale.set(t.sx,t.sy,t.sz);dummy.updateMatrix();instanced.setMatrixAt(i,dummy.matrix);});
    instanced.instanceMatrix.needsUpdate=true;roadRoot.add(instanced);
  });

  // Break the playable silhouette without changing the canonical collision top.
  // Loose stone and moss sit behind the actor plane, so feet remain readable.
  const mossPatchGeo=new THREE.CircleGeometry(.5,18),edgeRocks=[],mossPatches=[];
  for(const solid of level.solids.filter(s=>!['ropeBridge','moving','crumble'].includes(s.type))){
    const top=solid.y+solid.h/2;
    for(let x=solid.x-solid.w/2+.8,i=0;x<solid.x+solid.w/2-.5;x+=2.15,i++){
      edgeRocks.push({position:[x,top+.11,-1.34],rotation:[i*.31,i*.72,i*.18],scale:[.23+(i%2)*.12,.18+(i%3)*.05,.3]});
      if(i%2===0)mossPatches.push({position:[x+.35,top+.009,-.78],rotation:[-Math.PI/2,0,0],scale:[.64+(i%3)*.16,.44,1]});
    }
  }
  instances(rockGeo,materials.stone,edgeRocks,propsRoot,'Road edge rubble');
  instances(mossPatchGeo,materials.moss,mossPatches,propsRoot,'Grounded moss patches',{castShadow:false});

  // Deep reflective water and mirrored bamboo silhouettes beneath the bridge.
  const water=mesh(new THREE.PlaneGeometry(110,20,128,16),materials.water,roadRoot,48,-3.15,-2.2);water.rotation.x=-Math.PI/2;water.renderOrder=-1;water.castShadow=false;
  const bambooXs=[2,5,9,12,24,28,68,73,80,88,94],trunks=[],joints=[],leaves=[],reflections=[];
  for(const [index,x] of bambooXs.entries()){
    const point=pathAt(x),ground=groundHeightAt(level,x,{includePlatforms:false,fallback:0}),height=6.8+(index%4)*1.1,z=point.z-5.2-(index%3)*1.25;
    trunks.push({position:[x,ground+height/2,z],scale:[.16,height,.16]});for(let y=ground+.75;y<ground+height;y+=.82)joints.push({position:[x,y,z],rotation:[Math.PI/2,0,0],scale:[.18,.18,.18]});
    for(let j=0;j<5;j++)leaves.push({position:[x+(j%2?-.45:.45),ground+height*.58+j*.55,z+(j%3-.8)*.28],rotation:[0,0,(j%2?1:-1)*.95],scale:[.23,.85,.12]});
    reflections.push({position:[x,-3.15-height/2,z],scale:[.11,height*.8,.11]});
  }
  instances(bambooGeo,materials.bamboo,trunks,propsRoot,'Bamboo trunks');instances(jointGeo,materials.bamboo,joints,propsRoot,'Bamboo joints');instances(leafGeo,materials.leaf,leaves,propsRoot,'Bamboo leaves');instances(bambooGeo,materials.bamboo,reflections,propsRoot,'Water bamboo reflections',{castShadow:false});
  // Layered, non-box canyon silhouettes.
  const mountainStone=[],mountainMoss=[];for(let i=0;i<34;i++){const x=-8+i*3.5,z=Z_LAYERS.midDecoration.default-8-(i%4)*3,y=-1+(i%5)*1.25,s=4.5+(i%7)*1.3;(i%3?mountainStone:mountainMoss).push({position:[x,y,z],rotation:[i*.31,i*.47,i*.17],scale:[s,s*(1.1+(i%3)*.3),s*.72]});}
  instances(rockGeo,materials.stone,mountainStone,propsRoot,'Layered wet mountains',{castShadow:false});instances(rockGeo,materials.moss,mountainMoss,propsRoot,'Layered moss mountains',{castShadow:false});
  // Grounded near-road details share the same sampled walkable surface and spline.
  const nearStone=[],nearMoss=[],grasses=[];for(let i=0;i<58;i++){const x=1+(i*1.63)%94;if(x>33&&x<58)continue;const p=pathAt(x),ground=groundHeightAt(level,x,{includePlatforms:false,fallback:0}),z=p.z-2.25-(i%4)*.28;
    if(i%5===0)(i%10?nearStone:nearMoss).push({position:[x,ground+.22,z],rotation:[i*.13,i*.37,i*.21],scale:[.42+(i%3)*.16,.32+(i%2)*.15,.45]});
    else grasses.push({position:[x,ground+.34,z],rotation:[0,0,(i%3-1)*.22],scale:[.13,.42,.09]});
  }
  instances(rockGeo,materials.stone,nearStone,propsRoot,'Grounded stones');instances(rockGeo,materials.moss,nearMoss,propsRoot,'Grounded moss stones');instances(leafGeo,materials.leaf,grasses,propsRoot,'Grounded grass');
  const posts=[],lanterns=[];for(const x of [8,29,60,74,90]){const ground=groundHeightAt(level,x,{includePlatforms:false,fallback:0});posts.push({position:[x,ground+1.4,-2.35],scale:[.12,2.8,.12]});lanterns.push({position:[x,ground+2.2,-2.35],scale:[1,1.35,1]});}
  instances(bambooGeo,materials.wood,posts,propsRoot,'Lantern posts');instances(lanternGeo,materials.cloth,lanterns,propsRoot,'Red lanterns');
  // Warm volumetric shafts through cold fog.
  const shaftMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float edge=1.-smoothstep(.08,.5,abs(vUv.x-.5));float ends=sin(vUv.y*3.1415926);float taper=mix(.28,1.,vUv.y);gl_FragColor=vec4(.86,.62,.31,edge*ends*taper*.075);}'});
  const shaftGeo=new THREE.PlaneGeometry(6.4,18);
  for(const x of [18,47,76]){const s=mesh(shaftGeo,shaftMat,propsRoot,x,8,-7);s.rotation.z=-.38;s.castShadow=false;}

  for(const c of level.coins){const m=mesh(coinGeo,materials.gold,propsRoot,c.x,c.y,.25);m.rotation.y=Math.PI/2;coinViews.set(c.id,m);}
  for(const e of level.enemies){const g=new THREE.Group(),stem=mesh(new THREE.SphereGeometry(.5,20,14),materials.spore,g,0,.38,0,.68,.72,.62),cap=mesh(new THREE.SphereGeometry(.62,24,16,0,Math.PI*2,0,Math.PI*.55),materials.cloth,g,0,.7,0,1.12,.62,1);cap.rotation.x=.08;g.position.set(e.x,e.y,0);g.userData={stem,cap};propsRoot.add(g);enemyViews.set(e.id,g);}

  function update(sim,dt,time){
    for(const solid of sim.solids){const view=views.get(solid.id);if(!view)continue;if(solid.type==='moving'){const a=sim.renderAlpha??1;view.position.x=THREE.MathUtils.lerp(solid.previousX??solid.x,solid.x,a);view.position.y=THREE.MathUtils.lerp(solid.previousY??solid.y,solid.y,a);}view.visible=solid.enabled!==false;}
    for(const c of sim.coins){const m=coinViews.get(c.id);if(m){m.visible=!c.collected&&c.revealed;m.rotation.z=time*2.4;m.position.y=c.y+Math.sin(time*2.2+c.x)*.08;}}
    for(const e of sim.enemies){const g=enemyViews.get(e.id);if(!g)continue;g.visible=e.alive||e.defeatTime>0;g.position.set(e.x,e.y,0);g.scale.set(1+e.squash,1-e.squash*1.7,1+e.squash);g.rotation.z=e.aiState==='attack'?Math.sin(time*18)*.16:0;}
    materials.water.normalMap.offset.x=time*.012;materials.water.normalMap.offset.y=time*.007;
  }
  return{root,roadRoot,propsRoot,materials,update,dispose(){scene.remove(root);root.traverse(o=>o.geometry?.dispose());mossPatchGeo.dispose();shaftGeo.dispose();shaftMat.dispose();disposeMaterials();}};
}
