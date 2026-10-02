import * as THREE from 'three';

const seeded=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
function textureSet(kind,base){
  const size=512,height=document.createElement('canvas'),normal=document.createElement('canvas'),orm=document.createElement('canvas');
  height.width=height.height=normal.width=normal.height=orm.width=orm.height=size;
  const h=height.getContext('2d'),n=normal.getContext('2d'),o=orm.getContext('2d'),random=seeded([...kind].reduce((a,c)=>a+c.charCodeAt(0),17));
  h.fillStyle=base;h.fillRect(0,0,size,size);
  for(let i=0;i<5200;i++){
    const x=random()*size,y=random()*size,v=random(),w=1+random()*7;
    h.fillStyle=v>.55?`rgba(210,205,164,${.025+random()*.09})`:`rgba(5,18,15,${.03+random()*.14})`;h.fillRect(x,y,w,1+random()*2);
  }
  if(kind==='wood')for(let y=18;y<size;y+=42){h.strokeStyle='#20150f88';h.lineWidth=2;h.beginPath();h.moveTo(0,y);h.bezierCurveTo(140,y+18,330,y-14,size,y+4);h.stroke();}
  if(kind==='stone')for(let i=0;i<34;i++){h.strokeStyle='#09181588';h.lineWidth=1+random()*2;h.beginPath();h.moveTo(random()*size,random()*size);h.lineTo(random()*size,random()*size);h.stroke();}
  if(kind==='bamboo')for(let x=0;x<size;x+=64){h.fillStyle='#17261b88';h.fillRect(x,0,5,size);h.fillStyle='#8aa36c33';h.fillRect(x+6,0,2,size);}
  if(kind==='rope')for(let i=-size;i<size*2;i+=22){h.strokeStyle='#d0af7c55';h.lineWidth=8;h.beginPath();h.moveTo(i,0);h.lineTo(i+size,size);h.stroke();}
  const image=h.getImageData(0,0,size,size),data=image.data,normalData=n.createImageData(size,size),ormData=o.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,l=data[(y*size+(x?x-1:x))*4],r=data[(y*size+Math.min(size-1,x+1))*4],u=data[(Math.max(0,y-1)*size+x)*4],d=data[(Math.min(size-1,y+1)*size+x)*4];
    normalData.data[i]=128+(l-r)*.7;normalData.data[i+1]=128+(u-d)*.7;normalData.data[i+2]=242;normalData.data[i+3]=255;
    const shade=(data[i]+data[i+1]+data[i+2])/3;ormData.data[i]=Math.min(255,205+shade*.18);ormData.data[i+1]=kind==='metal'?72:kind==='water'?58:168+random()*55;ormData.data[i+2]=kind==='metal'?235:8;ormData.data[i+3]=255;
  }
  n.putImageData(normalData,0,0);o.putImageData(ormData,0,0);
  const make=(canvas,color=false)=>{const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(color)t.colorSpace=THREE.SRGBColorSpace;return t;};
  return{map:make(height,true),normal:make(normal),orm:make(orm)};
}

export function createPremiumMaterials(){
  const sets={stone:textureSet('stone','#28352f'),wood:textureSet('wood','#4d3020'),bamboo:textureSet('bamboo','#274b35'),rope:textureSet('rope','#4b3828'),metal:textureSet('metal','#3d3528')};
  const material=(name,color,extra={})=>{const set=sets[name];return new THREE.MeshStandardMaterial({color,map:set.map,normalMap:set.normal,normalScale:new THREE.Vector2(.75,.75),aoMap:set.orm,roughnessMap:set.orm,metalnessMap:set.orm,roughness:.82,metalness:name==='metal'?.75:.05,...extra});};
  const materials={
    stone:material('stone','#aab7ae',{roughness:.72}),moss:material('stone','#59715a',{roughness:.9}),wood:material('wood','#9b7051'),rope:material('rope','#92775d',{roughness:.94}),
    bamboo:material('bamboo','#4e805b',{roughness:.64}),leaf:material('bamboo','#47775a',{side:THREE.DoubleSide,roughness:.54}),iron:material('metal','#77756d',{metalness:.82,roughness:.3}),
    gold:material('metal','#9a7339',{metalness:.94,roughness:.2}),cloth:new THREE.MeshStandardMaterial({color:'#672c27',roughness:.9}),spore:new THREE.MeshStandardMaterial({color:'#a99771',roughness:.86}),
    water:new THREE.MeshPhysicalMaterial({color:'#183f3a',map:sets.stone.map,normalMap:sets.stone.normal,normalScale:new THREE.Vector2(.28,.5),roughnessMap:sets.stone.orm,roughness:.2,metalness:.18,clearcoat:1,clearcoatRoughness:.12,transparent:true,opacity:.9,side:THREE.DoubleSide}),
  };
  return{materials,sets,dispose(){for(const set of Object.values(sets))for(const texture of Object.values(set))texture.dispose();for(const mat of Object.values(materials))mat.dispose();}};
}
