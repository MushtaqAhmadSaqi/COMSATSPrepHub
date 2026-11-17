const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.error) throw new Error(r.error.message); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const wait = async (expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(`!!(${expr})`)) return true; await new Promise(r => setTimeout(r, 200)); } throw new Error('timeout: ' + expr); };
const nav = async (route) => { await send('Page.navigate', { url: `http://127.0.0.1:3000/?cb=${Date.now()}#${route}` }); await new Promise(r => setTimeout(r, 900)); };
const out = {};

// ── Practice mode at 375 light: chrome must stay visible ──
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('pph_analytics_consent','declined'); localStorage.setItem('pph_dark','false'); sessionStorage.setItem('pph_install_dismissed','true'); } catch {}" });
await nav('quiz');
await wait("document.querySelector('.quiz-subject-card')");
await ev("document.querySelector('.quiz-subject-card').click()");
await wait("document.querySelector('[aria-label=\"Select quiz mode\"]')");
await ev("document.querySelector('[aria-label=\"Select quiz mode\"] button:first-child').click()");
await ev("document.querySelector('.quiz-generate-btn').click()");
await wait("document.querySelector('.quiz-option-btn') && !document.querySelector('main [aria-busy=true]')");
out.practice375 = await ev("(() => ({ navbar: !!document.querySelector('.nav-glass-pill'), footer: !!document.querySelector('footer'), timer: !!document.querySelector('[role=timer]'), exitBtn: !!document.querySelector('.quiz-exit-btn'), finishLink: !!document.querySelector('.quiz-finish-link'), navigator: !!document.querySelector('.quiz-navigator'), scrollW: document.documentElement.scrollWidth }))()");

// ── Dark timed exam at 1280 ──
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('pph_dark','true'); } catch {}" });
await nav('quiz');
await wait("document.querySelector('.quiz-subject-card')");
out.darkClass = await ev("document.documentElement.classList.contains('dark')");
await ev("document.querySelector('.quiz-subject-card').click()");
await wait("document.querySelector('[aria-label=\"Select quiz mode\"]')");
await ev("document.querySelector('[aria-label=\"Select quiz mode\"] button:last-child').click()");
await ev("document.querySelector('[aria-label=\"Select number of questions\"] button').click()");
await ev("document.querySelector('.quiz-generate-btn').click()");
await wait("document.querySelector('[role=timer]') && !document.querySelector('main [aria-busy=true]')");
await new Promise(r => setTimeout(r, 500));
out.darkExam = await ev("(() => ({ navbar: !!document.querySelector('.nav-glass-pill'), footer: !!document.querySelector('footer'), examClass: !!document.querySelector('.quiz-container--exam'), scrollW: document.documentElement.scrollWidth, pills: document.querySelectorAll('.quiz-nav-pill').length }))()");

// Timer width stability while scrolling long content
const before = await ev("(() => { const t = document.querySelector('[role=timer]').getBoundingClientRect(); return { top: t.top, width: t.width }; })()");
await ev("(() => { const card = document.querySelector('.quiz-card'); card.style.minHeight = '1600px'; window.scrollTo({ top: 900, behavior: 'instant' }); })()");
await new Promise(r => setTimeout(r, 300));
const after = await ev("(() => { const t = document.querySelector('[role=timer]').getBoundingClientRect(); return { top: t.top, width: t.width, visible: t.bottom > 0 && t.top < innerHeight }; })()");
out.timerStable = { before, after, widthDelta: Math.abs(before.width - after.width) };
await ev("window.scrollTo({ top: 0, behavior: 'instant' })");

// Answer one question to check dark navigator answered state + contrast tokens
await ev("document.querySelector('.quiz-option-btn').click()");
await ev("document.querySelector('.btn-quiz-next').click()");
await wait("document.querySelector('.quiz-explanation-box')");
out.darkPill = await ev("(() => { const p = document.querySelector('.quiz-nav-pill'); const s = getComputedStyle(p); return { label: p.getAttribute('aria-label'), classes: p.className, bg: s.backgroundColor, color: s.color }; })()");

// Finish via Finish Exam -> submit anyway -> dark summary
await ev("document.querySelector('.quiz-finish-link').click()");
await wait("document.querySelector('[role=dialog]')");
await ev("Array.from(document.querySelectorAll('[role=dialog] button')).find(b => b.textContent.includes('Submit Anyway')).click()");
await wait("document.querySelector('.quiz-stats-row')");
await new Promise(r => setTimeout(r, 400));
out.darkSummary = await ev("(() => ({ navbarBack: !!document.querySelector('.nav-glass-pill'), reviewItems: document.querySelectorAll('.quiz-review-status').length, retry: Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Retry Missed Questions'))?.textContent.trim() || null, scrollW: document.documentElement.scrollWidth }))()");

// Retry missed questions reuses the session
await ev("Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Retry Missed Questions')).click()");
await wait("document.querySelector('[role=timer]') && !document.querySelector('main [aria-busy=true]')");
out.retry = await ev("(() => ({ pills: document.querySelectorAll('.quiz-nav-pill').length, chromeHidden: !document.querySelector('.nav-glass-pill'), counter: document.querySelector('.quiz-counter-text')?.textContent.trim() }))()");

console.log(JSON.stringify(out, null, 1));
ws.close();