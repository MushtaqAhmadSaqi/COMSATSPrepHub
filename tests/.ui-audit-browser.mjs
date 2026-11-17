import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'comsatsprephub-ui-audit-'));
const polish = process.env.UI_AUDIT_POLISH === '1';
const routeSweep = process.env.UI_AUDIT_ROUTES === '1';
const scenarios = process.env.UI_AUDIT_SCENARIOS === '1';
const stage = process.env.UI_AUDIT_STAGE || 'after';
const target = process.env.UI_AUDIT_TARGET || 'all';
const baseUrl = process.env.UI_AUDIT_BASE_URL || 'http://localhost:3000';
const baseOrigin = new URL(baseUrl).origin;
const output = path.resolve(process.env.UI_AUDIT_OUTPUT || 'tests/ui-verification-2026-11-16');
fs.mkdirSync(output, { recursive: true });
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--disable-component-update', '--disable-sync', 'about:blank'
], { stdio: 'ignore' });
let socket;
const report = { browser: 'Isolated headless Microsoft Edge', checks: [], screenshots: [], blockedRequests: [], networkErrors: [], consoleErrors: [], exceptions: [] };
try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  await new Promise((resolve, reject) => {
    const watcher = fs.watch(profile, () => {
      if (fs.existsSync(portFile)) {
        watcher.close();
        clearTimeout(timer);
        resolve();
      }
    });
    const timer = setTimeout(() => { watcher.close(); reject(new Error('Headless browser startup timed out')); }, 20000);
    browser.once('error', reject);
  });
  const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timed out: ${method}`)); }, 15000);
    pending.set(requestId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const networkRequests = new Map();
  socket.addEventListener('message', async event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const call = pending.get(message.id);
      if (!call) return;
      pending.delete(message.id);
      clearTimeout(call.timer);
      if (message.error) call.reject(new Error(JSON.stringify(message.error)));
      else call.resolve(message.result);
    } else if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      const url = new URL(request.url);
      const local = url.origin === baseOrigin && !url.pathname.startsWith('/api/');
      const font = ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
      if (['GET', 'HEAD'].includes(request.method) && (local || font)) {
        await send('Fetch.continueRequest', { requestId });
      } else {
        report.blockedRequests.push({ method: request.method, host: url.hostname, path: url.pathname });
        await send('Fetch.fulfillRequest', { requestId, responseCode: 503, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"error":"Blocked for isolated UI audit"}').toString('base64') });
      }
    } else if (message.method === 'Network.requestWillBeSent') {
      const url = new URL(message.params.request.url);
      networkRequests.set(message.params.requestId, { host: url.hostname, path: url.pathname });
    } else if (message.method === 'Network.loadingFailed' && !message.params.canceled) {
      report.networkErrors.push({ ...networkRequests.get(message.params.requestId), error: message.params.errorText });
    } else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
      report.networkErrors.push({ ...networkRequests.get(message.params.requestId), status: message.params.response.status });
    } else if (message.method === 'Runtime.exceptionThrown') {
      report.exceptions.push(message.params.exceptionDetails.text);
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      report.consoleErrors.push(message.params.args.filter(a => a.type === 'string').map(a => a.value).join(' ').slice(0, 300));
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const wait = condition => evaluate(`(async () => { const start = performance.now(); while (!(${condition})) { if (performance.now() - start > 12000) throw new Error('UI condition timed out: ' + ${JSON.stringify(condition)}); await new Promise(requestAnimationFrame); } await new Promise(requestAnimationFrame); return true; })()`);
  const key = async (key, code = key, modifiers = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: ({ Tab: 9, Enter: 13, Escape: 27, Home: 36, End: 35, ArrowRight: 39, ArrowLeft: 37, ArrowDown: 40, ArrowUp: 38 })[key] });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers });
  };
  const selectors = { upload: '.upload-container', terms: '.terms-container', privacy: '.terms-container', disclaimer: '.terms-container', gpa: '.grade-workspace', 'ai-quiz-generator': '[role=radiogroup]', 'take-ai-quiz': '.take-ai-container', 'study-hub': '.study-hub-container', dashboard: '.study-dashboard', account: '.account-clear-data', about: '.about-container', subjects: '.subjects-container', 'subject-papers': '.papers-container', 'paper-view': '.paperview-container', quiz: '.quiz-container', faq: 'main h1', auth: '.auth-page-container', '': '.home-page-wrapper' };
  let navigationId = 0;
  const navigate = async route => {
    await send('Page.navigate', { url: `${baseUrl}/?ui-audit=${++navigationId}#${route || 'home'}` });
    await wait(`document.querySelector(${JSON.stringify(selectors[route] || 'main > div > *:not(.route-loading)')}) && !document.querySelector('.route-loading')`);
    await wait("getComputedStyle(document.querySelector('main').firstElementChild).opacity === '1' && (!document.querySelector('main h1') || getComputedStyle(document.querySelector('main h1')).opacity === '1')");
  };
  const check = async (name, fn) => {
    try { await fn(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
    catch (error) {
      const diagnostics = await evaluate("(() => { const input = document.querySelector('main input[type=search]'); const zone = document.querySelector('.upload-dropzone'); return { hash: location.hash, heading: document.querySelector('main h1')?.textContent, activeElement: { tag: document.activeElement.tagName, id: document.activeElement.id, label: document.activeElement.getAttribute('aria-label') }, documentFocused: document.hasFocus(), focusEvents: window.__auditFocusEvents, homePresent: Boolean(document.querySelector('.home-page-wrapper')), searchFocused: document.activeElement === input, suggestionsPresent: Boolean(document.querySelector('[aria-label=\"Course suggestions\"]')), outline: zone && { width: getComputedStyle(zone).outlineWidth, style: getComputedStyle(zone).outlineStyle, transition: getComputedStyle(zone).transition, focusWithin: zone.matches(':focus-within') } }; })()").catch(() => null);
      report.checks.push({ name, passed: false, error: error.message, diagnostics });
      console.log('FAIL', name, error.message, JSON.stringify(diagnostics));
    }
  };
  const screenshot = async name => {
    await evaluate('document.fonts.ready');
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const file = path.join(output, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
    report.screenshots.push(file);
  };
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  if (!routeSweep && !scenarios && (!polish || process.env.UI_AUDIT_FULL === '1')) {
  await navigate('upload');
  await wait("document.querySelector('#upload-tab-upload')");
  await check('Upload tabs: End, Home and panel association', async () => {
    await evaluate("document.querySelector('#upload-tab-upload').focus()");
    await key('End');
    await wait("document.querySelector('#upload-tab-request')?.getAttribute('aria-selected') === 'true'");
    assert.equal(await evaluate("document.activeElement.id"), 'upload-tab-request');
    assert.equal(await evaluate("document.querySelector('#upload-panel').getAttribute('aria-labelledby')"), 'upload-tab-request');
    await key('Home');
    await wait("document.querySelector('#upload-tab-upload')?.getAttribute('aria-selected') === 'true'");
  });
  await check('Upload file input: focus, invalid file and recovery', async () => {
    await evaluate("document.querySelector('#paper-file-input').focus()");
    assert.equal(await evaluate("document.activeElement.id"), 'paper-file-input');
    await wait("getComputedStyle(document.querySelector('.upload-dropzone')).outlineWidth === '2px'");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.upload-dropzone')).outlineStyle"), 'solid');
    await evaluate("(() => { const d = new DataTransfer(); d.items.add(new File(['bad'], 'invalid.txt', { type: 'text/plain' })); const i = document.querySelector('#paper-file-input'); i.files = d.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await wait("document.querySelector('#upload-file-error')");
    assert.equal(await evaluate("document.querySelector('#paper-file-input').getAttribute('aria-invalid')"), 'true');
    await evaluate("(() => { const d = new DataTransfer(); d.items.add(new File(['%PDF'], 'test-paper.pdf', { type: 'application/pdf' })); const i = document.querySelector('#paper-file-input'); i.files = d.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await wait("!document.querySelector('#upload-file-error')");
  });
  await navigate('');
  await check('Home suggestions remain visible during native Tab navigation', async () => {
    await wait("document.querySelector('input[type=search]')");
    await evaluate("window.__auditFocusEvents = []; for (const type of ['focusin', 'focusout']) document.addEventListener(type, event => window.__auditFocusEvents.push({ type, tag: event.target.tagName, label: event.target.getAttribute('aria-label') }), true); document.querySelector('.brand-logo').focus(); document.querySelector('main input[type=search]').focus()");
    await wait("document.querySelector('[aria-label=\"Course suggestions\"]')");
    await key('Tab');
    await key('Tab');
    assert.equal(await evaluate("Boolean(document.activeElement.closest('[aria-label=\"Course suggestions\"]'))"), true);
    await evaluate("document.querySelector('.brand-logo').focus()");
    await wait("!document.querySelector('[aria-label=\"Course suggestions\"]')");
  });
  await check('Auth modes preserve opener and restore focus on Escape', async () => {
    await evaluate("document.querySelector('.signin-gradient-btn').focus(); document.querySelector('.signin-gradient-btn').click()");
    await wait("document.querySelector('.auth-modal-card') && document.activeElement.closest('.auth-modal-card')");
    await evaluate("document.querySelector('.auth-switch-btn').click()");
    await wait("document.querySelector('.auth-title').textContent.includes('Account')");
    await key('Escape');
    await wait("!document.querySelector('.auth-modal-card')");
    assert.equal(await evaluate("document.activeElement.classList.contains('signin-gradient-btn')"), true);
  });
  await check('Command palette active selection follows keyboard with input focus', async () => {
    await evaluate("document.querySelector('.cmd-trigger-btn').click()");
    await wait("document.querySelector('[role=combobox]') && document.activeElement.getAttribute('role') === 'combobox'");
    await key('ArrowDown');
    await wait("document.querySelectorAll('[role=option]')[1]?.getAttribute('aria-selected') === 'true'");
    const selected = await evaluate("(() => { const input = document.querySelector('[role=combobox]'); return { inputFocus: document.activeElement === input, target: Boolean(document.getElementById(input.getAttribute('aria-activedescendant'))) }; })()");
    assert.deepEqual(selected, { inputFocus: true, target: true });
    await key('Escape');
    await wait("!document.querySelector('[role=combobox]')");
  });
  for (const outcome of ['accepted', 'dismissed']) {
    await check(`Mock install prompt is hidden after ${outcome} outcome`, async () => {
      await evaluate(`(() => { window.__auditInstallCalls = 0; const event = new Event('beforeinstallprompt', { cancelable: true }); Object.assign(event, { prompt: () => window.__auditInstallCalls++, userChoice: Promise.resolve({ outcome: ${JSON.stringify(outcome)} }) }); window.dispatchEvent(event); })()`);
      await wait("document.querySelector('.install-prompt__btn--install')");
      await evaluate("document.querySelector('.install-prompt__btn--install').click()");
      await wait("!document.querySelector('.install-prompt')");
      assert.equal(await evaluate('window.__auditInstallCalls'), 1);
    });
  }
  for (const width of [375, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await check(`Install banner stays centered and its actions fit at ${width}px`, async () => {
      await evaluate("(() => { const event = new Event('beforeinstallprompt', {cancelable:true}); Object.assign(event, {prompt() {}, userChoice:Promise.resolve({outcome:'dismissed'})}); window.dispatchEvent(event); })()");
      await wait("document.querySelector('.install-prompt') && innerWidth === " + width);
      const bounds = await evaluate("(() => { const rect = document.querySelector('.install-prompt').getBoundingClientRect(); const actions = document.querySelector('.install-prompt__actions').getBoundingClientRect(); return {left:rect.left, right:rect.right, center:(rect.left+rect.right)/2, viewport:document.documentElement.clientWidth, actionsLeft:actions.left, actionsRight:actions.right}; })()");
      assert.ok(Math.abs(bounds.center - bounds.viewport / 2) <= 1 && bounds.left >= 0 && bounds.right <= bounds.viewport && bounds.actionsLeft >= 0 && bounds.actionsRight <= bounds.viewport, JSON.stringify(bounds));
    });
    await evaluate("document.querySelector('.install-prompt__btn--dismiss').click()");
    await wait("!document.querySelector('.install-prompt')");
  }
  await check('Reduced motion preserves hidden scroll control and instant scroll behavior', async () => {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await navigate('');
    await wait("matchMedia('(prefers-reduced-motion: reduce)').matches");
    await evaluate("window.scrollTo({top:0, behavior:'instant'})");
    await wait("document.querySelector('.scroll-top-btn').getAttribute('tabindex') === '-1'");
    assert.equal(await evaluate("document.querySelector('.scroll-top-btn').getAttribute('aria-hidden')"), 'true');
    assert.equal(await evaluate("getComputedStyle(document.documentElement).scrollBehavior"), 'auto');
    await evaluate("window.scrollTo({top:600, behavior:'instant'})");
    await wait("document.querySelector('.scroll-top-btn').getAttribute('tabindex') === '0'");
    assert.equal(await evaluate("document.querySelector('.scroll-top-btn').getAttribute('aria-hidden')"), 'false');
    assert.equal(await evaluate("document.querySelector('.scroll-top-btn').click(); window.scrollY"), 0);
    await evaluate("window.scrollTo({top:600, behavior:'instant'})");
    assert.equal(await evaluate("document.querySelector('.brand-logo').click(); window.scrollY"), 0);
  });
  await send('Emulation.setEmulatedMedia', { features: [] });
  await check('Generic report Modal inside main overlays navigation, traps focus and restores opener', async () => {
    await evaluate("(async () => { const {default:React} = await import('/node_modules/.vite/deps/react.js'); const {default:ReactDOM} = await import('/node_modules/.vite/deps/react-dom_client.js'); const {default:Modal} = await import('/src/components/ui/Modal.jsx'); document.querySelector('.brand-logo').focus(); const host = document.createElement('div'); host.id = 'ui-audit-modal'; document.querySelector('main').appendChild(host); const root = ReactDOM.createRoot(host); window.__auditModalRoot = root; window.__auditModalClose = () => root.render(React.createElement(Modal, {isOpen:false, onClose:window.__auditModalClose})); root.render(React.createElement(Modal, {isOpen:true, title:'Isolated report dialog check', onClose:window.__auditModalClose}, React.createElement('textarea', {'aria-label':'Isolated report description'}))); })()");
    await wait("document.querySelector('[aria-modal=true]') && document.activeElement.getAttribute('aria-label') === 'Close dialog'");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('main')).zIndex"), '1000');
    assert.equal(await evaluate("Boolean(document.elementFromPoint(10, 10).closest('[aria-modal=true]'))"), true);
    await key('Tab', 'Tab', 8);
    assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), 'Isolated report description');
    await key('Tab');
    assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), 'Close dialog');
    await key('Escape');
    await wait("!document.querySelector('[aria-modal=true]')");
    assert.equal(await evaluate("document.activeElement.classList.contains('brand-logo')"), true);
    await evaluate("window.__auditModalRoot.unmount(); document.querySelector('#ui-audit-modal').remove()");
  });
  await navigate('ai-quiz-generator');
  await check('AI radio groups support native arrow selection and one Tab stop', async () => {
    await wait("document.querySelectorAll('[role=radiogroup]').length === 3");
    await evaluate("document.querySelector('[role=radio][aria-checked=true]').focus()");
    await key('End');
    await wait("document.querySelector('[role=radiogroup]').lastElementChild.getAttribute('aria-checked') === 'true'");
    assert.equal(await evaluate("Array.from(document.querySelectorAll('[role=radiogroup]')).every(group => group.querySelectorAll('[role=radio][tabindex=\"0\"]').length === 1)"), true);
    await key('ArrowRight');
    await wait("document.querySelector('[role=radiogroup]').firstElementChild.getAttribute('aria-checked') === 'true'");
  });
  await navigate('study-hub');
  await check('Study tabs wrap and keep panel label synchronized', async () => {
    await wait("document.querySelector('#study-tab-daily')");
    await evaluate("document.querySelector('#study-tab-daily').focus()");
    await key('ArrowLeft');
    await wait("document.querySelector('#study-tab-cheatsheets').getAttribute('aria-selected') === 'true'");
    assert.equal(await evaluate("document.querySelector('#study-hub-panel').getAttribute('aria-labelledby')"), 'study-tab-cheatsheets');
    await key('ArrowRight');
    await wait("document.querySelector('#study-tab-daily').getAttribute('aria-selected') === 'true'");
  });
  await navigate('account');
  await check('Dark account action has the intended existing danger foreground', async () => {
    await wait("document.querySelector('.account-clear-data')");
    if (!await evaluate("document.documentElement.classList.contains('dark')")) await evaluate("document.querySelector('[aria-label=\"Switch to dark mode\"]').click()");
    await wait("document.documentElement.classList.contains('dark')");
    await wait("getComputedStyle(document.querySelector('.account-clear-data')).color === 'rgb(239, 68, 68)'");
  });
  for (const width of [375, 768]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await check(`Cookie notice clears the mobile navigation at ${width}px`, async () => {
      await wait(`innerWidth === ${width} && getComputedStyle(document.querySelector('.cookie-notice')).bottom === '88px'`);
      const bounds = await evaluate("(() => { const notice = document.querySelector('.cookie-notice').getBoundingClientRect(); const nav = document.querySelector('.mobile-bottom-nav').getBoundingClientRect(); return {noticeBottom:notice.bottom, navTop:nav.top}; })()");
      assert.ok(bounds.noticeBottom <= bounds.navTop, JSON.stringify(bounds));
    });
  }
  await evaluate("document.querySelector('.cookie-notice__button--secondary').click()");
  await wait("!document.querySelector('.cookie-notice')");
  for (const width of [375, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const route of ['upload', 'ai-quiz-generator', 'study-hub', 'dashboard', '']) {
      await navigate(route);
      const selector = ({ upload: '.upload-container', 'ai-quiz-generator': '[role=radiogroup]', 'study-hub': '.study-hub-container', dashboard: '.study-dashboard', '': '.home-page-wrapper' })[route];
      await wait(`document.querySelector(${JSON.stringify(selector)})`);
      await check(`${route || 'home'}: no horizontal overflow at ${width}px`, async () => {
        const size = await evaluate('({ width: innerWidth, scroll: document.documentElement.scrollWidth })');
        assert.ok(size.scroll <= size.width, JSON.stringify(size));
      });
      if (width === 375 || width === 1440) await screenshot(`${route || 'home'}-dark-${width}-after`);
    }
  }
  }
  if (!routeSweep && !scenarios && polish) {
    report.stage = stage;
    report.target = target;
    report.measurements = [];
    const verify = area => stage !== 'before' && (target === 'all' || target === area);
    const capture = process.env.UI_AUDIT_CAPTURE !== '0';
    await navigate('');
    await evaluate("sessionStorage.setItem('pph_install_dismissed', 'true'); document.querySelector('.install-prompt__btn--dismiss')?.click()");
    if (await evaluate("Boolean(document.querySelector('.cookie-notice__button--secondary'))")) {
      await evaluate("document.querySelector('.cookie-notice__button--secondary').click()");
      await wait("!document.querySelector('.cookie-notice')");
    }
    for (const theme of ['light', 'dark']) {
      const dark = theme === 'dark';
      if (await evaluate("document.documentElement.classList.contains('dark')") !== dark) {
        await evaluate(`document.querySelector('[aria-label="Switch to ${dark ? 'dark' : 'light'} mode"]').click()`);
        await wait(`document.documentElement.classList.contains('dark') === ${dark}`);
      }
      for (const width of [375, 414, 768, 1024, 1440]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
        for (const route of ['terms', 'upload']) {
          await navigate(route);
          await evaluate('document.fonts.ready');
          const geometry = await evaluate(`(() => { const container = document.querySelector('.${route}-container'); const card = document.querySelector('.${route}-card'); const c = getComputedStyle(card); const rect = card.getBoundingClientRect(); const dropzone = document.querySelector('.upload-dropzone'); return {containerPadding:getComputedStyle(container).padding, cardPadding:c.padding, contentWidth:rect.width-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight)-parseFloat(c.borderLeftWidth)-parseFloat(c.borderRightWidth), dropzonePadding:dropzone && getComputedStyle(dropzone).padding}; })()`);
          report.measurements.push({ area: route, theme, width, ...geometry });
          await check(`${route} polish: layout at ${width}px in ${theme}`, async () => {
            assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
            if (verify('spacing')) {
              assert.equal(geometry.cardPadding, width < 640 ? '24px' : '44px');
              assert.equal(geometry.containerPadding, width < 640 ? '32px 16px' : '48px 24px');
              if (route === 'upload') assert.equal(geometry.dropzonePadding, width < 640 ? '32px 16px' : '48px 32px');
            }
          });
          if (capture && theme === 'dark' && [375, 1440].includes(width)) await screenshot(`${route}-${theme}-${width}-${stage}`);
        }
        await navigate('');
        await evaluate('document.fonts.ready');
        const header = await evaluate("(() => { const brand=document.querySelector('.brand-logo').getBoundingClientRect(); const actions=document.querySelector('.nav-right-actions').getBoundingClientRect(); const pill=document.querySelector('.nav-glass-pill').getBoundingClientRect(); return {brandRight:brand.right, actionsLeft:actions.left, actionsRight:actions.right, pillRight:pill.right, viewport:document.documentElement.clientWidth, buttons:Array.from(document.querySelectorAll('.nav-right-actions button')).map(b=>({label:b.getAttribute('aria-label'),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))}; })()");
        report.measurements.push({ area: 'navbar', theme, width, ...header });
        if (verify('navbar')) await check(`Navbar polish: controls fit at ${width}px in ${theme}`, async () => {
          assert.ok(header.brandRight <= header.actionsLeft && header.actionsRight <= header.pillRight, JSON.stringify(header));
          if (width === 375) assert.ok(header.buttons.every(b => b.width >= 40 && b.height >= 40), JSON.stringify(header));
          if (width >= 414 && width <= 1023) assert.ok(header.buttons.every(b => b.width >= 44 && b.height >= 44), JSON.stringify(header));
        });
        if (capture && theme === 'dark' && [375, 1440].includes(width)) await screenshot(`navbar-${theme}-${width}-${stage}`);
        await evaluate("document.querySelector('.cmd-trigger-btn').click()");
        await wait("document.querySelector('.cmd-palette__input') === document.activeElement");
        const focus = await evaluate("(() => { const input=document.querySelector('.cmd-palette__input'); const c=getComputedStyle(input); return {shadow:c.boxShadow,outline:c.outline,borderBottom:c.borderBottomColor,overflow:getComputedStyle(document.querySelector('.cmd-palette-panel')).overflow}; })()");
        report.measurements.push({ area: 'command-focus', theme, width, ...focus });
        await check(`Command polish: focus and keyboard at ${width}px in ${theme}`, async () => {
          if (verify('focus')) assert.ok(focus.shadow.includes('inset') && focus.shadow !== 'none', JSON.stringify(focus));
          await key('ArrowDown');
          await wait("document.querySelectorAll('[role=option]')[1]?.getAttribute('aria-selected') === 'true'");
          assert.ok(await evaluate("document.activeElement === document.querySelector('.cmd-palette__input') && Boolean(document.getElementById(document.activeElement.getAttribute('aria-activedescendant')))"));
        });
        if (capture && [375, 1440].includes(width) && (theme === 'dark' || width === 375)) await screenshot(`command-focus-${theme}-${width}-${stage}`);
        await key('Escape');
        await wait("!document.querySelector('.cmd-palette-panel')");
        await navigate('gpa');
        await evaluate("document.querySelector('[aria-label=\"Course sessional marks to grade estimator\"] input[type=checkbox]').click()");
        await wait("document.querySelector('[aria-label=\"Lab assignment obtained marks\"]')");
        const labels = await evaluate("(() => { const panel=document.querySelector('[aria-label=\"Course sessional marks to grade estimator\"]'); return Array.from(panel.querySelectorAll('label')).filter(l => !l.querySelector('input')).map(l=>({label:l.textContent.trim(),for:l.htmlFor,control:l.control?.getAttribute('aria-label') || null})); })()");
        const sessionalSnapshot = "(() => { const panel=document.querySelector('[aria-label=\"Course sessional marks to grade estimator\"]'); return {result:panel.querySelector('.grade-workspace__count').textContent.trim(),values:Array.from(panel.querySelectorAll('input')).map(i=>({name:i.getAttribute('aria-label'),value:i.type === 'checkbox' ? i.checked : i.value}))}; })()";
        const sessional = await evaluate(sessionalSnapshot);
        report.measurements.push({ area: 'gpa-labels', theme, width, labels, sessional });
        await check(`GPA polish: labels and existing fields at ${width}px in ${theme}`, async () => {
          assert.equal(labels.length, 7);
          assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
          if (verify('labels')) {
            assert.ok(labels.every(l => l.for && l.control), JSON.stringify(labels));
            assert.ok(await evaluate("(() => { const ids=Array.from(document.querySelectorAll('[id]')).map(e=>e.id); return new Set(ids).size === ids.length; })()"));
            for (const label of labels) {
              const point = await evaluate(`(() => { const l=Array.from(document.querySelectorAll('label')).find(l=>l.textContent.trim() === ${JSON.stringify(label.label)}); l.scrollIntoView({block:'center',behavior:'instant'}); const r=l.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
              await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
              await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
              await wait(`document.activeElement.id === ${JSON.stringify(label.for)}`);
            }
            assert.equal(sessional.result, '80.33% → Grade A- (3.66)');
            assert.deepEqual(await evaluate(sessionalSnapshot), sessional);
          }
        });
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
        await evaluate("document.activeElement.blur(); document.querySelector('[aria-label=\"Course sessional marks to grade estimator\"]').scrollIntoView({block:'start',behavior:'instant'})");
        await evaluate('document.fonts.ready');
        if (capture && theme === 'dark' && [375, 1440].includes(width)) await screenshot(`gpa-labels-${theme}-${width}-${stage}`);
      }
    }
    for (const width of [320, 374, 390, 399, 400, 413, 540, 640, 641, 1023]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await navigate('');
      await evaluate('document.fonts.ready');
      const header = await evaluate("(() => { const b=document.querySelector('.brand-logo').getBoundingClientRect(); const a=document.querySelector('.nav-right-actions').getBoundingClientRect(); const p=document.querySelector('.nav-glass-pill').getBoundingClientRect(); return {brandRight:b.right,actionsLeft:a.left,actionsRight:a.right,pillRight:p.right,buttonWidths:Array.from(document.querySelectorAll('.nav-right-actions button')).map(b=>b.getBoundingClientRect().width)}; })()");
      report.measurements.push({area:'navbar-edge',width,...header});
      if (verify('navbar') && width >= 375) await check(`Navbar polish: breakpoint fit at ${width}px`, async () => {
        assert.ok(header.brandRight <= header.actionsLeft && header.actionsRight <= header.pillRight, JSON.stringify(header));
      });
    }
  }
  if (scenarios) {
    report.stage = stage;
    report.target = 'critical-scenarios';
    report.measurements = [];
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try {
        localStorage.setItem('pph_analytics_consent', 'declined');
        localStorage.setItem('pph_dark', 'false');
        sessionStorage.setItem('pph_install_dismissed', 'true');
        sessionStorage.setItem('pph_aiQuizParams', JSON.stringify({ topic: 'Data Structures', subjectCode: 'CSC211', difficulty: 'Medium', numQuestions: 5, questionType: 'mcq' }));
      } catch {}`
    });
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 1000, deviceScaleFactor: 1, mobile: false });
    await check('Timed quiz remains visible while reviewing long content', async () => {
      await navigate('quiz');
      await wait("!document.querySelector('main [aria-busy=true]') && document.querySelector('.quiz-subject-card')");
      await evaluate("document.querySelector('.quiz-subject-card').click()");
      await wait("document.querySelector('[aria-label=\"Select quiz mode\"]')");
      await evaluate("document.querySelector('[aria-label=\"Select quiz mode\"] button:last-child').click()");
      await wait("document.querySelector('[aria-label=\"Select quiz mode\"] button:last-child').getAttribute('aria-pressed') === 'true'");
      await evaluate("document.querySelector('.quiz-generate-btn').click()");
      await wait("document.querySelector('[role=timer]') && !document.querySelector('main [aria-busy=true]')");
      const beforeScroll = await evaluate("(() => { const timer=document.querySelector('[role=timer]').getBoundingClientRect(); const header=document.querySelector('.quiz-header').getBoundingClientRect(); return {timer:{top:timer.top,bottom:timer.bottom,width:timer.width},header:{top:header.top,bottom:header.bottom},time:document.querySelector('[role=timer]').textContent.trim()}; })()");
      await evaluate("(() => { const card=document.querySelector('.quiz-card'); card.style.minHeight='1600px'; const top=card.getBoundingClientRect().top+scrollY; window.scrollTo({top:top+900,behavior:'instant'}); })()");
      const afterScroll = await evaluate("(() => { const timer=document.querySelector('[role=timer]').getBoundingClientRect(); return {timer:{top:timer.top,bottom:timer.bottom,width:timer.width},visible:timer.bottom > 0 && timer.top < innerHeight,time:document.querySelector('[role=timer]').textContent.trim()}; })()");
      report.measurements.push({ area: 'timed-quiz', beforeScroll, afterScroll });
      assert.equal(afterScroll.visible, true);
      assert.ok(Math.abs(beforeScroll.timer.width - afterScroll.timer.width) < 0.5);
      await screenshot(`quiz-timed-scrolled-${stage}-360`);
    });
    await check('Curated-bank fallback is identified', async () => {
      await navigate('take-ai-quiz');
      await wait("!document.querySelector('main [aria-busy=true]')");
      const fallback = await evaluate("(() => ({badge:document.querySelector('.ai-quiz-topic-badge')?.textContent.trim(),hasExplanatoryNotice:Boolean(document.querySelector('[data-curated-bank-notice]'))}))()");
      report.measurements.push({ area: 'curated-bank-fallback', ...fallback });
      await screenshot(`curated-bank-${stage}-360`);
    });
    await check('GPA course table remains usable with many courses', async () => {
      await navigate('gpa');
      for (let index = 0; index < 7; index += 1) {
        await evaluate("document.querySelector('.grade-workspace__add').click()");
      }
      const layout = await evaluate("(() => { const rows=Array.from(document.querySelectorAll('.grade-workspace__course')); const panel=document.querySelector('.grade-workspace__panel').getBoundingClientRect(); return {rows:rows.length,documentScrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,panel:{left:panel.left,right:panel.right},inputModes:Array.from(document.querySelectorAll('.grade-workspace__course input[type=number]')).map(input=>input.inputMode)}; })()");
      report.measurements.push({ area: 'gpa-many-courses', ...layout });
      await screenshot(`gpa-many-courses-${stage}-360`);
    });
    await check('Long display math scrolls inside its container', async () => {
      await navigate('paper-view');
      await evaluate("(async () => { const {default:React} = await import('/node_modules/.vite/deps/react.js'); const {default:ReactDOM} = await import('/node_modules/.vite/deps/react-dom_client.js'); const {default:MathText} = await import('/src/components/MathText/MathText.jsx'); const host=document.createElement('div'); host.id='ui-audit-math'; host.style.padding='16px'; document.querySelector('main').prepend(host); window.__auditMathRoot=ReactDOM.createRoot(host); window.__auditMathRoot.render(React.createElement(MathText,{text:'$$\\\\sum_{i=1}^{n} \\\\frac{x_i^2 + 2x_i y_i + y_i^2}{\\\\sqrt{a_i^2+b_i^2}} = \\\\prod_{k=1}^{m} \\\\left(1+\\\\frac{r_k}{1+r_k^2}\\\\right) + \\\\int_{0}^{\\\\infty} e^{-x^2} \\\\cos(2\\\\pi x) \\\\, dx$$'})); })()");
      await wait("document.querySelector('#ui-audit-math .math-display-container')");
      const math = await evaluate("(() => { const element=document.querySelector('#ui-audit-math .math-display-container'); const style=getComputedStyle(element); return {clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,overflowX:style.overflowX,documentScrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth}; })()");
      report.measurements.push({ area: 'long-latex', ...math });
      await screenshot(`long-latex-${stage}-360`);
    });
  }
  if (routeSweep) {
    report.stage = stage;
    report.target = 'all-routes';
    report.measurements = [];
    const routes = [
      '', 'about', 'subjects', 'subject-papers', 'paper-view', 'quiz',
      'ai-quiz-generator', 'take-ai-quiz', 'study-hub', 'dashboard',
      'account', 'upload', 'faq', 'auth', 'terms', 'privacy', 'disclaimer',
      'admin-generate', 'admin-paste', 'gpa', 'missing-page'
    ];
    const widths = [360, 390, 768, 1280, 1440];
    const settlingRoutes = new Set(['subjects', 'subject-papers', 'quiz', 'take-ai-quiz']);
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try {
        localStorage.setItem('pph_analytics_consent', 'declined');
        sessionStorage.setItem('pph_install_dismissed', 'true');
        sessionStorage.setItem('pph_selectedSubject', JSON.stringify({ name: 'Data Structures & Algorithms', code: 'CSC211', department: 'Computer Science' }));
        sessionStorage.setItem('pph_selectedPaper', JSON.stringify({ id: 'ui-audit-paper', title: 'Data Structures Midterm 2025', subjectName: 'Data Structures & Algorithms', subjectCode: 'CSC211', department: 'Computer Science', term: 'Midterm', semester: 'Fall', year: 2025, totalMarks: 30, isSample: true }));
        sessionStorage.setItem('pph_aiQuizParams', JSON.stringify({ topic: 'Data Structures', subjectCode: 'CSC211', difficulty: 'Medium', numQuestions: 5, questionType: 'mcq' }));
      } catch {}`
    });
    for (const theme of ['light', 'dark']) {
      await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
      await navigate('');
      const dark = theme === 'dark';
      if (await evaluate("document.documentElement.classList.contains('dark')") !== dark) {
        await evaluate(`document.querySelector('[aria-label="Switch to ${dark ? 'dark' : 'light'} mode"]').click()`);
        await wait(`document.documentElement.classList.contains('dark') === ${dark}`);
      }
      for (const width of widths) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
        for (const route of routes) {
          await check(`${route || 'home'} baseline: ${theme} at ${width}px`, async () => {
            await navigate(route);
            if (settlingRoutes.has(route)) {
              await wait("!document.querySelector('main [aria-busy=true]')");
            }
            await evaluate('document.fonts.ready');
            const geometry = await evaluate(`(() => {
              const viewportWidth = document.documentElement.clientWidth;
              const main = document.querySelector('main');
              const visible = element => {
                const style = getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
              };
              const describe = element => {
                const classes = Array.from(element.classList).slice(0, 2).join('.');
                return element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') + (classes ? '.' + classes : '');
              };
              const controls = Array.from(document.querySelectorAll('header button, header a[href], main button, main a[href], main input, main select, main textarea, main summary, main [role=button], main [role=radio], main [role=tab]'))
                .filter(element => !element.disabled && visible(element))
                .map(element => {
                  const rect = element.getBoundingClientRect();
                  return { element: describe(element), label: element.getAttribute('aria-label') || element.textContent.trim().replace(/\\s+/g, ' ').slice(0, 70), width: Math.round(rect.width * 10) / 10, height: Math.round(rect.height * 10) / 10, inlineLink: element.tagName === 'A' && Boolean(element.closest('p')) };
                });
              const undersized = controls.filter(control => !control.inlineLink && (control.width < 44 || control.height < 44));
              const overflowing = Array.from(main.querySelectorAll('*'))
                .filter(element => visible(element) && !element.closest('[aria-hidden=true]'))
                .map(element => ({ element, rect: element.getBoundingClientRect() }))
                .filter(({ rect }) => rect.left < -1 || rect.right > viewportWidth + 1)
                .slice(0, 20)
                .map(({ element, rect }) => ({ element: describe(element), left: Math.round(rect.left), right: Math.round(rect.right) }));
              const clipped = Array.from(main.querySelectorAll('*'))
                .filter(element => visible(element) && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1)
                .filter(element => !['auto', 'scroll'].includes(getComputedStyle(element).overflowX))
                .slice(0, 20)
                .map(element => ({ element: describe(element), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, overflowX: getComputedStyle(element).overflowX }));
              return {
                viewportWidth,
                documentScrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
                heading: main.querySelector('h1, h2')?.textContent.trim().replace(/\\s+/g, ' ').slice(0, 120) || null,
                controls: controls.length,
                undersized,
                overflowing,
                clipped
              };
            })()`);
            report.measurements.push({ route: route || 'home', theme, width, ...geometry });
            if ([360, 1440].includes(width)) {
              await screenshot(`${route || 'home'}-${theme}-${width}-${stage}`);
            }
          });
        }
      }
    }
  }
  await evaluate("document.fonts.load('700 16px \"Space Grotesk\"')");
  report.fontStatus = await evaluate("({inter:document.fonts.check('16px Inter'),display:document.fonts.check('700 16px \"Space Grotesk\"'),icons:document.fonts.check('20px \"Material Symbols Outlined\"')})");
  report.completed = true;
  console.log(JSON.stringify({ checks: report.checks.length, failures: report.checks.filter(c => !c.passed), screenshots: report.screenshots.length, exceptions: report.exceptions, consoleErrors: report.consoleErrors, blockedRequests: report.blockedRequests.length, fontStatus: report.fontStatus }, null, 2));
  if (report.checks.some(c => !c.passed) || report.exceptions.length) process.exitCode = 1;
} catch (error) {
  report.blocker = error.message;
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ id: 999999, method: 'Browser.close' }));
    socket.close();
  } else if (browser.exitCode === null) browser.kill();
}
