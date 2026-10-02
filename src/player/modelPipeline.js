import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';

export function createModelPipeline({dracoPath='/draco/',onProgress=()=>{}}={}){
  const draco=new DRACOLoader();draco.setDecoderPath(dracoPath);
  const loader=new GLTFLoader();loader.setDRACOLoader(draco);
  return{
    load(url){return new Promise((resolve,reject)=>loader.load(url,resolve,event=>{
      onProgress(event.total?event.loaded/event.total:0);
    },reject));},
    dispose(){draco.dispose();},
  };
}
