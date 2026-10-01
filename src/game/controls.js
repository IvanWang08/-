export const DEFAULT_BINDINGS = Object.freeze({
  left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],jump:['Space','KeyW','ArrowUp'],
  interact:['KeyS','ArrowDown'],attack:['KeyJ'],dash:['ShiftLeft','ShiftRight','KeyK'],
  pause:['Escape'],restart:['KeyR'],performance:['KeyF'],
});

export function controlState(keys,pressed,bindings=DEFAULT_BINDINGS){
  const held=name=>bindings[name].some(code=>keys.has(code));
  const tapped=name=>bindings[name].some(code=>pressed.has(code));
  return {move:Number(held('right'))-Number(held('left')),jumpHeld:held('jump'),jumpPressed:tapped('jump'),
    interactPressed:tapped('interact'),attackPressed:tapped('attack'),dashPressed:tapped('dash')};
}
