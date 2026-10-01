export const FIXED_DT = 1 / 120;
export const EPSILON = 0.00001;

export function bounds(body) {
  return { left:body.x-body.w/2, right:body.x+body.w/2, bottom:body.y, top:body.y+body.h };
}
export function solidBounds(s) {
  return { left:s.x-s.w/2, right:s.x+s.w/2, bottom:s.y-s.h/2, top:s.y+s.h/2 };
}
export function overlaps(a,b) {
  return a.right>b.left+EPSILON && a.left<b.right-EPSILON
    && a.top>b.bottom+EPSILON && a.bottom<b.top-EPSILON;
}
function yOverlap(a,b) { return a.top>b.bottom+EPSILON && a.bottom<b.top-EPSILON; }
function xOverlap(a,b) { return a.right>b.left+EPSILON && a.left<b.right-EPSILON; }
export function isSolid(s) { return s.enabled!==false && (!s.hidden || s.revealed); }

// Subdividing displacement is a safety net for exceptional velocities and carry motion.
// Each substep resolves X, then Y; visual meshes are deliberately absent here.
export function moveBody(body, dx, dy, solids, options={}) {
  const count=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/(Math.min(body.w,body.h)*.45)));
  const stepX=dx/count, stepY=dy/count;
  let blockedX=false, blockedY=false;
  const result={landed:false,ceiling:false,wall:false,supportId:null,revealed:[],impact:Math.max(0,-(body.vy??0))};
  for(let iteration=0;iteration<count;iteration++) {
    if(!blockedX && stepX) {
      const before=bounds(body);
      let nextX=body.x+stepX;
      for(const s of solids) {
        if(!isSolid(s) || s.id===options.ignoreId) continue;
        const b=solidBounds(s);
        if(!yOverlap(before,b)) continue;
        const candidate={...before,left:nextX-body.w/2,right:nextX+body.w/2};
        if(!xOverlap(candidate,b)) continue;
        const rise=b.top-body.y;
        if(options.stepHeight && body.grounded && rise>EPSILON && rise<=options.stepHeight+EPSILON) {
          const raised={...candidate,bottom:b.top,top:b.top+body.h};
          if(!solids.some(o=>o.id!==s.id && o.id!==options.ignoreId && isSolid(o) && overlaps(raised,solidBounds(o)))) {
            body.y=b.top;
            before.bottom=body.y; before.top=body.y+body.h;
            continue;
          }
        }
        nextX=stepX>0 ? Math.min(nextX,b.left-body.w/2) : Math.max(nextX,b.right+body.w/2);
        blockedX=true; result.wall=true;
      }
      body.x=nextX;
      if(blockedX) body.vx=0;
    }
    if(!blockedY && stepY) {
      const before=bounds(body);
      let nextY=body.y+stepY;
      for(const s of solids) {
        if(s.enabled===false || s.id===options.ignoreId) continue;
        const b=solidBounds(s);
        if(!xOverlap(before,b)) continue;
        if(s.hidden && !s.revealed && !(stepY>0 && before.top<=b.bottom+EPSILON)) continue;
        if(stepY<0 && before.bottom>=b.top-EPSILON && nextY<b.top+EPSILON) {
          nextY=Math.max(nextY,b.top); result.landed=true; result.supportId=s.id; blockedY=true;
        } else if(stepY>0 && before.top<=b.bottom+EPSILON && nextY+body.h>b.bottom-EPSILON) {
          nextY=Math.min(nextY,b.bottom-body.h); result.ceiling=true; blockedY=true;
          if(s.hidden && !s.revealed) { s.revealed=true; result.revealed.push(s.id); }
        }
      }
      body.y=nextY;
      if(blockedY) body.vy=0;
    }
  }
  return result;
}

export function findSupport(body,solids,tolerance=.035) {
  const a=bounds(body);
  return solids.find(s=>{
    if(!isSolid(s)) return false;
    const b=solidBounds(s);
    return xOverlap(a,b) && Math.abs(a.bottom-b.top)<=tolerance;
  });
}
