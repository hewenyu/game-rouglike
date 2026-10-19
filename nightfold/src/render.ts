import { Game, WORLD, type Enemy } from './sim';
import { center, type Vec } from './math';
const MINT='#a4efcf', ORANGE='#ff9872', PAPER='#f1efde';
export class Renderer {
  ctx: CanvasRenderingContext2D; width=0;height=0;scale=1;ox=0;oy=0; dpr=1; reducedMotion=false; lowQuality=false;
  constructor(public canvas:HTMLCanvasElement) { this.ctx=canvas.getContext('2d',{alpha:false})!;this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize(); }
  resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.dpr=Math.min(window.devicePixelRatio||1,this.lowQuality?1:2);this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);}
  path(points:Vec[],close=true){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));if(close)c.closePath();}
  ring(x:number,y:number,r:number,color:string,width=1){const c=this.ctx;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  diamond(x:number,y:number,r:number,color:string,fill=true){const c=this.ctx;this.path([{x,y:y-r},{x:x+r,y},{x,y:y+r},{x:x-r,y}]);c.fillStyle=color;c.strokeStyle=color;fill?c.fill():c.stroke();}
  text(text:string,x:number,y:number,color:string,size=10,align:CanvasTextAlign='center'){const c=this.ctx;c.font=`${size}px "Courier New", monospace`;c.fillStyle=color;c.textAlign=align;c.fillText(text,x,y);}
  background(t:number){
    const c=this.ctx,w=this.width,h=this.height;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalAlpha=1;c.fillStyle='#101e24';c.fillRect(0,0,w,h);
    const gradient=c.createRadialGradient(w*.55,h*.45,20,w*.55,h*.45,w*.75);gradient.addColorStop(0,'#193136');gradient.addColorStop(1,'#101b22');c.fillStyle=gradient;c.fillRect(0,0,w,h);
    c.strokeStyle='rgba(164,239,207,.045)';c.lineWidth=1;
    for(let x=(w*.5)%40;x<w;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
    for(let y=(h*.5)%40;y<h;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
    for(let i=0;i<45;i++){const x=(Math.sin(i*127.1)*.5+.5)*w,y=(Math.sin(i*311.7)*.5+.5)*h; c.globalAlpha=.18+Math.sin(t*.4+i)*.09;c.fillStyle=PAPER;c.fillRect(x,y,1.5,1.5);}c.globalAlpha=1;
  }
  title(t:number){
    this.background(t);const c=this.ctx,w=this.width,h=this.height;
    const x=w>.8*h?w*.71:w*.65,y=h*.48,r=Math.min(w*.26,h*.33);
    c.save();c.translate(x,y);c.rotate(-.12);this.ring(0,0,r*1.15,'rgba(164,239,207,.14)');this.ring(0,0,r*.81,'rgba(164,239,207,.1)');
    c.setLineDash([2,10]);this.ring(0,0,r*1.35,'rgba(164,239,207,.2)');c.setLineDash([]);
    const points=[{x:-r*.7,y:r*.45},{x:-r*.12,y:-r*.83},{x:r*.85,y:r*.05},{x:-r*.42,y:r*.62},{x:r*.26,y:-r*.34}];
    this.path(points);c.fillStyle='rgba(164,239,207,.045)';c.fill('evenodd');c.strokeStyle='rgba(164,239,207,.2)';c.lineWidth=18;c.stroke();c.strokeStyle=MINT;c.lineWidth=1.8;c.stroke();
    points.forEach((p,i)=>{this.ring(p.x,p.y,5,MINT,1.5);this.text(`0${i+1}`,p.x+17,p.y-12,'#96b6ac',9,'left');});
    const progress=(t*.11)%1,seg=progress*points.length,idx=Math.floor(seg),f=seg-idx,a=points[idx],b=points[(idx+1)%points.length];
    this.diamond(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,7,PAPER);this.ring(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,17,'rgba(241,239,222,.3)');
    for(let i=0;i<9;i++){const ang=i*2.399+t*.035,rr=r*(.25+i*.085);this.diamond(Math.cos(ang)*rr,Math.sin(ang)*rr,4.5,ORANGE);}
    this.text('A SPACE WAITING TO BE FOLDED',0,r*1.58,'#77978f',9);c.restore();
  }
  render(g:Game,t:number){
    this.background(t);const c=this.ctx,w=this.width,h=this.height;
    this.scale=Math.min(w/(w<700?740:1260),h/850);
    const viewW=w/this.scale,viewH=h/this.scale;
    const cameraX=viewW<WORLD.w?Math.max(viewW/2,Math.min(WORLD.w-viewW/2,g.player.x)):WORLD.w/2;
    const cameraY=viewH<WORLD.h?Math.max(viewH/2,Math.min(WORLD.h-viewH/2,g.player.y)):WORLD.h/2;
    this.ox=w/2-cameraX*this.scale;this.oy=h/2-cameraY*this.scale;
    const shake=this.reducedMotion?0:g.shake*8;
    c.translate(this.ox+Math.sin(t*83)*shake,this.oy+Math.cos(t*71)*shake);c.scale(this.scale,this.scale);
    c.strokeStyle='rgba(164,239,207,.18)';c.lineWidth=1;c.setLineDash([4,9]);c.strokeRect(15,15,WORLD.w-30,WORLD.h-30);c.setLineDash([]);
    for(const p of [{x:15,y:15},{x:1185,y:15},{x:15,y:785},{x:1185,y:785}]){c.strokeStyle='#6d9d92';c.beginPath();c.moveTo(p.x-8,p.y);c.lineTo(p.x+8,p.y);c.moveTo(p.x,p.y-8);c.lineTo(p.x,p.y+8);c.stroke();}
    this.text('N / F',600,35,'#45675f',10);this.text('FIELD OF POSSIBILITIES',600,778,'#45675f',9);
    this.ring(600,400,150,'rgba(164,239,207,.035)');this.ring(600,400,300,'rgba(164,239,207,.035)');
    for(const fx of g.effects){
      const a=fx.life/fx.maxLife;c.save();
      if(fx.kind==='fold'||fx.kind==='echo'||fx.kind==='loom'||fx.kind==='gravity'){
        this.path(fx.points);c.globalAlpha=fx.kind==='loom'?Math.min(.15,a*.25):fx.kind==='echo'?.04:.16*a;c.fillStyle=fx.color;c.fill('evenodd');
        c.globalAlpha=fx.kind==='loom'?.4*a:fx.kind==='echo'?.35:a;c.strokeStyle=fx.color;c.lineWidth=fx.kind==='fold'?2+5*a:1;
        if(fx.kind==='echo')c.setLineDash([6,8]);c.stroke();c.setLineDash([]);
        if(fx.kind==='loom'){
          c.save();this.path(fx.points);c.clip('evenodd');c.globalAlpha=.12*a;c.strokeStyle=fx.color;
          for(let y=0;y<800;y+=17){c.beginPath();c.moveTo(0,y);c.lineTo(1200,y);c.stroke();}c.restore();
        }
        if(fx.kind==='gravity'){
          const p=center(fx.points);this.ring(p.x,p.y,12+55*a,fx.color,1.5);this.diamond(p.x,p.y,5,fx.color);
        }
      } else if(fx.kind==='beam') {this.path(fx.points,false);c.strokeStyle=fx.color;c.globalAlpha=a;c.lineWidth=2+9*a;c.stroke();}
      else {
        const p=fx.points[0],radius=fx.kind==='spawn'?30*a+12:10+(1-a)*45;
        c.globalAlpha=a;this.ring(p.x,p.y,radius,fx.color,fx.kind==='hit'?3:1);
        if(fx.kind!=='spawn'&&!this.lowQuality)for(let i=0;i<8;i++){const ang=i*Math.PI/4,r=(1-a)*60;this.diamond(p.x+Math.cos(ang)*r,p.y+Math.sin(ang)*r,2*a,fx.color);}
      }c.restore();
    }
    if(g.stars.length){this.path(g.stars,false);c.strokeStyle='rgba(243,191,113,.5)';c.lineWidth=1;c.setLineDash([4,6]);c.stroke();c.setLineDash([]);g.stars.forEach(p=>{this.diamond(p.x,p.y,6,'#f3bf71');this.ring(p.x,p.y,13,'#f3bf71');});}
    if(g.drawing && g.trail.length){
      const points=[...g.trail,g.player];this.path(points);c.fillStyle='rgba(164,239,207,.065)';c.fill('evenodd');
      const a=g.trail[0];c.beginPath();c.moveTo(g.player.x,g.player.y);c.lineTo(a.x,a.y);c.strokeStyle='rgba(243,191,113,.65)';c.setLineDash([5,7]);c.lineWidth=1.4;c.stroke();c.setLineDash([]);
      this.path(points,false);c.strokeStyle='rgba(164,239,207,.09)';c.lineWidth=13;c.stroke();c.strokeStyle=MINT;c.lineWidth=2.5;c.stroke();
      this.ring(a.x,a.y,8,MINT,1.5);this.diamond(a.x,a.y,3,PAPER);this.text('ANCHOR',a.x,a.y-17,'#8cb6a7',8);
      c.beginPath();c.arc(g.player.x,g.player.y,23,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-g.drawTime/4));c.strokeStyle=MINT;c.lineWidth=2.2;c.stroke();
      if(g.has('mirror')){this.path(points.map(p=>({x:a.x*2-p.x,y:a.y*2-p.y})));c.strokeStyle='rgba(185,218,250,.45)';c.lineWidth=1;c.setLineDash([3,5]);c.stroke();c.setLineDash([]);}
    }
    for(const e of g.enemies)this.enemy(e,t);
    for(const b of g.bullets){if(b.life<=0)continue;c.globalAlpha=b.friendly?.9:1;const color=b.friendly?MINT:ORANGE;
      if(b.friendly){c.strokeStyle='rgba(164,239,207,.3)';c.lineWidth=2;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.045,b.y-b.vy*.045);c.stroke();}
      this.diamond(b.x,b.y,b.r,color);if(!b.friendly)this.ring(b.x,b.y,b.r+3,'rgba(255,152,114,.22)');}c.globalAlpha=1;
    const p=g.player;
    if(g.satellites){this.ring(p.x,p.y,48,'rgba(185,218,250,.2)');for(let i=0;i<g.satellites;i++){const a=g.orbitAngle+i/g.satellites*Math.PI*2;this.diamond(p.x+Math.cos(a)*48,p.y+Math.sin(a)*48,5,'#b9dafa');}}
    c.save();c.translate(p.x,p.y);if(p.invulnerable>0)c.globalAlpha=.65+Math.sin(t*22)*.25;
    c.shadowColor=MINT;c.shadowBlur=this.lowQuality?0:14;this.diamond(0,0,12,PAPER);c.shadowBlur=0;this.diamond(0,0,5,'#1b393c');
    this.ring(0,0,17,'rgba(164,239,207,.3)');c.restore();
    if(g.time<10 && g.folds===0){this.text('YOU',p.x,p.y+36,PAPER,10);}
    if(g.comboTime>0){const alpha=Math.min(1,g.comboTime);c.globalAlpha=alpha;c.fillStyle=PAPER;c.font='500 19px "PingFang SC", sans-serif';c.textAlign='center';c.fillText(g.lastCombo,p.x,p.y-48);c.globalAlpha=1;}
    if(g.player.invulnerable>1.2 && g.damageTaken>0){c.setTransform(this.dpr,0,0,this.dpr,0,0);c.strokeStyle=`rgba(255,152,114,${(g.player.invulnerable-1.2)*.8})`;c.lineWidth=12;c.strokeRect(0,0,w,h);}
  }
  enemy(e:Enemy,t:number){
    const c=this.ctx;c.save();c.translate(e.x,e.y);c.globalAlpha=e.born>0?.25+.3*(1-e.born):1;
    const color=e.flash>0?PAPER:ORANGE;
    if(e.warning>0){c.save();c.globalAlpha=.3+.3*Math.sin(t*15)**2;c.strokeStyle=ORANGE;c.lineWidth=1;
      if(e.kind==='dasher'){c.beginPath();c.moveTo(0,0);c.lineTo(e.aim.x*1.7,e.aim.y*1.7);c.setLineDash([6,6]);c.stroke();}
      else this.ring(0,0,e.r+11+e.warning*6,ORANGE,1.5);c.restore();}
    if(e.kind==='chaser'){
      c.rotate(Math.sin(t*2+e.id)*.15);this.path([{x:0,y:-13},{x:12,y:-4},{x:8,y:12},{x:-8,y:12},{x:-12,y:-4}]);c.fillStyle='#583c36';c.fill();c.strokeStyle=color;c.lineWidth=1.7;c.stroke();this.diamond(0,0,3,color);
    } else if(e.kind==='shooter'){
      c.rotate(Math.PI/4);c.fillStyle='#50392f';c.fillRect(-12,-12,24,24);c.strokeStyle=color;c.lineWidth=1.6;c.strokeRect(-12,-12,24,24);this.ring(0,0,6,color);this.diamond(0,0,2,color);
    } else if(e.kind==='dasher'){
      c.rotate(Math.atan2(e.aim.y,e.aim.x)+Math.PI/2);this.path([{x:0,y:-20},{x:12,y:12},{x:0,y:5},{x:-12,y:12}]);c.fillStyle='#50392f';c.fill();c.strokeStyle=color;c.lineWidth=1.7;c.stroke();
    } else {
      c.rotate(t*.22);const points=Array.from({length:6},(_,i)=>({x:Math.cos(i*Math.PI/3)*39,y:Math.sin(i*Math.PI/3)*39}));this.path(points);c.fillStyle='#412f2b';c.fill();c.strokeStyle=color;c.lineWidth=2.5;c.stroke();this.ring(0,0,26,color);this.diamond(0,0,13,color,false);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;this.diamond(Math.cos(a)*49,Math.sin(a)*49,4,color);}
    }
    c.restore();
    if(e.hp<e.maxHp && e.kind!=='boss'){c.fillStyle='#34433e';c.fillRect(e.x-15,e.y-e.r-10,30,2);c.fillStyle=ORANGE;c.fillRect(e.x-15,e.y-e.r-10,30*Math.max(0,e.hp/e.maxHp),2);}
  }
}
