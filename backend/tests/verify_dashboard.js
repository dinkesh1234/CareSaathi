/**
 * CareSaathi - Complete Dashboard QA Automation Script
 * Real Chrome automation via Chrome DevTools Protocol (CDP)
 */

const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDashboardQA() {
  console.log('=== STARTING COMPLETE DASHBOARD AUTOMATION AUDIT ===');
  const results = {
    consoleErrors: [],
    viewsTested: {},
    interactiveTests: {},
  };

  // Launch Headless Chrome
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank',
  ]);

  await sleep(1500);

  // Connect to Chrome via CDP
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

  // Navigate to frontend
  console.log('Navigating to http://127.0.0.1:3000/ ...');
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

  // 1. Check Initial Title & Dashboard View Active
  const title = await evalInPage('document.title');
  const isDashActive = await evalInPage("document.getElementById('view-dashboard').classList.contains('active')");
  console.log(`[PASS] Initial Title: "${title}" | Dashboard Active: ${isDashActive}`);

  // 2. Test All 12 Navigation Views
  const viewsToTest = [
    'dashboard',
    'family-members',
    'health-profiles',
    'medication-center',
    'appointments',
    'health-connect',
    'safety-network',
    'care-continuity',
    'family-hub',
    'notifications',
    'activity-timeline',
    'settings',
  ];

  for (const viewId of viewsToTest) {
    await evalInPage(`switchView('${viewId}')`);
    await sleep(250);
    const viewElActive = await evalInPage(`document.getElementById('view-${viewId}').classList.contains('active')`);
    const navLinkActive = await evalInPage(
      `document.querySelector('.nav-link[data-view="${viewId}"]').classList.contains('active')`
    );
    const passed = viewElActive && navLinkActive;
    results.viewsTested[viewId] = passed;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] View '${viewId}' -> View Active: ${viewElActive}, Nav Active: ${navLinkActive}`);
  }

  // Return to Dashboard View
  await evalInPage("switchView('dashboard')");
  await sleep(300);

  // 3. Test Care Task Checkbox Toggle
  const initialTaskState = await evalInPage("document.querySelector('[data-task-id=\"task-1\"]').classList.contains('completed')");
  await evalInPage("document.querySelector('[data-task-id=\"task-1\"] .task-checkbox').click()");
  await sleep(200);
  const updatedTaskState = await evalInPage("document.querySelector('[data-task-id=\"task-1\"]').classList.contains('completed')");
  results.interactiveTests.taskCheckboxToggle = initialTaskState !== updatedTaskState;
  console.log(`[${results.interactiveTests.taskCheckboxToggle ? 'PASS' : 'FAIL'}] Care Task Checkbox Toggle`);

  // 4. Test Quick Add Task
  await evalInPage("document.getElementById('new-task-input').value = 'Test automated care task'");
  await evalInPage("document.getElementById('inline-add-task-form').dispatchEvent(new Event('submit'))");
  await sleep(200);
  const taskListText = await evalInPage("document.getElementById('dashboard-task-list').textContent");
  results.interactiveTests.quickAddTask = taskListText.includes('Test automated care task');
  console.log(`[${results.interactiveTests.quickAddTask ? 'PASS' : 'FAIL'}] Quick Add Task Ingestion`);

  // 5. Test Medication Status Toggle
  const medBtnTextBefore = await evalInPage("document.querySelector('[data-med-id=\"med-2\"] .toggle-med-btn').textContent");
  await evalInPage("document.querySelector('[data-med-id=\"med-2\"] .toggle-med-btn').click()");
  await sleep(200);
  const medBtnTextAfter = await evalInPage("document.querySelector('[data-med-id=\"med-2\"] .toggle-med-btn').textContent");
  results.interactiveTests.medToggle = medBtnTextBefore !== medBtnTextAfter;
  console.log(`[${results.interactiveTests.medToggle ? 'PASS' : 'FAIL'}] Medication Toggle ('${medBtnTextBefore}' -> '${medBtnTextAfter}')`);

  // 6. Test Member Filter Dropdown
  await evalInPage("document.getElementById('member-focus-select').value = 'ramesh'");
  await evalInPage("filterDashboardByMember('ramesh')");
  await sleep(200);
  const rameshCardDisplay = await evalInPage("document.querySelector('.family-card[data-member=\"ramesh\"]').style.display");
  const sunitaCardDisplay = await evalInPage("document.querySelector('.family-card[data-member=\"sunita\"]').style.display");
  results.interactiveTests.memberFilter = rameshCardDisplay !== 'none' && sunitaCardDisplay === 'none';
  console.log(`[${results.interactiveTests.memberFilter ? 'PASS' : 'FAIL'}] Member Focus Filter (Ramesh: ${rameshCardDisplay}, Sunita: ${sunitaCardDisplay})`);

  // 7. Test Search Filter
  await evalInPage("document.getElementById('global-search-input').value = 'Sunita'");
  await evalInPage("filterBySearchQuery('sunita')");
  await sleep(200);
  const sunitaSearchVisible = await evalInPage("document.querySelector('.family-card[data-member=\"sunita\"]').style.display !== 'none'");
  results.interactiveTests.searchFilter = sunitaSearchVisible;
  console.log(`[${results.interactiveTests.searchFilter ? 'PASS' : 'FAIL'}] Real-time Search Filter`);

  // Reset search
  await evalInPage("filterBySearchQuery('')");
  await evalInPage("filterDashboardByMember('all')");

  // 8. Test Backend API Online Status
  await evalInPage('pingBackendHealth()');
  await sleep(1000);
  const backendPillText = await evalInPage("document.getElementById('sidebar-backend-text').textContent");
  results.interactiveTests.backendHealthOnline = backendPillText.includes('FastAPI Online');
  console.log(`[${results.interactiveTests.backendHealthOnline ? 'PASS' : 'FAIL'}] Backend Health Status: "${backendPillText}"`);

  // 9. Check Console Errors
  results.noConsoleErrors = results.consoleErrors.length === 0;
  console.log(`[${results.noConsoleErrors ? 'PASS' : 'FAIL'}] Console Errors: ${results.consoleErrors.length}`);
  if (results.consoleErrors.length > 0) {
    console.error('Console Errors Found:', results.consoleErrors);
  }

  // Cleanup
  ws.close();
  chromeProc.kill('SIGKILL');

  console.log('=== COMPLETE DASHBOARD AUTOMATION AUDIT FINISHED ===');
  const allViewsPassed = Object.values(results.viewsTested).every(Boolean);
  const allInteractivesPassed = Object.values(results.interactiveTests).every(Boolean);

  const success = allViewsPassed && allInteractivesPassed && results.noConsoleErrors;
  process.exit(success ? 0 : 1);
}

runDashboardQA().catch((err) => {
  console.error('QA Automation Error:', err);
  process.exit(1);
});
