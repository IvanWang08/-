export const Z_LAYERS=Object.freeze({
  farBackground:Object.freeze({min:-80,max:-30,default:-44}),
  midDecoration:Object.freeze({min:-30,max:-8,default:-14}),
  nearDecoration:Object.freeze({min:-8,max:-2,default:-3.6}),
  gameplay:Object.freeze({min:-1,max:1,default:0}),
  foreground:Object.freeze({min:2,max:6,default:2.6}),
});

export function groundHeightAt(level,x,{includePlatforms=true,fallback=0}={}){
  let height=-Infinity;
  for(const solid of level.solids){
    if(solid.enabled===false||x<solid.x-solid.w/2||x>solid.x+solid.w/2)continue;
    if(!includePlatforms&&solid.type!=='ground'&&solid.type!=='wood')continue;
    height=Math.max(height,solid.y+solid.h/2);
  }
  return Number.isFinite(height)?height:fallback;
}

export function groundedY(level,x,objectHeight,options){
  return groundHeightAt(level,x,options)+objectHeight/2+0.006;
}
