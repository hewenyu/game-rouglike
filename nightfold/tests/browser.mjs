import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.TEST_URL || 'http://127.0.0.1:4178';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('artifacts',{recursive:true});
const report={environment:{browser:await browser.version(),platform:process.platform,viewport:'1440x960',dpr:1,headless:true},checks:[],errors};
const metrics=()=>page.evaluate(()=>window.nightfoldMetrics);
async function check(name,fn){await fn();report.checks.push({name,passed:true});console.log('PASS',name);}
try {
 await page.goto(origin);await page.waitForTimeout(1500);await page.screenshot({path:'artifacts/title-desktop.png'});
 await check('title and guide available',async()=>{await page.locator('#guide').click();await page.getByRole('heading',{name:'不是瞄准。是包围。'}).waitFor();await page.locator('#close-guide').click();});
 await page.locator('#slice').click();await page.waitForTimeout(300);
 await check('movement, fold and pause through keyboard',async()=>{
  await page.keyboard.down('Space');await page.keyboard.down('KeyD');await page.waitForTimeout(450);await page.keyboard.up('KeyD');await page.keyboard.down('KeyW');await page.waitForTimeout(550);await page.keyboard.up('KeyW');await page.keyboard.down('KeyA');await page.waitForTimeout(450);await page.keyboard.up('KeyA');await page.screenshot({path:'artifacts/first-fold.png'});await page.keyboard.up('Space');await page.waitForTimeout(100);assert((await metrics()).folds>=1);
  await page.keyboard.press('Escape');const t=(await metrics()).time;await page.waitForTimeout(350);assert.equal((await metrics()).time,t);await page.locator('#resume').click();
 });
 const down=new Set();
 async function keys(wanted){for(const k of down)if(!wanted.has(k)){await page.keyboard.up(k);down.delete(k);}for(const k of wanted){await page.keyboard.down(k);down.add(k);}}
 let draftShot=false,battleShot=false,loop=0;
 const start=Date.now();
 while(Date.now()-start<180000){
  const m=await metrics();
  if(m.phase==='won'||m.phase==='lost')break;
  if(m.phase==='draft'){
   await keys(new Set());if(!draftShot){await page.screenshot({path:'artifacts/rule-choice.png'});draftShot=true;}
   const offered=await page.locator('[data-rule]').evaluateAll(es=>es.map(e=>e.dataset.rule));
   const preferred=['satellite','zipper','echo','gravity','loom','mirror','hatch','constellation'].find(id=>offered.includes(id));
   await page.locator(`[data-rule="${preferred}"]`).click();continue;
  }
  if(m.phase==='paused'){await page.locator('#resume').click();continue;}
  const dx=m.position.x-600,dy=m.position.y-350,r=Math.hypot(dx,dy)||1;
  // Steer with ordinary keyboard input along a circular route; never write game state.
  const correction=Math.max(-1,Math.min(1,(190-r)/80));
  const vx=-dy/r+dx/r*correction,vy=dx/r+dy/r*correction;
  const wanted=new Set();if(vx>.32)wanted.add('KeyD');if(vx<-.32)wanted.add('KeyA');if(vy>.32)wanted.add('KeyS');if(vy<-.32)wanted.add('KeyW');
  if(m.time%4.5<3.65)wanted.add('Space');
  await keys(wanted);await page.waitForTimeout(110);
  if(!battleShot&&m.time>40&&m.drawing){await page.screenshot({path:'artifacts/battle-desktop.png'});battleShot=true;}
  if(loop++%100===0)console.log('PLAY',JSON.stringify(m));
 }
 await keys(new Set());const result=await metrics();report.sliceResult=result;await page.screenshot({path:'artifacts/slice-result.png'});
 console.log('SLICE RESULT',JSON.stringify(result));
 assert(['won','lost'].includes(result.phase),'normal play should reach an ending');report.checks.push({name:'normal input short run reaches ending',passed:true,result:result.phase});
 await check('same-seed retry resets the run',async()=>{const seed=result.seed;await page.locator('#retry').click();const m=await metrics();assert.equal(m.seed,seed);assert(m.time<1&&m.folds===0&&m.hp===6);});
 await check('resize pauses rather than changing active input',async()=>{await page.setViewportSize({width:1100,height:800});await page.waitForFunction(()=>window.nightfoldMetrics.phase==='paused');});
 await check('reload restores discoveries, not an unfinished run',async()=>{await page.reload();await page.locator('#start').waitFor();assert.equal((await metrics()).phase,'title');assert.match(await page.locator('#record-label').textContent(),/次夜航/);});
 // A separate touch-enabled browser context exercises true, simultaneous touch contacts.
 const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));await mp.goto(origin);await mp.waitForTimeout(1500);await mp.screenshot({path:'artifacts/title-mobile.png'});await mp.locator('#slice').tap();
 const client=await mobile.newCDPSession(mp),jb=await mp.locator('#joystick').boundingBox(),ab=await mp.locator('#weave').boundingBox();
 const j={x:jb.x+jb.width/2,y:jb.y+jb.height/2},a={x:ab.x+ab.width/2,y:ab.y+ab.height/2};
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...j,id:1},{...a,id:2}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:j.x+40,y:j.y,id:1},{...a,id:2}]});await mp.waitForTimeout(650);
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:j.x+15,y:j.y-40,id:1},{...a,id:2}]});await mp.waitForTimeout(650);
 await mp.screenshot({path:'artifacts/touch-drawing.png'});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mp.waitForTimeout(150);
 const mm=await mp.evaluate(()=>window.nightfoldMetrics);assert(mm.folds>=1&&mm.position.x>650);report.touch={passed:true,metrics:mm,scope:'Chrome emulated simultaneous touch contacts; NOT a physical device'};
 for(const cancelled of ['movement','action']){
  const before=await mp.evaluate(()=>window.nightfoldMetrics.folds);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...j,id:1},{...a,id:2}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:j.x-40,y:j.y,id:1},{...a,id:2}]});await mp.waitForTimeout(500);
  // Chromium cancels the active touch stream as a whole; target either captured pointer too.
  await mp.locator(cancelled==='movement'?'#joystick':'#weave').dispatchEvent('pointercancel',{pointerId:cancelled==='movement'?1:2,pointerType:'touch',bubbles:true});
  await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await mp.waitForFunction(()=>window.nightfoldMetrics.phase==='paused');await mp.locator('#resume').tap();await mp.waitForTimeout(150);
  const resumed=await mp.evaluate(()=>window.nightfoldMetrics);assert.equal(resumed.drawing,false);assert.equal(resumed.folds,before);
 }
 report.checks.push({name:'both touch cancellation targets resume without phantom folds',passed:true});
 await mobile.close();assert.equal(errors.length,0);report.checks.push({name:'no uncaught browser exceptions',passed:true});
} catch(e) {report.failure=e.stack;console.error(e);process.exitCode=1;await page.screenshot({path:'artifacts/failure.png'}).catch(()=>{});} finally {await writeFile('artifacts/browser-results.json',JSON.stringify(report,null,2));await browser.close();}
