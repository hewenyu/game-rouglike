import './style.css';
import { Game, FIXED_DT } from './sim';
import { Renderer } from './render';
import { Controls } from './input';
import { Sound } from './audio';
import { CHAPTERS, RULES, SYNERGIES, type RuleId } from './data';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
  <canvas id="field" aria-label="折夜游戏场地：使用 WASD 移动，按住空格画线，松开收线"></canvas>
  <div class="grain" aria-hidden="true"></div>
  <header class="masthead"><a class="wordmark" href="#" id="home-link" aria-label="折夜首页"><span class="mark">⌁</span> NIGHTFOLD<span class="wordmark-cn">折夜</span></a><div class="header-right"><span class="edition">AN EXPERIMENT IN BORROWED LIGHT</span><button class="icon-button" id="sound" title="开关声音" aria-label="关闭声音">声 ON</button><button class="icon-button" id="pause" hidden aria-label="暂停游戏">Ⅱ</button></div></header>
  <main id="title-screen" class="screen title-screen">
    <div class="title-copy"><div class="eyebrow"><i></i> A SMALL ROGUELIKE ABOUT BIG POSSIBILITIES</div><h1>折<span>夜</span><b>。</b></h1><div class="title-english">NIGHT<span>FOLD</span></div><p class="tagline">把危险，折成星光。</p><p class="intro">你没有武器，只有一根能折叠夜色的线。<br>圈起敌群，借走弹幕，写下只属于这一局的规则。</p><div class="start-actions"><button id="start" class="primary">开始一场夜航 <span>↗</span></button><button id="slice" class="secondary">先试一页 <span>约 2 分钟</span></button></div><div class="start-meta">完整夜航约 12 分钟 <span>·</span> 无数值养成 <span>·</span> 每一笔都是武器</div></div>
    <div class="diagram-label"><span>FIG. 01 / THE FOLD</span><p>一条线。<br>不止一种可能。</p><div class="tiny-line"></div><small>DRAW → FOLD → REWRITE</small></div>
    <div class="how-strip"><div><span class="step-no">01</span><p><strong>移动</strong><small class="desktop-copy">W A S D / 方向键</small><small class="touch-copy">左手拖动摇杆</small></p></div><div><span class="step-no">02</span><p><strong>按住，画线</strong><small class="desktop-copy">空格 / 鼠标左键</small><small class="touch-copy">右手按住「画线」</small></p></div><div><span class="step-no">03</span><p><strong>松手，折起夜色</strong><small>围住敌人 · 敌弹变成你的光</small></p></div><button id="guide" class="text-button">阅读折线手册 ↗</button></div>
    <footer class="title-footer"><span>ORIGINAL RULES. UNEXPECTED CONSTELLATIONS.</span><span id="record-label">一本尚未写下的夜航手记</span></footer>
  </main>
  <section id="hud" hidden aria-label="游戏信息"><div class="hud-top"><div class="chapter-block"><span id="chapter-no">01 / 06</span><strong id="chapter-name">浅夜</strong><small id="chapter-en">THE FIRST THREAD</small></div><div class="life-block"><div id="hearts" aria-label="剩余生命"></div><span id="clock">00:00</span><small id="kills">0 折落</small></div></div><div class="progress-track"><div id="progress-fill"></div></div><div id="boss-bar" hidden><span>守夜人 <small>THE NIGHT KEEPER</small></span><div><i></i></div><small id="boss-countdown"></small></div><div id="rules-bar" aria-label="当前规则"></div><div id="lesson" class="lesson"></div><div id="chapter-toast" class="chapter-toast" aria-live="polite"></div><div class="field-caption"><span id="seed-label"></span><span class="desktop-copy">P / ESC 暂停</span></div></section>
  <div id="touch-controls" hidden><div id="joystick" role="group" aria-label="左手移动摇杆"><span class="joy-cross">+</span><i></i><small>移动</small></div><button id="weave" aria-label="按住画线，松开收线"><span id="weave-label">画线</span><small>HOLD / RELEASE</small><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/></svg></button></div>
  <div id="overlay" class="overlay" hidden></div>
  <div id="status-toast" role="status" aria-live="polite"></div>
`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('field'), renderer=new Renderer(canvas), sound=new Sound();
let game:Game|null=null,lastPhase='',saved=false,view='title',lastTime=0,accumulator=0,uiTick=0,toastUntil=0;
let perfFrames:number[]=[];let frames=0;
type RecordBook={ runs:number; wins:number; best:number; discovered:RuleId[]; muted:boolean; quality:boolean };
let book:RecordBook={runs:0,wins:0,best:0,discovered:[],muted:false,quality:false};
try{const raw=JSON.parse(localStorage.getItem('nightfold.v1')||'null');if(raw && typeof raw==='object')book={runs:Number.isFinite(raw.runs)?Math.max(0,raw.runs):0,wins:Number.isFinite(raw.wins)?Math.max(0,raw.wins):0,best:Number.isFinite(raw.best)?Math.max(0,raw.best):0,discovered:Array.isArray(raw.discovered)?raw.discovered.filter((id:unknown)=>RULES.some(r=>r.id===id)):[],muted:raw.muted===true,quality:raw.quality===true};}catch{/* Storage may be disabled; a run never depends on it. */}
function persist(){try{localStorage.setItem('nightfold.v1',JSON.stringify(book));}catch{notice('浏览器未允许保存；本局仍可正常完成。');}}
sound.muted=book.muted;renderer.lowQuality=book.quality;renderer.resize();
function soundLabel(){$('sound').textContent=sound.muted?'声 OFF':'声 ON';$('sound').setAttribute('aria-label',sound.muted?'开启声音':'关闭声音');}soundLabel();
function notice(text:string){$('status-toast').textContent=text;$('status-toast').classList.add('visible');setTimeout(()=>$('status-toast').classList.remove('visible'),3500);}
function format(t:number){return `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;}
function records(){$('record-label').textContent=book.runs?`${book.runs} 次夜航 · ${book.discovered.length} / 8 条规则已发现 · ${book.wins} 次见到黎明`:'一本尚未写下的夜航手记';}records();
const controls=new Controls(canvas,$('joystick'),$<HTMLButtonElement>('weave'),()=>view==='game'&&game?.phase==='playing',()=>sound.init(),()=>pause());
function pause(){if(view!=='game'||!game)return;if(game.phase==='playing'){game.pause();controls.clear();}else if(game.phase==='paused'){game.resume();controls.clear();}sync();}
function showOverlay(html:string){$('overlay').innerHTML=html;$('overlay').hidden=false;const first=$('overlay').querySelector<HTMLButtonElement>('button');first?.focus({preventScroll:true});}
function closeOverlay(){$('overlay').hidden=true;$('overlay').innerHTML='';}
function home(){controls.clear();view='title';game=null;lastPhase='';closeOverlay();$('title-screen').hidden=false;$('hud').hidden=true;$('touch-controls').hidden=true;$('pause').hidden=true;records();$('start').focus({preventScroll:true});}
function start(mode:'voyage'|'slice',seed?:number){
  sound.init(); controls.clear();game=new Game(seed??crypto.getRandomValues(new Uint32Array(1))[0],mode);view='game';saved=false;lastPhase='';accumulator=0;
  perfFrames=[];
  $('title-screen').hidden=true;$('hud').hidden=false;$('touch-controls').hidden=false;$('pause').hidden=false;closeOverlay();sync();updateHud();
  (document.activeElement as HTMLElement | null)?.blur();
}
function cardDiagram(id:RuleId){
  const shapes:Record<RuleId,string>={
    echo:'<path d="M30 75 70 20 112 75Z"/><path opacity=".4" d="M46 82 86 27 128 82Z"/>',
    gravity:'<path d="M23 75 70 18 125 75Z"/><circle cx="73" cy="56" r="14"/><path d="m36 65 24-6m41 8-14-8m-14-30v13"/>',
    satellite:'<circle cx="75" cy="52" r="32" stroke-dasharray="3 5"/><circle cx="75" cy="20" r="5"/><circle cx="103" cy="68" r="5"/><circle cx="47" cy="68" r="5"/><path d="m75 42 10 10-10 10-10-10Z"/>',
    loom:'<path d="M25 78 70 20 120 78Zm10-13h73M46 52h51M57 38h28M53 78V43m20 35V24m20 54V47"/>',
    mirror:'<path d="m75 52-42-30-8 60Zm0 0 42 30 8-60Z"/><circle cx="75" cy="52" r="4"/><path opacity=".3" d="M75 5v92"/>',
    constellation:'<path stroke-dasharray="4 5" d="m29 77 46-57 46 57Z"/><circle cx="29" cy="77" r="5"/><circle cx="75" cy="20" r="5"/><circle cx="121" cy="77" r="5"/>',
    zipper:'<path opacity=".5" d="m36 72 30-52 45 20Z"/><path d="m8 88 135-65m-18-2 18 2-10 15"/>',
    hatch:'<path d="m42 70 5-35 24 22Zm29-13 28-30 12 36Z"/><path opacity=".4" d="m101 21 15-12m0 31 16-5M38 81 27 90"/>'};
  return `<svg viewBox="0 0 150 105" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${shapes[id]}</svg>`;
}
function draft(){
  if(!game)return;const g=game;
  showOverlay(`<section class="draft-panel"><div class="eyebrow">A NEW WAY TO FOLD / ${String(g.rules.length+1).padStart(2,'0')}</div><h2>改写一条规则<span>。</span></h2><p class="panel-intro">不是让数字变大。是让下一笔，变得不同。</p><div class="cards">${g.choices.map((id,i)=>{const r=RULES.find(r=>r.id===id)!;const combo=SYNERGIES.find(s=>s.ids.includes(id)&&s.ids.filter(v=>v!==id).every(v=>g.has(v)));return `<button class="rule-card" data-rule="${id}" style="--rule-color:${r.color}"><div class="card-top"><span>0${i+1}</span><small>${book.discovered.includes(id)?'已发现':'未写下的可能'}</small></div>${cardDiagram(id)}<small class="rule-en">${r.en}</small><h3>${r.name}</h3><p>${r.description}</p><div class="rule-hint">${combo?`共鸣 · ${combo.name}`:r.hint}</div><span class="choose-label">将它写进这一夜 <b>↗</b></span></button>`;}).join('')}</div><p class="draft-footer">时间已停下。<span class="desktop-copy">点击卡片，或按 1 / 2 / 3 选择。</span>规则永久叠加，直到这一局结束。</p></section>`);
  $('overlay').querySelectorAll<HTMLButtonElement>('[data-rule]').forEach(b=>b.onclick=()=>choose(b.dataset.rule as RuleId));
}
function choose(id:RuleId){if(!game?.choose(id))return;sound.init();sound.play({type:'fold',count:1});controls.clear();if(!book.discovered.includes(id)){book.discovered.push(id);persist();}closeOverlay();sync();updateHud();}
function endScreen(){
  if(!game)return;const g=game,win=g.phase==='won';
  if(!saved){book.runs++;book.wins+=win?1:0;book.best=Math.max(book.best,g.kills);persist();saved=true;}
  const synergy=SYNERGIES.filter(s=>s.ids.every(id=>g.has(id)));
  showOverlay(`<section class="end-panel"><div class="eyebrow">${win?'THE NIGHT GIVES WAY':'EVERY END IS ANOTHER FIRST LINE'}</div><div class="end-symbol">${win?'✧':'⌁'}</div><h2>${win?'你把黎明，折出来了。':'这条线，暂时停在这里。'}</h2><p class="panel-intro">${win?'没有一把武器。只有你，和这一路借来的光。':g.player.hp<=0?'你触到了敌人或橙色弹幕。收线不是无敌：先留出退路，再围住危险。':'守夜人的倒计时结束了。试着用圈伤、吞弹和规则组合一起击败它。'}</p><div class="end-stats"><div><strong>${format(g.time)}</strong><small>夜航时长</small></div><div><strong>${g.kills}</strong><small>折落</small></div><div><strong>${g.captures}</strong><small>借光</small></div><div><strong>${g.bestFold}</strong><small>一笔最多折落</small></div></div><div class="end-build">${g.rules.length?g.rules.map(id=>{const r=RULES.find(r=>r.id===id)!;return `<span>${r.icon} ${r.name}</span>`;}).join(''):'第一条规则，正在下一笔之后等你。'}</div>${synergy.length?`<p class="synergy">本局共鸣 · ${synergy.map(s=>s.name).join(' / ')}</p>`:''}<div class="end-actions"><button class="primary" id="retry">同一夜，再折一次 <span>↗</span></button><button class="secondary" id="new-run">去往另一片夜</button><button class="text-button" id="back-home">回到扉页</button></div><p class="draft-footer">${g.mode==='slice'?'短篇试玩':'完整夜航'} · SEED ${g.seed.toString(16).toUpperCase()} · 没有局外属性加成</p></section>`);
  $('retry').onclick=()=>start(g.mode,g.seed);$('new-run').onclick=()=>start(g.mode);$('back-home').onclick=home;
}
function pauseScreen(){showOverlay(`<section class="pause-panel"><div class="eyebrow">LET THE NIGHT WAIT</div><h2>停一笔，也没关系。</h2><p class="panel-intro">模拟已暂停。未完成的线已放下，不会偷偷结算。</p><button class="primary" id="resume">继续夜航 <span>↗</span></button><button class="secondary" id="quality">画面：${renderer.lowQuality?'轻量':'精细'}（不改变规则）</button><button class="text-button" id="paused-guide">查看操作与规则</button><button class="text-button" id="quit">结束本局，回到扉页</button></section>`);$('resume').onclick=pause;$('quality').onclick=()=>{renderer.lowQuality=!renderer.lowQuality;renderer.resize();book.quality=renderer.lowQuality;persist();pauseScreen();};$('quit').onclick=home;$('paused-guide').onclick=()=>guide(true);}
function guide(fromPause=false){
  showOverlay(`<section class="guide-panel"><div class="eyebrow">THE FOLDING MANUAL / 01</div><h2>不是瞄准。是包围。</h2><div class="manual-grid"><div><b>01 / 落笔</b><p>WASD 或方向键移动。按住空格或鼠标左键设下起点，继续移动画线。手机左手摇杆、右手按住画线按钮。</p></div><div><b>02 / 收线</b><p>松手，虚线自动封口。圈内伤害更高，线缘也能伤敌。至少走出 85 单位才有效；原地点击不会攻击。最长 4 秒自动收线，松手后才能再画。</p></div><div><b>03 / 借光</b><p>收线瞬间，把圈内或线边最多 16 发敌弹变成寻敌光束。绘制中的线不挡子弹，你也没有无敌冲刺。自交处按画面明暗判断是否圈内。</p></div><div><b>04 / 改写</b><p>定期三选一，规则会叠加。六段夜色后击败守夜人；短篇 65 秒后遇见它。每换一段回复 1 格生命，首领出现回复 2 格。首领有明确倒计时。</p></div></div><p class="manual-note">不保存进行中的战局。刷新会回到扉页，仅保存发现记录与设置。切出窗口自动暂停；失焦、取消触摸与改选规则都会放下未完成的线。</p><button id="close-guide" class="primary">明白了 <span>↗</span></button></section>`);
  $('close-guide').onclick=()=>fromPause?pauseScreen():closeOverlay();
}
function sync(){
  if(!game||view!=='game')return;
  if(game.phase!==lastPhase){lastPhase=game.phase;controls.clear();if(game.phase==='draft')draft();else if(game.phase==='paused')pauseScreen();else if(game.phase==='lost'||game.phase==='won')endScreen();else closeOverlay();}
}
function updateHud(){
  if(!game)return;const g=game,c=CHAPTERS[g.chapter];
  $('chapter-no').textContent=g.mode==='slice'?'短篇 / PRELUDE':`${String(g.chapter+1).padStart(2,'0')} / 06`;
  $('chapter-name').textContent=g.bossSpawned?'守夜人':c.name;$('chapter-en').textContent=g.bossSpawned?'THE NIGHT KEEPER':c.en;
  $('hearts').innerHTML=Array.from({length:6},(_,i)=>`<i class="${i<g.player.hp?'alive':''}"></i>`).join('');$('hearts').setAttribute('aria-label',`生命 ${g.player.hp} / 6`);
  $('clock').textContent=format(g.time);$('kills').textContent=`${g.kills} 折落 · ${g.captures} 借光`;
  $('progress-fill').style.width=`${Math.min(100,g.time/g.bossTime*100)}%`;
  const boss=g.enemies.find(e=>e.kind==='boss');$('boss-bar').hidden=!boss;
  if(boss){$('boss-bar').querySelector('i')!.style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;$('boss-countdown').textContent=`在 ${Math.ceil(g.bossDeadline-g.time)} 秒内折出黎明`;}
  $('rules-bar').innerHTML=g.rules.map(id=>{const r=RULES.find(r=>r.id===id)!;return `<span title="${r.description}" style="--rule-color:${r.color}"><b>${r.icon}</b>${r.name}</span>`;}).join('');
  const lesson=g.folds===0?(g.time<10?'前 10 秒有保护：按住画线，绕过橙色敌人，再松手。':'按住画线，移动，再松手。试着绕过前方的橙色敌人。'):g.captures===0&&g.time<30?'三颗慢光留在第一笔附近。再围一次，松手借走它们。':g.folds<3?'金色虚线是闭合边。围住敌人，伤害比擦过线缘更高。':g.time<55?'每一条新规则都会叠加。不要停下，下一笔可以完全不同。':'';
  $('lesson').textContent=lesson;$('lesson').hidden=!lesson;
  $('seed-label').textContent=`SEED / ${g.seed.toString(16).toUpperCase()}`;
  const button=$<HTMLButtonElement>('weave');button.classList.toggle('drawing',g.drawing);button.classList.toggle('cooling',g.cooldown>0);$('weave-label').textContent=g.drawing?'松手':'画线';button.style.setProperty('--charge',String(g.drawing?1-g.drawTime/4:g.cooldown>0?0:1));
  button.disabled=g.phase!=='playing';
}
$('start').onclick=()=>start('voyage');$('slice').onclick=()=>start('slice');$('guide').onclick=()=>guide();$('pause').onclick=pause;
$('sound').onclick=()=>{sound.init();sound.toggle();book.muted=sound.muted;persist();soundLabel();};
$('home-link').onclick=e=>{e.preventDefault();if(view==='game')pause();};
window.addEventListener('keydown',e=>{if(game?.phase==='draft'&&['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();const id=game.choices[Number(e.code.slice(-1))-1];if(id)choose(id);}});
window.addEventListener('blur',()=>{if(game?.phase==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game?.phase==='playing')pause();lastTime=0;accumulator=0;});
window.addEventListener('resize',()=>{renderer.resize();if(game?.phase==='playing')pause();controls.clear();});

// Observational metrics only: no mutable simulation or invulnerability API is exposed.
Object.defineProperty(window,'nightfoldMetrics',{get:()=>({frames,samples:perfFrames.length,medianMs:percentile(.5),p95Ms:percentile(.95),world:{enemies:game?.enemies.length??0,bullets:game?.bullets.length??0,effects:game?.effects.length??0},phase:game?.phase??'title',mode:game?.mode??null,time:game?.time??0,folds:game?.folds??0,kills:game?.kills??0,captures:game?.captures??0,rules:game?.rules.slice()??[],hp:game?.player.hp??0,seed:game?.seed??null,drawing:game?.drawing??false,position:game?{x:game.player.x,y:game.player.y}:null,dpr:renderer.dpr})});
function percentile(q:number){if(!perfFrames.length)return 0;const sorted=[...perfFrames].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))];}
function frame(now:number){
  const rawElapsed=lastTime?(now-lastTime)/1000:0;
  const elapsed=Math.min(rawElapsed,.1);lastTime=now;
  if(view==='game'&&game){
    accumulator=Math.min(accumulator+elapsed,.12);
    while(accumulator>=FIXED_DT){game.step(FIXED_DT,controls.read());accumulator-=FIXED_DT;}
    for(const event of game.drainEvents()){sound.play(event);if(event.type==='chapter'){$('chapter-toast').textContent=event.text??`${CHAPTERS[event.count??0].name} / ${CHAPTERS[event.count??0].note}`;$('chapter-toast').classList.add('visible');toastUntil=now+3400;}}
    sync();renderer.render(game,now/1000);
    if(now-uiTick>100){updateHud();uiTick=now;}
    if(now>toastUntil)$('chapter-toast').classList.remove('visible');
    if(game.phase==='playing'&&rawElapsed>0){perfFrames.push(rawElapsed*1000);if(perfFrames.length>1800)perfFrames.shift();}
  }else renderer.title(now/1000);
  frames++;requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
