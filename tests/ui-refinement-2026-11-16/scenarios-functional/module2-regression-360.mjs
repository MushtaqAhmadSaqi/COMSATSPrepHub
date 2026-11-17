const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.error) throw new Error(r.error.message); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const wait = async (expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(`!!(${expr})`)) return true; await new Promise(r => setTimeout(r, 200)); } throw new Error('timeout: ' + expr); };
const nav = async (route) => { await send('Page.navigate', { url: `http://127.0.0.1:3000/?cb=${Date.now()}#${route}` }); await new Promise(r => setTimeout(r, 1000)); };
const out = { overflow: {} };

await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('pph_analytics_consent','declined'); sessionStorage.setItem('pph_install_dismissed','true'); sessionStorage.setItem('pph_selectedSubject', JSON.stringify({ name: 'Data Structures & Algorithms', code: 'CSC211', department: 'CS & IT' })); sessionStorage.setItem('pph_selectedPaper', JSON.stringify({ id: 'x', title: 'DS Midterm 2025', subjectName: 'Data Structures & Algorithms', subjectCode: 'CSC211', term: 'Midterm', semester: 'Fall', year: 2025, isSample: true })); } catch {}" });

for (const theme of ['light', 'dark']) {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('pph_dark','${theme === 'dark'}'); } catch {}` });
  for (const route of ['', 'subjects', 'subject-papers', 'quiz', 'gpa', 'dashboard', 'study-hub', 'ai-quiz-generator', 'faq']) {
    await nav(route);
    await ev("document.fonts.ready");
    await new Promise(r => setTimeout(r, 700));
    const w = await ev("document.documentElement.scrollWidth");
    out.overflow[`${theme}:${route || 'home'}`] = w;
  }
}

// Navbar stickiness on home (light)
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('pph_dark','false'); } catch {}" });
await nav('');
await wait("document.querySelector('.nav-glass-pill')");
await ev("window.scrollTo({ top: 700, behavior: 'instant' })");
await new Promise(r => setTimeout(r, 400));
out.navbarSticky = await ev("(() => { const p = document.querySelector('.nav-glass-pill').getBoundingClientRect(); return { top: Math.round(p.top), visible: p.bottom > 0 && p.top < innerHeight }; })()");
await ev("window.scrollTo({ top: 0, behavior: 'instant' })");

// Timed exam sticky timer at 360
await nav('quiz');
await wait("document.querySelector('.quiz-subject-card')");
await ev("document.querySelector('.quiz-subject-card').click()");
await wait("document.querySelector('[aria-label=\"Select quiz mode\"]')");
await ev("document.querySelector('[aria-label=\"Select quiz mode\"] button:last-child').click()");
await ev("document.querySelector('.quiz-generate-btn').click()");
await wait("document.querySelector('[role=timer]')");
await new Promise(r => setTimeout(r, 600));
const before = await ev("(() => { const t = document.querySelector('[role=timer]').getBoundingClientRect(); return { top: Math.round(t.top), width: t.width }; })()");
await ev("(() => { document.querySelector('.quiz-card').style.minHeight = '1600px'; window.scrollTo({ top: 900, behavior: 'instant' }); })()");
await new Promise(r => setTimeout(r, 400));
const after = await ev("(() => { const t = document.querySelector('[role=timer]').getBoundingClientRect(); return { top: Math.round(t.top), width: t.width, visible: t.bottom > 0 && t.top < innerHeight }; })()");
out.timer360 = { before, after };
out.examScrollW = await ev("document.documentElement.scrollWidth");

console.log(JSON.stringify(out, null, 1));
ws.close();