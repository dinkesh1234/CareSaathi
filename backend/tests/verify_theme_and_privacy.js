/**
 * CareSaathi - Theme & Privacy Automated QA Test Script
 * Tests Light/Dark mode, localStorage persistence, Show/Hide controls, and all 12 sections.
 */

const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runThemeAndPrivacyQA() {
  console.log('=== STARTING THEME & PRIVACY AUTOMATION QA ===');
  const results = {
    consoleErrors: [],
    themeTests: {},
    privacyTests: {},
  };

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank',
  ]);

  await sleep(1500);

  const versionRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await versionRes.json();
  const pageTab = tabs.find((t) => t.type === 'page') || tabs[0];
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let reqId = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      pendingRequests.get(msg.id)(msg);
      pendingRequests.delete(msg.id);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      const text = msg.params.args.map((a) => a.value || a.description).join(' ');
      if (type === 'error') {
        results.consoleErrors.push(text);
      }
    }
  };

  function sendCDP(method, params = {}) {
    return new Promise((resolve) => {
      const id = reqId++;
      pendingRequests.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCDP('Page.enable');
  await sendCDP('Runtime.enable');

  console.log('Navigating Chrome to http://127.0.0.1:3000/ ...');
  await sendCDP('Page.navigate', { url: 'http://127.0.0.1:3000/' });
  await sleep(2000);

  async function evalInPage(expression) {
    const res = await sendCDP('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result && res.result.result ? res.result.result.value : null;
  }

  // --- TEST 1: Default Light Theme ---
  const initialTheme = await evalInPage("document.documentElement.getAttribute('data-theme')");
  results.themeTests.defaultLight = initialTheme === 'light';
  console.log(`[${results.themeTests.defaultLight ? 'PASS' : 'FAIL'}] Default Theme is Light: "${initialTheme}"`);

  // --- TEST 2: Switch Light to Dark ---
  await evalInPage("document.getElementById('theme-toggle-btn').click()");
  await sleep(300);
  const darkThemeAttr = await evalInPage("document.documentElement.getAttribute('data-theme')");
  const darkStorage = await evalInPage("localStorage.getItem('careSaathi_theme')");
  const darkIcon = await evalInPage("document.getElementById('theme-toggle-icon').textContent");
  results.themeTests.switchToDark = darkThemeAttr === 'dark' && darkStorage === 'dark' && darkIcon === '☀️';
  console.log(`[${results.themeTests.switchToDark ? 'PASS' : 'FAIL'}] Switch to Dark Theme (attr=${darkThemeAttr}, storage=${darkStorage}, icon=${darkIcon})`);

  // --- TEST 3: Browser Refresh & Persistence Verification ---
  console.log('Reloading page to test persistence of Dark mode...');
  await sendCDP('Page.reload');
  await sleep(2000);
  const reloadedTheme = await evalInPage("document.documentElement.getAttribute('data-theme')");
  results.themeTests.persistenceDark = reloadedTheme === 'dark';
  console.log(`[${results.themeTests.persistenceDark ? 'PASS' : 'FAIL'}] Preference Persistence after Reload: "${reloadedTheme}"`);

  // --- TEST 4: Switch Dark back to Light ---
  await evalInPage("document.getElementById('theme-toggle-btn').click()");
  await sleep(300);
  const lightThemeAttr = await evalInPage("document.documentElement.getAttribute('data-theme')");
  const lightStorage = await evalInPage("localStorage.getItem('careSaathi_theme')");
  const lightIcon = await evalInPage("document.getElementById('theme-toggle-icon').textContent");
  results.themeTests.switchBackToLight = lightThemeAttr === 'light' && lightStorage === 'light' && lightIcon === '🌙';
  console.log(`[${results.themeTests.switchBackToLight ? 'PASS' : 'FAIL'}] Switch back to Light Theme (attr=${lightThemeAttr}, storage=${lightStorage}, icon=${lightIcon})`);

  // --- TEST 5: Privacy Mode Default Enabled ---
  const isPrivacyDefaultActive = await evalInPage("document.getElementById('privacy-toggle-btn').classList.contains('active')");
  const firstMaskedEl = await evalInPage("document.querySelector('.sensitive-data').classList.contains('masked')");
  results.privacyTests.defaultEnabled = isPrivacyDefaultActive && firstMaskedEl;
  console.log(`[${results.privacyTests.defaultEnabled ? 'PASS' : 'FAIL'}] Privacy Mode Default Enabled: (btnActive=${isPrivacyDefaultActive}, masked=${firstMaskedEl})`);

  // --- TEST 6: Individual Show/Hide Control ---
  const valBefore = await evalInPage("document.querySelector('.sensitive-data .val-display').textContent");
  await evalInPage("document.querySelector('.sensitive-data .privacy-mask-btn').click()");
  await sleep(200);
  const valRevealed = await evalInPage("document.querySelector('.sensitive-data .val-display').textContent");
  await evalInPage("document.querySelector('.sensitive-data .privacy-mask-btn').click()");
  await sleep(200);
  const valReMasked = await evalInPage("document.querySelector('.sensitive-data .val-display').textContent");
  results.privacyTests.individualToggle = valBefore !== valRevealed && valBefore === valReMasked;
  console.log(`[${results.privacyTests.individualToggle ? 'PASS' : 'FAIL'}] Individual Show/Hide ('${valBefore}' -> '${valRevealed}' -> '${valReMasked}')`);

  // --- TEST 7: Global Master Privacy Toggle ---
  await evalInPage("document.getElementById('privacy-toggle-btn').click()");
  await sleep(300);
  const allMaskedAfterToggle = await evalInPage("document.querySelectorAll('.sensitive-data.masked').length");
  await evalInPage("document.getElementById('privacy-toggle-btn').click()");
  await sleep(300);
  const allMaskedAfterReenable = await evalInPage("document.querySelectorAll('.sensitive-data.masked').length");
  results.privacyTests.globalToggle = allMaskedAfterToggle === 0 && allMaskedAfterReenable > 0;
  console.log(`[${results.privacyTests.globalToggle ? 'PASS' : 'FAIL'}] Global Privacy Toggle (unmaskedAll=${allMaskedAfterToggle === 0}, reMasked=${allMaskedAfterReenable})`);

  // --- TEST 8: Check All 12 Views in Dark Theme ---
  await evalInPage("setTheme('dark', false)");
  await sleep(300);
  const views = [
    'dashboard', 'family-members', 'health-profiles', 'medication-center',
    'appointments', 'health-connect', 'safety-network', 'care-continuity',
    'family-hub', 'notifications', 'activity-timeline', 'settings'
  ];
  let allViewsRenderedInDark = true;
  for (const v of views) {
    await evalInPage(`switchView('${v}')`);
    await sleep(150);
    const active = await evalInPage(`document.getElementById('view-${v}').classList.contains('active')`);
    if (!active) allViewsRenderedInDark = false;
  }
  results.themeTests.all12ViewsInDark = allViewsRenderedInDark;
  console.log(`[${results.themeTests.all12ViewsInDark ? 'PASS' : 'FAIL'}] All 12 Sections Verified in Dark Mode`);

  // Return to light mode
  await evalInPage("setTheme('light', false)");
  await evalInPage("switchView('dashboard')");

  // --- TEST 9: Console Errors Check ---
  results.noConsoleErrors = results.consoleErrors.length === 0;
  console.log(`[${results.noConsoleErrors ? 'PASS' : 'FAIL'}] Console Errors: ${results.consoleErrors.length}`);
  if (results.consoleErrors.length > 0) {
    console.error('Errors:', results.consoleErrors);
  }

  // Cleanup
  ws.close();
  chromeProc.kill('SIGKILL');

  console.log('=== THEME & PRIVACY AUTOMATION QA FINISHED ===');
  const allPassed =
    Object.values(results.themeTests).every(Boolean) &&
    Object.values(results.privacyTests).every(Boolean) &&
    results.noConsoleErrors;
  process.exit(allPassed ? 0 : 1);
}

runThemeAndPrivacyQA().catch((err) => {
  console.error('QA Automation Script Error:', err);
  process.exit(1);
});
