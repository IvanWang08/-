export class DamageBus{
  constructor(){this.listeners=new Set();}
  subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  emit(event){for(const listener of this.listeners)listener(Object.freeze({...event}));}
  clear(){this.listeners.clear();}
}
