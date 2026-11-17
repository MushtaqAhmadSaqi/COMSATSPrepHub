import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const target = (await (await fetch('http://127.0.0.1:9223/json/list')).json()).find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0;
const pending = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise(res => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
const ev = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.error || r.result?.exceptionDetails) throw new Error(JSON.stringify(r.error || r.result.exceptionDetails)); return r.result.result.value; };
const wait = async expr => { const end = Date.now() + 20000; while (Date.now() < end) { if (await ev(`!!(${expr})`)) return; await new Promise(r => setTimeout(r, 100)); } throw new Error(`Timeout: ${expr}`); };
const nav = async route => { await send('Page.navigate', { url: `http://127.0.0.1:3000/?check=${Date.now()}#${route}` }); await new Promise(r => setTimeout(r, 700)); };
const key = async value => { await ev('document.activeElement?.blur?.()'); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: value, code: value === ' ' ? 'Space' : `Digit${value}` }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: value }); };
const tab = async name => { await ev(`document.getElementById('study-tab-${name}').click()`); await wait(`document.getElementById('study-tab-${name}').getAttribute('aria-selected') === 'true'`); };
const capture = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(new URL(name, import.meta.url), Buffer.from(r.result.data, 'base64')); };
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: true });
await nav('study-hub');
await wait("document.getElementById('study-tab-flashcards')");
const backup = await ev("({cards:localStorage.getItem('pph_flashcards_srs'),deck:localStorage.getItem('pph_revision_deck')})");
const report = {};
try {
  await ev(`localStorage.setItem('pph_flashcards_srs', JSON.stringify(Array.from({length:6}, (_,i)=>({id:'ui-fc-'+i,subjectCode:'CSC211',front:'Practice concept '+i,back:'Answer '+i,box:1,nextReview:0})))); localStorage.setItem('pph_revision_deck','[]'); localStorage.setItem('pph_dark','false'); localStorage.setItem('pph_analytics_consent','declined'); sessionStorage.setItem('pph_install_dismissed','true')`);
  await nav('study-hub'); await wait("document.getElementById('study-tab-revision')");
  await tab('revision');
  assert.ok((await ev("document.querySelector('.flashcard-empty').textContent")).includes('Build your Revision Deck'));
  await tab('flashcards');
  await wait("document.querySelector('.flashcard-box')");
  assert.equal(await ev("document.querySelectorAll('.flashcard-rating-row button:disabled').length"), 4);
  await ev("document.querySelector('.flashcard-actions .revision-star-btn').click()");
  assert.equal(await ev("JSON.parse(localStorage.getItem('pph_revision_deck')).length"), 1);
  await key(' ');
  await wait("document.querySelector('.flashcard-box').classList.contains('is-flipped')");
  await new Promise(r => setTimeout(r, 500));
  assert.equal(await ev("document.querySelector('#flashcard-answer').getAttribute('aria-hidden')"), 'false');
  await key('1');
  await wait("document.querySelector('.flashcard-session p').textContent.includes('Hard 1')");
  const rated = await ev("JSON.parse(localStorage.getItem('pph_flashcards_srs'))[0]");
  assert.equal(rated.lastRating, 'hard'); assert.equal(rated.box, 1);
  assert.ok(rated.nextReview - Date.now() > 590000 && rated.nextReview - Date.now() <= 600000);
  report.hardRating = { box: rated.box, intervalMinutes: Math.round((rated.nextReview - Date.now()) / 60000) };
  await ev("document.querySelector('.flashcard-box').scrollIntoView({block:'center',behavior:'instant'})");
  await new Promise(r => setTimeout(r, 200));
  const rect = await ev("(()=>{const r=document.querySelector('.flashcard-box').getBoundingClientRect();return {x:r.left+r.width-25,y:r.top+r.height/2}})()");
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x, y: rect.y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x - 100, y: rect.y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait("document.querySelector('.flashcard-box').classList.contains('is-flipped')");
  report.swipeFlip = true;
  await key('2'); await wait("document.querySelector('.flashcard-session p').textContent.includes('Good 1')");
  await key(' '); await key('3'); await wait("document.querySelector('.flashcard-session p').textContent.includes('Easy 1')");
  report.session = await ev("document.querySelector('.flashcard-session').innerText");
  await ev("document.querySelector('.flashcard-actions .revision-star-btn').click()");
  await nav('study-hub'); await wait("document.getElementById('study-tab-revision')"); await tab('revision');
  assert.equal(await ev("document.querySelectorAll('.revision-card-list article').length"), 2);
  report.refreshPersistence = true;
  for (const width of [375, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 });
    for (const dark of [false, true]) {
      await ev(`document.documentElement.classList.toggle('dark',${dark})`);
      await tab('flashcards');
      await ev("document.querySelector('.flashcard-stage').scrollIntoView({block:'center',behavior:'instant'})");
      await new Promise(r => setTimeout(r, 800));
      assert.ok((await ev('document.documentElement.scrollWidth')) <= width);
      await capture(`module3-${width}-${dark ? 'dark' : 'light'}.png`);
    }
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await key(' '); await new Promise(r => setTimeout(r, 150));
  report.reducedMotion = await ev("({transform:getComputedStyle(document.querySelector('.flashcard-box')).transform,frontVisibility:getComputedStyle(document.querySelector('#flashcard-prompt')).visibility,backVisibility:getComputedStyle(document.querySelector('#flashcard-answer')).visibility})");
  assert.equal(report.reducedMotion.transform, 'none');
  await send('Emulation.setEmulatedMedia', { features: [] });
  await nav('quiz'); await wait("document.querySelector('.quiz-subject-card')");
  await ev("document.querySelector('.quiz-subject-card').click()"); await wait("document.querySelector('.quiz-generate-btn')");
  await ev("document.querySelector('[aria-label=\"Select quiz mode\"] button:last-child').click();document.querySelector('[aria-label=\"Select number of questions\"] button').click()");
  await ev("document.querySelector('.quiz-generate-btn').click()"); await wait("document.querySelector('.quiz-finish-link')");
  await ev("document.querySelector('.quiz-finish-link').click()"); await wait("document.querySelector('[role=dialog]')");
  await ev("Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.includes('Submit Anyway')).click()");
  await wait("document.querySelector('.quiz-stats-row')");
  await ev("document.querySelector('main .revision-star-btn').click()");
  assert.equal(await ev("document.querySelector('main .revision-star-btn').getAttribute('aria-pressed')"), 'true');
  const quizCard = await ev("JSON.parse(localStorage.getItem('pph_flashcards_srs')).find(c=>c.id.startsWith('fc-quiz-'))");
  assert.ok(quizCard.front && quizCard.back); report.quizSummaryStar = true;
  await nav('study-hub'); await wait("document.getElementById('study-tab-revision')"); await tab('revision');
  assert.equal(await ev("document.querySelectorAll('.revision-card-list article').length"), 3);
  report.quizCardInDeck = true;
  const aiParamsBackup = await ev("sessionStorage.getItem('pph_aiQuizParams')");
  try {
    await ev("sessionStorage.setItem('pph_aiQuizParams',JSON.stringify({topic:'Data Structures',subjectCode:'CSC211',difficulty:'Medium',numQuestions:5,questionType:'mcq'}))");
    await nav('take-ai-quiz'); await wait("document.querySelector('.quiz-option-btn')");
    for (let n = 0; n < 5; n++) {
      await ev("document.querySelector('.quiz-option-btn').click()");
      await ev("document.querySelector('.quiz-footer button').click()");
      await wait("document.querySelector('.quiz-footer button').textContent.includes('Next Question') || document.querySelector('.quiz-footer button').textContent.includes('View Final Score')");
      await ev("document.querySelector('.quiz-footer button').click()");
      if (n < 4) await wait("document.querySelector('.quiz-footer button').textContent.includes('Submit Answer')");
    }
    await wait("document.querySelector('.quiz-revision-review')");
    await ev("document.querySelector('.quiz-revision-review .revision-star-btn').click()");
    assert.equal(await ev("document.querySelector('.quiz-revision-review .revision-star-btn').getAttribute('aria-pressed')"), 'true');
    report.aiSummaryStar = true;
  } finally {
    await ev(`const value=${JSON.stringify(aiParamsBackup)};if(value===null)sessionStorage.removeItem('pph_aiQuizParams');else sessionStorage.setItem('pph_aiQuizParams',value)`);
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await ev(`for(const [key,value] of Object.entries(${JSON.stringify({ pph_flashcards_srs: backup.cards, pph_revision_deck: backup.deck })})){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}`);
  ws.close();
}
