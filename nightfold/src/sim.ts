import { center, clamp, dist, foldedArea, inside, nearPath, pathLength, rng, type Vec } from './math';
import { RULES, type RuleId } from './data';
export const WORLD = { w: 1200, h: 800 };
export const FIXED_DT = 1 / 60;
export type Phase = 'playing' | 'draft' | 'paused' | 'won' | 'lost';
export type Input = { x: number; y: number; weave: boolean };
export type Enemy = Vec & { id: number; kind: 'chaser'|'shooter'|'dasher'|'boss'; hp: number; maxHp: number; r: number; age: number; cooldown: number; warning: number; aim: Vec; flash: number; born: number };
export type Bullet = Vec & { vx: number; vy: number; r: number; life: number; friendly: boolean; damage: number; id: number };
export type Effect = { kind: 'fold'|'echo'|'gravity'|'loom'|'beam'|'burst'|'hit'|'spawn'; points: Vec[]; life: number; maxLife: number; color: string; power?: number; fired?: boolean };
export type GameEvent = { type: 'fold'|'kill'|'hurt'|'capture'|'draft'|'chapter'|'end'; count?: number; text?: string };
export class Game {
  phase: Phase = 'playing'; previousPhase: Phase = 'playing';
  player = { x: 600, y: 470, hp: 6, maxHp: 6, invulnerable: 1.6 };
  enemies: Enemy[] = []; bullets: Bullet[] = []; effects: Effect[] = []; events: GameEvent[] = [];
  trail: Vec[] = []; drawing = false; drawTime = 0; cooldown = 0; holdLatch = false;
  time = 0; chapter = 0; kills = 0; folds = 0; captures = 0; bestFold = 0; damageTaken = 0;
  rules: RuleId[] = []; choices: RuleId[] = []; stars: Vec[] = []; satellites = 0; orbitAngle = 0; satelliteCooldown = 0;
  shake = 0; lastCombo = ''; comboTime = 0; bossSpawned = false; bossDeadline = 0;
  random: () => number; id = 0; spawnTimer = 2.5; nextDraft = 0; draftIndex = 0; initialWave = false;
  readonly draftTimes: number[]; readonly bossTime: number;
  constructor(public seed: number, public mode: 'voyage'|'slice' = 'voyage') {
    this.random = rng(seed); this.draftTimes = mode === 'slice' ? [12, 32, 52] : [20, 80, 160, 250, 340, 430, 520];
    this.bossTime = mode === 'slice' ? 65 : 570;
    this.spawn('chaser', { x: 545, y: 350 }); this.spawn('chaser', { x: 655, y: 350 });
    this.spawn('shooter', { x: 600, y: 210 });
  }
  has(id: RuleId) { return this.rules.includes(id); }
  emit(type: GameEvent['type'], count?: number, text?: string) { this.events.push({ type, count, text }); }
  drainEvents() { const e = this.events; this.events = []; return e; }
  spawn(kind: Enemy['kind'], at?: Vec) {
    if (this.enemies.length >= 72) return;
    let p = at;
    if (!p) {
      const a = this.random() * Math.PI * 2;
      p = { x: clamp(this.player.x + Math.cos(a) * 470, 42, WORLD.w - 42), y: clamp(this.player.y + Math.sin(a) * 470, 42, WORLD.h - 42) };
      if (dist(p, this.player) < 230) p = { x: this.player.x < 600 ? 1110 : 90, y: 100 + this.random() * 600 };
    }
    const hp = kind === 'boss' ? (this.mode === 'slice' ? 420 : 1850) : (kind === 'chaser' ? 32 : kind === 'shooter' ? 48 : 58) + this.chapter * 6;
    this.enemies.push({ ...p, id: ++this.id, kind, hp, maxHp: hp, r: kind === 'boss' ? 39 : kind === 'shooter' ? 18 : kind === 'dasher' ? 17 : 13, age: 0, cooldown: kind === 'boss' ? 2 : 2.6 + this.random(), warning: 0, aim: { x: 0, y: 0 }, flash: 0, born: 1.1 });
    this.effect('spawn', [p], 1.1, '#ff9872');
  }
  effect(kind: Effect['kind'], points: Vec[], life: number, color: string, power?: number) {
    if (this.effects.length > 90) this.effects.splice(0, 1);
    this.effects.push({ kind, points: points.map(p => ({ ...p })), life, maxLife: life, color, power });
  }
  cancelDrawing() { this.drawing = false; this.trail = []; this.drawTime = 0; this.holdLatch = true; }
  pause() { if (this.phase === 'playing') { this.previousPhase = this.phase; this.cancelDrawing(); this.phase = 'paused'; } }
  resume() { if (this.phase === 'paused') this.phase = 'playing'; }
  choose(id: RuleId) {
    if (this.phase !== 'draft' || !this.choices.includes(id) || this.has(id)) return false;
    this.rules.push(id); this.phase = 'playing'; this.player.invulnerable = 1.5; this.choices = [];
    this.lastCombo = RULES.find(r => r.id === id)!.name; this.comboTime = 3.5; return true;
  }
  offer() {
    const pool = RULES.filter(r => !this.has(r.id)).map(r => r.id);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    if (!pool.length) return;
    this.choices = pool.slice(0, 3); this.phase = 'draft'; this.cancelDrawing(); this.emit('draft');
  }
  hurt() {
    if (this.player.invulnerable > 0 || this.phase !== 'playing') return;
    this.player.hp--; this.damageTaken++; this.player.invulnerable = 1.65; this.shake = .3;
    this.effect('hit', [this.player], .5, '#ff9872'); this.emit('hurt');
    if (this.player.hp <= 0) { this.phase = 'lost'; this.cancelDrawing(); this.emit('end'); }
  }
  shoot(from: Vec, direction: Vec, speed: number, friendly: boolean, damage = 26) {
    if (this.bullets.length >= 260) return;
    const l = Math.hypot(direction.x, direction.y) || 1;
    this.bullets.push({ ...from, vx: direction.x / l * speed, vy: direction.y / l * speed, r: friendly ? 4 : 6, life: friendly ? 3 : 7, friendly, damage, id: ++this.id });
  }
  seek(from: Vec, amount: number, damage = 30) {
    const targets = this.enemies.filter(e => e.hp > 0 && e.born <= 0).sort((a,b) => dist(a, from) - dist(b, from));
    for (let i = 0; i < amount; i++) {
      const t = targets[i % Math.max(1, Math.min(4, targets.length))];
      const a = i / amount * Math.PI * 2;
      this.shoot(from, t ? { x:t.x-from.x, y:t.y-from.y } : {x:Math.cos(a),y:Math.sin(a)}, 470, true, damage);
    }
  }
  hit(e: Enemy, damage: number, primary = false) {
    if (e.hp <= 0 || e.born > 0) return;
    e.hp -= damage; e.flash = .16;
    if (e.hp <= 0) {
      this.kills++; this.effect('burst', [e], .6, e.kind === 'boss' ? '#f3bf71' : '#ff9872'); this.emit('kill');
      if (primary && this.has('hatch')) this.seek(e, 2, 27);
      if (e.kind === 'boss') { this.phase = 'won'; this.cancelDrawing(); this.emit('end'); }
    }
  }
  strike(points: Vec[], power: number, primary = false, allowCapture = false) {
    const area = foldedArea(points), validArea = area >= 1200;
    let hitCount = 0, caught = 0;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.born > 0) continue;
      const enclosed = validArea && inside(e, points);
      if (enclosed || nearPath(e, points, e.r + 12)) {
        this.hit(e, power * (enclosed ? 1 : .55), primary); hitCount++;
      }
    }
    if (allowCapture) {
      for (const b of this.bullets) {
        if (b.friendly || b.life <= 0 || caught >= 16) continue;
        if ((validArea && inside(b, points)) || nearPath(b, points, 12)) { b.life = 0; caught++; }
      }
      this.captures += caught;
      if (caught) {
        if (this.has('satellite')) this.satellites = Math.min(8, this.satellites + caught);
        else this.seek(center(points), caught, 35);
        this.emit('capture', caught);
      }
    }
    return { hitCount, caught, validArea };
  }
  fold() {
    const points = [...this.trail, { x: this.player.x, y: this.player.y }];
    this.cancelDrawing();
    if (pathLength(points) < 85) { this.lastCombo = '再走远一点，线才有力量'; this.comboTime = 1.6; this.cooldown = .15; return; }
    this.cooldown = .7; this.folds++;
    const power = 57 + this.rules.length * 4;
    const before = this.kills;
    const result = this.strike(points, power, true, true);
    this.effect('fold', points, .55, '#a4efcf'); this.shake = Math.max(this.shake, .12); this.emit('fold', result.hitCount);
    if (this.has('satellite')) this.satellites = Math.min(8, this.satellites + 1);
    if (this.has('echo')) this.effect('echo', points, 1.4, '#b9dafa', power * .7);
    if (this.has('gravity') && result.validArea) this.effect('gravity', points, 1.05, '#f3bf71', power * .65);
    if (this.has('loom') && result.validArea) {
      const looms = this.effects.filter(e => e.kind === 'loom' && e.life > 0);
      if (looms.length >= 4) looms[0].life = 0;
      this.effect('loom', points, 4, '#a4efcf');
    }
    if (this.has('mirror')) {
      const a = points[0];
      const mirrored = points.map(p => ({ x: a.x * 2 - p.x, y: a.y * 2 - p.y }));
      this.strike(mirrored, power * .75, false, true); this.effect('fold', mirrored, .7, '#b9dafa');
    }
    if (this.has('zipper')) {
      const a = points[0], b = points[points.length - 1], l = dist(a,b);
      if (l > 25) { const v = {x:(b.x-a.x)/l*1600,y:(b.y-a.y)/l*1600}; const beam = [{x:a.x-v.x,y:a.y-v.y},{x:b.x+v.x,y:b.y+v.y}]; this.strike(beam, power * .85); this.effect('beam', beam, .48, '#f3bf71'); }
    }
    if (this.has('constellation')) {
      this.stars.push({ ...points[0] });
      if (this.stars.length === 3) { this.strike(this.stars, power * 1.5, false, true); this.effect('fold', this.stars, .85, '#f3bf71'); this.stars = []; }
    }
    const combo = this.kills - before; this.bestFold = Math.max(this.bestFold, combo);
    if (combo >= 2 || result.caught > 0) { this.lastCombo = result.caught > 0 ? `借光 ×${result.caught}${combo >= 2 ? ` · 折落 ${combo}` : ''}` : `一笔折落 ${combo}`; this.comboTime = 2; }
  }
  step(dt: number, input: Input) {
    if (this.phase !== 'playing') return;
    this.time += dt; this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.cooldown = Math.max(0, this.cooldown - dt); this.shake = Math.max(0, this.shake - dt); this.comboTime = Math.max(0, this.comboTime - dt);
    const magnitude = Math.hypot(input.x, input.y), speed = 235;
    if (magnitude > 0) { this.player.x = clamp(this.player.x + input.x / Math.max(1,magnitude) * speed * dt, 26, WORLD.w-26); this.player.y = clamp(this.player.y + input.y / Math.max(1,magnitude) * speed * dt, 26, WORLD.h-26); }
    if (!input.weave) this.holdLatch = false;
    if (input.weave && !this.drawing && !this.holdLatch && this.cooldown <= 0) { this.drawing = true; this.drawTime = 0; this.trail = [{x:this.player.x,y:this.player.y}]; }
    if (this.drawing) {
      this.drawTime += dt;
      if (dist(this.player, this.trail[this.trail.length - 1]) >= 11) this.trail.push({ x:this.player.x,y:this.player.y });
      if (!input.weave || this.drawTime >= 4) this.fold();
    }
    if (this.phase !== 'playing') return;
    if (this.time >= (this.draftTimes[this.draftIndex] ?? Infinity)) { this.draftIndex++; this.offer(); return; }
    const chapter = this.mode === 'slice' ? Math.min(2, Math.floor(this.time / 24)) : Math.min(5, Math.floor(this.time / 95));
    if (chapter !== this.chapter) { this.chapter = chapter; this.player.hp = Math.min(this.player.maxHp, this.player.hp+1); this.emit('chapter', chapter); }
    if (this.time >= this.bossTime && !this.bossSpawned) {
      this.bossSpawned = true; this.bossDeadline = this.time + (this.mode === 'slice' ? 95 : 150);
      this.enemies = []; this.bullets = []; this.player.hp = Math.min(6,this.player.hp+2);
      this.spawn('boss', {x:600,y:320}); this.emit('chapter', 6, '守夜人 · 把黎明折出来');
    }
    if (this.bossSpawned && this.time >= this.bossDeadline) { this.phase = 'lost'; this.lastCombo = '黎明耗尽了最后的光'; this.cancelDrawing(); this.emit('end'); return; }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.bossSpawned ? 5 : Math.max(.75, 2.9 - this.chapter*.33);
      const count = this.bossSpawned ? 1 : this.chapter >= 3 ? 2 : 1;
      for (let i=0;i<count;i++) { const r=this.random(); this.spawn(r < .2+this.chapter*.025 ? 'shooter' : r > .82 && this.time > 22 ? 'dasher' : 'chaser'); }
    }
    const looms = this.effects.filter(e => e.kind === 'loom' && e.life > 0);
    for (const fx of [...this.effects]) {
      fx.life -= dt;
      if (fx.kind === 'echo' && !fx.fired && fx.life <= .5) { fx.fired=true; this.strike(fx.points, fx.power!); this.effect('fold', fx.points, .45, '#b9dafa'); }
      if (fx.kind === 'gravity') {
        if (fx.life > .45) {
          const c = center(fx.points);
          for (const e of this.enemies) if (e.kind !== 'boss' && inside(e,fx.points)) { e.x += (c.x-e.x)*dt*5; e.y += (c.y-e.y)*dt*5; }
        } else if (!fx.fired) { fx.fired=true; this.strike(fx.points,fx.power!); this.effect('burst',[center(fx.points)],.65,'#f3bf71'); }
      }
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.age += dt; e.flash = Math.max(0,e.flash-dt); e.born = Math.max(0,e.born-dt);
      if (e.born > 0) continue;
      const dx=this.player.x-e.x,dy=this.player.y-e.y,d=Math.hypot(dx,dy)||1;
      const slow = looms.some(f=>inside(e,f.points)) ? .38 : 1;
      if (e.kind === 'dasher') {
        e.cooldown -= dt;
        if (e.warning > 0) { e.warning -= dt; if(e.warning <= 0) { e.cooldown = 2.6; e.aim = { x:e.aim.x*4,y:e.aim.y*4 }; } }
        else if (e.cooldown > 2.2) { e.x+=e.aim.x*dt*slow; e.y+=e.aim.y*dt*slow; }
        else if(e.cooldown<=0 && d<500) { e.warning=.85; e.aim={x:dx/d*150,y:dy/d*150}; }
        else { e.x+=dx/d*42*dt*slow; e.y+=dy/d*42*dt*slow; }
      } else {
        const move = e.kind === 'chaser' ? 48+this.chapter*4 : e.kind === 'boss' ? (d>180?22:0) : (d>300?26:d<190?-22:0);
        e.x+=dx/d*move*dt*slow; e.y+=dy/d*move*dt*slow;
        if (e.kind !== 'chaser') {
          e.cooldown-=dt;
          e.warning=e.cooldown < .75 && d < 560 ? Math.max(.01,e.cooldown) : 0;
          if(e.cooldown<=0 && d<560) {
            if(e.kind==='boss') {
              const n=e.hp<e.maxHp*.5?16:12;
              for(let i=0;i<n;i++) { const a=i/n*Math.PI*2+e.age*.14; this.shoot(e,{x:Math.cos(a),y:Math.sin(a)},105+this.chapter*6,false); }
              this.shoot(e,{x:dx,y:dy},155,false);
              e.cooldown=2.4;
            } else { this.shoot(e,{x:dx,y:dy},105+this.chapter*8,false); e.cooldown=3.1-this.chapter*.15; }
          }
        }
      }
      e.x=clamp(e.x,23,WORLD.w-23);e.y=clamp(e.y,23,WORLD.h-23);
      if(dist(e,this.player)<e.r+10) this.hurt();
    }
    this.orbitAngle += dt*2.1; this.satelliteCooldown=Math.max(0,this.satelliteCooldown-dt);
    for (let i=0;i<this.satellites;i++) {
      const a=this.orbitAngle+i/this.satellites*Math.PI*2;
      const p={x:this.player.x+Math.cos(a)*48,y:this.player.y+Math.sin(a)*48};
      const e=this.enemies.find(e=>e.hp>0 && e.born<=0 && dist(e,p)<e.r+8);
      if(e && this.satelliteCooldown<=0) { this.hit(e,43); this.satellites--; this.satelliteCooldown=.1; this.effect('burst',[p],.3,'#b9dafa'); break; }
    }
    for (const b of this.bullets) {
      if(b.life<=0) continue;
      const slow=!b.friendly && looms.some(f=>inside(b,f.points))?.4:1;
      if(b.friendly) {
        const t=this.enemies.filter(e=>e.hp>0 && e.born<=0).sort((a,c)=>dist(a,b)-dist(c,b))[0];
        if(t) { const d=dist(t,b)||1; b.vx+=( (t.x-b.x)/d*470-b.vx)*dt*4; b.vy+=((t.y-b.y)/d*470-b.vy)*dt*4; }
      }
      const old = {x:b.x,y:b.y}; b.x+=b.vx*dt*slow;b.y+=b.vy*dt*slow;b.life-=dt;
      if(b.friendly) {
        const e=this.enemies.find(e=>e.hp>0 && e.born<=0 && nearPath(e,[old,b],e.r+b.r,false));
        if(e){this.hit(e,b.damage);b.life=0;}
      } else if(nearPath(this.player,[old,b],b.r+9,false)) {this.hurt();b.life=0;}
    }
    this.effects=this.effects.filter(e=>e.life>0);this.enemies=this.enemies.filter(e=>e.hp>0);
    this.bullets=this.bullets.filter(b=>b.life>0 && b.x>-40&&b.x<WORLD.w+40&&b.y>-40&&b.y<WORLD.h+40);
  }
}
