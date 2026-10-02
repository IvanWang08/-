import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { writeFile, mkdir } from 'node:fs/promises';

globalThis.FileReader=class{
  readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.();});}
};

const root=new THREE.Group();root.name='OriginalXiake';
const geometry=new THREE.CapsuleGeometry(.31,.88,8,16);geometry.translate(0,.78,0);
const positions=geometry.attributes.position,skinIndices=[],skinWeights=[];
for(let i=0;i<positions.count;i++){
  const y=positions.getY(i);const bone=Math.max(0,Math.min(3,Math.floor(y/.43)));
  skinIndices.push(bone,0,0,0);skinWeights.push(1,0,0,0);
}
geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));
geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4));
const material=new THREE.MeshStandardMaterial({color:'#814137',roughness:.72,metalness:.05});
const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name='SkinnedCore';root.add(mesh);
const bones=[];for(let i=0;i<4;i++){const bone=new THREE.Bone();bone.name=['Root','Waist','Chest','Head'][i];bone.position.y=i?0.42:0;bones.push(bone);if(i)bones[i-1].add(bone);}
mesh.add(bones[0]);mesh.bind(new THREE.Skeleton(bones));
const times=[0,.25,.5,.75,1];
const q=(axis,values)=>values.flatMap(v=>new THREE.Quaternion().setFromAxisAngle(axis,v).toArray());
const clip=(name,duration,tracks)=>new THREE.AnimationClip(name,duration,tracks);
const axisX=new THREE.Vector3(1,0,0),axisZ=new THREE.Vector3(0,0,1);
const animations=[
  clip('Idle',1,[new THREE.QuaternionKeyframeTrack('Chest.quaternion',times,q(axisZ,[0,.025,0,-.025,0]))]),
  clip('Run',1,[new THREE.QuaternionKeyframeTrack('Waist.quaternion',times,q(axisZ,[0,.12,0,-.12,0]))]),
  clip('Jump',.6,[new THREE.QuaternionKeyframeTrack('Chest.quaternion',[0,.3,.6],q(axisX,[0,-.18,0]))]),
  clip('DoubleJump',.7,[new THREE.QuaternionKeyframeTrack('Root.quaternion',[0,.35,.7],q(axisX,[0,Math.PI*2,Math.PI*2]))]),
  clip('Attack',.4,[new THREE.QuaternionKeyframeTrack('Chest.quaternion',[0,.12,.28,.4],q(axisZ,[.42,-.65,.32,0]))]),
  clip('Dash',.3,[new THREE.QuaternionKeyframeTrack('Chest.quaternion',[0,.15,.3],q(axisZ,[0,-.42,0]))]),
  clip('Hurt',.45,[new THREE.QuaternionKeyframeTrack('Chest.quaternion',[0,.16,.45],q(axisZ,[0,.5,0]))]),
  clip('Death',.8,[new THREE.QuaternionKeyframeTrack('Root.quaternion',[0,.8],q(axisZ,[0,Math.PI/2]))]),
];
const exporter=new GLTFExporter();
const binary=await new Promise((resolve,reject)=>exporter.parse(root,resolve,reject,{binary:true,animations,onlyVisible:true}));
const out=new URL('../assets/models/original-xiake/',import.meta.url);await mkdir(out,{recursive:true});
await writeFile(new URL('xiake.glb',out),Buffer.from(binary));
console.log(`wrote ${binary.byteLength} bytes`);
