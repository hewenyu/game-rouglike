import type { Input } from './sim';
export class Controls {
  keys = new Set<string>(); pointerWeave = false; joy = { x: 0, y: 0 };
  movePointer: number | null = null; actionPointer: number | null = null;
  origin = { x: 0, y: 0 }; touchUsed = false;
  constructor(private canvas: HTMLCanvasElement, private stick: HTMLElement, private action: HTMLButtonElement, private active: () => boolean, private onGesture: () => void, private pause: () => void) {
    window.addEventListener('keydown', e => {
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code) && this.active()) e.preventDefault();
      if (e.repeat) return;
      if(e.code==='Escape' || e.code==='KeyP') {this.pause(); return;}
      if(this.active()) { this.keys.add(e.code); this.onGesture(); }
    });
    window.addEventListener('keyup', e=>this.keys.delete(e.code));
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=> {
      if(!this.active() || e.pointerType==='touch' || e.button!==0)return;
      this.pointerWeave=true;this.actionPointer=e.pointerId;canvas.setPointerCapture(e.pointerId);this.onGesture();
    });
    action.addEventListener('pointerdown',e=>{
      if(!this.active() || this.actionPointer!==null)return;
      e.preventDefault(); this.touchUsed ||= e.pointerType==='touch'; this.actionPointer=e.pointerId;this.pointerWeave=true;action.setPointerCapture(e.pointerId);this.onGesture();
    });
    stick.addEventListener('pointerdown',e=>{
      if(!this.active() || this.movePointer!==null)return;
      e.preventDefault(); this.touchUsed=true; this.movePointer=e.pointerId;this.origin={x:e.clientX,y:e.clientY};stick.setPointerCapture(e.pointerId);this.onGesture();stick.classList.add('held');
    });
    window.addEventListener('pointermove',e=>{
      if(e.pointerId!==this.movePointer)return;
      const dx=e.clientX-this.origin.x,dy=e.clientY-this.origin.y,l=Math.hypot(dx,dy),s=Math.min(l,42)/(l||1);
      this.joy={x:dx*s/42,y:dy*s/42};
      stick.style.setProperty('--jx',`${dx*s}px`);stick.style.setProperty('--jy',`${dy*s}px`);
    });
    window.addEventListener('pointerup',e=>this.release(e.pointerId));
    window.addEventListener('pointercancel',()=>{this.clear();this.pause();});
    window.addEventListener('blur',()=>this.clear());
  }
  release(id:number) {
    if(id===this.actionPointer){this.actionPointer=null;this.pointerWeave=false;}
    if(id===this.movePointer){this.movePointer=null;this.joy={x:0,y:0};this.stick.classList.remove('held');this.stick.style.setProperty('--jx','0px');this.stick.style.setProperty('--jy','0px');}
  }
  clear() { this.keys.clear();this.release(this.actionPointer??-1);this.release(this.movePointer??-2);this.pointerWeave=false; }
  read(): Input {
    return { x: Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))+this.joy.x,
      y:Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))+this.joy.y,
      weave:this.keys.has('Space')||this.pointerWeave };
  }
}
