import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export function createModelPipeline({dracoPath='/draco/',onProgress=()=>{}}={}){
  const loader=new GLTFLoader();let draco=null,prepared=null;
  const prepare=()=>prepared??=(dracoPath?import('three/addons/loaders/DRACOLoader.js').then(({DRACOLoader})=>{draco=new DRACOLoader();draco.setDecoderPath(dracoPath);loader.setDRACOLoader(draco);}):Promise.resolve());
  return{
    load(url){return prepare().then(()=>new Promise((resolve,reject)=>loader.load(url,resolve,event=>{
      onProgress(event.total?event.loaded/event.total:0);
    },reject)));},
    dispose(){draco?.dispose();},
  };
}
