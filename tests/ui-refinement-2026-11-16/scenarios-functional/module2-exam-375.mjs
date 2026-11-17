const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.error) throw new Error(r.error.message); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const wait = async (expr, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(`!!(${expr})`)) return true; await new Promise(r => setTimeout(r, 200)); } throw new Error('timeout: ' + expr); };
const nav = async (route) => { await send('Page.navigate', { url: `http://127.0.0.1:3000/?cb=${Date.now()}#${route}` }); await new Promise(r => setTimeout(r, 900)); };
const key = (k) => ev(`(() => { document.activeElement?.blur?.(); window.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true, cancelable: true })); })()`);
const clickBtn = (text) => ev(`(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.includes(${JSON.stringify(text)})); if (!b) throw new Error('no button ' + ${JSON.stringify(text)}); b.click(); })()`);
const out = {};

await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('pph_analytics_consent','declined'); localStorage.setItem('pph_dark','false'); sessionStorage.setItem('pph_install_dismissed','true'); } catch {}" });
await nav('quiz');
await wait("document.querySelector('.quiz-subject-card')");
await ev("document.querySelector('.quiz-subject-card').click()");
await wait("document.querySelector('[aria-label=\"Select quiz mode\"]')");
await ev("document.querySelector('[aria-label=\"Select quiz mode\"] button:last-child').click()");
await ev("document.querySelector('[aria-label=\"Select number of questions\"] button').click()");
await ev("document.querySelector('.quiz-generate-btn').click()");
await wait("document.querySelector('[role=timer]') && !document.querySelector('main [aria-busy=true]')");
await new Promise(r => setTimeout(r, 600));

out.examStart = await ev(`(() => ({
  navbar: !!document.querySelector('.nav-glass-pill'),
  footer: !!document.querySelector('footer'),
  bottomNav: !!document.querySelector('.mobile-bottom-nav'),
  examClass: !!document.querySelector('.quiz-container--exam'),
  exitBtn: !!document.querySelector('.quiz-exit-btn'),
  finishLink: !!document.querySelector('.quiz-finish-link'),
  legend: !!document.querySelector('.quiz-nav-legend'),
  pills: document.querySelectorAll('.quiz-nav-pill').length,
  timerText: document.querySelector('[role=timer]').textContent.trim(),
  scrollW: document.documentElement.scrollWidth
}))()`);

await ev("document.querySelector('.quiz-option-btn').click()");
await ev("document.querySelector('.btn-quiz-next').click()");
await wait("document.querySelector('.quiz-explanation-box')");
await key('ArrowRight');
await wait("document.querySelector('.quiz-counter-text').textContent.includes('Question 2 of 5')");
await ev("document.querySelector('.quiz-header button[aria-pressed]').click()");
await key('2');
out.kbdSelected = await ev("document.querySelectorAll('.quiz-option-btn')[1].classList.contains('selected')");
await key('Enter');
await wait("document.querySelector('.quiz-explanation-box')");
await key('ArrowLeft');
await wait("document.querySelector('.quiz-counter-text').textContent.includes('Question 1 of 5')");
await key('ArrowRight');
await wait("document.querySelector('.quiz-counter-text').textContent.includes('Question 2 of 5')");
out.pillLabels = await ev("Array.from(document.querySelectorAll('.quiz-nav-pill')).map(b => b.getAttribute('aria-label'))");

await ev("document.querySelector('.quiz-finish-link').click()");
await wait("document.querySelector('[role=dialog]')");
out.confirmText = await ev("document.querySelector('[role=dialog]').textContent.replace(/\\s+/g, ' ').trim().slice(0, 160)");
await clickBtn('Review Remaining');
await wait("!document.querySelector('[role=dialog]')");
out.reviewJump = await ev("document.querySelector('.quiz-counter-text').textContent.trim()");

for (let i = 0; i < 5; i++) {
  const revealed = await ev("!!document.querySelector('.quiz-explanation-box')");
  if (!revealed) {
    await ev("document.querySelector('.quiz-option-btn').click()");
    await ev("document.querySelector('.btn-quiz-next').click()");
    await wait("document.querySelector('.quiz-explanation-box')");
  }
  const label = await ev("document.querySelector('.btn-quiz-next').textContent.trim()");
  await ev("document.querySelector('.btn-quiz-next').click()");
  if (label.includes('View Results')) break;
  await new Promise(r => setTimeout(r, 450));
}
await wait("document.querySelector('[role=dialog]')");
await clickBtn('Submit Anyway');
await wait("document.querySelector('.quiz-stats-row')");
await new Promise(r => setTimeout(r, 500));
out.summary = await ev(`(() => ({
  stats: Array.from(document.querySelectorAll('.quiz-stat-label')).map(s => s.textContent),
  timeTaken: Array.from(document.querySelectorAll('.quiz-stat-item')).find(s => s.textContent.includes('Time Taken'))?.querySelector('.quiz-stat-value')?.textContent,
  reviewItems: document.querySelectorAll('.quiz-review-status').length,
  statuses: Array.from(document.querySelectorAll('.quiz-review-status')).map(s => s.textContent.trim()),
  retryBtn: Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Retry Missed Questions'))?.textContent.trim() || null,
  navbarBack: !!document.querySelector('.nav-glass-pill'),
  footerBack: !!document.querySelector('footer'),
  scrollW: document.documentElement.scrollWidth
}))()`);

await ev("Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('New Quiz')).click()");
await wait("document.querySelector('[role=timer]') && !document.querySelector('main [aria-busy=true]')");
await ev("document.querySelector('.quiz-exit-btn').click()");
await wait("document.querySelector('[role=dialog]')");
out.exitDialog = await ev("document.querySelector('[role=dialog]').textContent.replace(/\\s+/g, ' ').trim().slice(0, 120)");
await clickBtn('Keep Going');
await wait("!document.querySelector('[role=dialog]')");
out.stillPlaying = await ev("!!document.querySelector('[role=timer]')");
await ev("document.querySelector('.quiz-exit-btn').click()");
await wait("document.querySelector('[role=dialog]')");
await ev("Array.from(document.querySelectorAll('[role=dialog] button')).find(b => b.textContent.trim() === 'Exit Exam').click()");
await wait("document.querySelector('.quiz-subject-card')");
out.afterExit = await ev("(() => ({ navbar: !!document.querySelector('.nav-glass-pill'), footer: !!document.querySelector('footer'), timer: !!document.querySelector('[role=timer]') }))()");

await ev("document.querySelector('.quiz-subject-card').click()");
await wait("document.querySelector('[aria-label=\"Select quiz mode\"]')");
await ev("document.querySelector('.quiz-generate-btn').click()");
await wait("document.querySelector('.quiz-option-btn') && !document.querySelector('main [aria-busy=true]')");
out.practice = await ev("(() => ({ navbar: !!document.querySelector('.nav-glass-pill'), timer: !!document.querySelector('[role=timer]'), exitBtn: !!document.querySelector('.quiz-exit-btn'), scrollW: document.documentElement.scrollWidth }))()");

console.log(JSON.stringify(out, null, 1));
ws.close();