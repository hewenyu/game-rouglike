import type { GameEvent } from './sim';
export class Sound {
  context: AudioContext | null = null; master: GainNode | null = null; muted = false; voices=0; index=0;
  init() {
    if(!this.context) {this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.muted?0:.23;this.master.connect(this.context.destination);}
    if(this.context.state==='suspended') void this.context.resume().catch(()=>{});
  }
  toggle() {this.muted=!this.muted;if(this.master)this.master.gain.value=this.muted?0:.23;return this.muted;}
  note(freq:number,duration:number,delay=0,volume=.3,type:OscillatorType='sine') {
    if(!this.context || !this.master || this.muted || this.voices>=18)return;
    this.voices++; const ctx=this.context,t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);o.connect(g);g.connect(this.master);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);
    o.start(t);o.stop(t+duration+.02);o.onended=()=>{this.voices--;o.disconnect();g.disconnect();};
  }
  play(e:GameEvent) {
    const scale=[220,261.63,293.66,329.63,392,440,523.25,587.33];
    if(e.type==='fold'){const f=scale[this.index++%5];this.note(f,.6,0,.4,'triangle');this.note(f*1.5,.7,.035,.22);this.note(f*2,.8,.07,.16);}
    if(e.type==='capture'){for(let i=0;i<Math.min(5,e.count??1);i++)this.note(scale[(i+3)%8]*2,.32,i*.04,.16);}
    if(e.type==='kill')this.note(760,.13,0,.08,'triangle');
    if(e.type==='hurt'){this.note(82,.3,0,.5,'sawtooth');this.note(65,.2,.06,.2,'triangle');}
    if(e.type==='draft'||e.type==='chapter'){[1,1.25,1.5,2].forEach((n,i)=>this.note(261.63*n,.9,i*.09,.23));}
    if(e.type==='end'){[1,1.5,2].forEach((n,i)=>this.note(220*n,1.3,i*.2,.3));}
  }
}
