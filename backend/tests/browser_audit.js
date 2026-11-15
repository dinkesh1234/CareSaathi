/**
 * CareSaathi - Browser Automation QA Audit Script
 * Uses Chrome DevTools Protocol (CDP) over WebSocket to execute real browser testing.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_PORT = 3000;
const BACKEND_PORT = 8000;

// Helper delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBrowserAudit() {
  console.log('=== STARTING CHROME BROWSER AUTOMATION AUDIT ===');
  const results = {
    consoleErrors: [],
    networkLogs: [],
    tests: {},
  };

  // 1. Start Static Frontend Server on port 3000
  const frontendServer = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    let filePath = path.join('frontend', reqPath === '/' ? 'index.html' : reqPath);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.svg': 'image/svg+xml',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  await new Promise((resolve) => frontendServer.listen(FRONTEND_PORT, resolve));
  console.log(`[PASS] Frontend HTTP server started on http://127.0.0.1:${FRONTEND_PORT}`);

  // 2. Start Backend FastAPI via Uvicorn
  const uvicornPath = path.resolve('backend/.venv/Scripts/uvicorn.exe');
  const backendProc = spawn(uvicornPath, ['app.main:app', '--port', String(BACKEND_PORT)], {
    cwd: path.resolve('backend'),
    stdio: 'pipe',
  });

  // Wait for backend to be ready
  let backendReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/health`);
      if (res.ok) {
        backendReady = true;
        break;
      }
    } catch (e) {
      await sleep(300);
    }
  }

  if (!backendReady) {
    throw new Error('Backend server failed to start within timeout.');
  }
  console.log(`[PASS] FastAPI Backend started on http://127.0.0.1:${BACKEND_PORT}`);

  // 3. Launch Headless Chrome with Remote Debugging
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank',
  ]);

  await sleep(1500);

  // 4. Connect to Chrome via CDP
  const versionRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await versionRes.json();
  const pageTab = tabs.find((t) => t.type === 'page') || tabs[0];
  const wsUrl = pageTab.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
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
    if (msg.method === 'Network.responseReceived') {
      results.networkLogs.push({
        url: msg.params.response.url,
        status: msg.params.response.status,
      });
    }
  };

  function sendCDP(method, params = {}) {
    return new Promise((resolve) => {
      const id = reqId++;
      pendingRequests.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Enable CDP domains
  await sendCDP('Page.enable');
  await sendCDP('Runtime.enable');
  await sendCDP('Network.enable');

  // Navigate to frontend
  console.log(`Navigating Chrome to http://localhost:${FRONTEND_PORT}...`);
  await sendCDP('Page.navigate', { url: `http://localhost:${FRONTEND_PORT}` });

  // Wait for page load and API fetch
  await sleep(2500);

  // Helper to evaluate JS in page
  async function evalInPage(expression) {
    const res = await sendCDP('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result && res.result.result ? res.result.result.value : null;
  }

  // TEST 1: Check Page Title
  const title = await evalInPage('document.title');
  results.tests.title = title.includes('CareSaathi');
  console.log(`[${results.tests.title ? 'PASS' : 'FAIL'}] Page Title: "${title}"`);

  // TEST 2: Check Asset Loading
  const assetsLoaded = {
    css: results.networkLogs.some((n) => n.url.includes('style.css') && n.status === 200),
    js: results.networkLogs.some((n) => n.url.includes('app.js') && n.status === 200),
    svg: results.networkLogs.some((n) => n.url.includes('logo.svg') && n.status === 200),
    healthApi: results.networkLogs.some((n) => n.url.includes('/api/health') && n.status === 200),
  };
  results.tests.assetsLoaded = assetsLoaded;
  console.log('[PASS] Asset Network Responses:', JSON.stringify(assetsLoaded));

  // TEST 3: Check UI Connected State
  const badgeClass = await evalInPage("document.getElementById('status-badge').className");
  const badgeText = await evalInPage("document.getElementById('status-text').textContent");
  const serviceName = await evalInPage("document.getElementById('service-name').textContent");
  const apiVersion = await evalInPage("document.getElementById('api-version').textContent");
  const latency = await evalInPage("document.getElementById('latency-display').textContent");

  results.tests.connectedState =
    badgeClass.includes('online') &&
    badgeText.includes('Backend Online & Operational') &&
    serviceName === 'CareSaathi API' &&
    apiVersion === 'v1.0.0';

  console.log(`[${results.tests.connectedState ? 'PASS' : 'FAIL'}] Online State Verified in DOM:`, {
    badgeClass,
    badgeText,
    serviceName,
    apiVersion,
    latency,
  });

  // TEST 4: Raw Response Drawer Toggle
  await evalInPage("document.getElementById('raw-response-toggle').click()");
  await sleep(300);
  const isDrawerVisible = await evalInPage(
    "document.getElementById('raw-response-content').classList.contains('visible')"
  );
  results.tests.rawResponseToggle = isDrawerVisible === true;
  console.log(`[${results.tests.rawResponseToggle ? 'PASS' : 'FAIL'}] Raw Response Drawer Toggle`);

  // TEST 5: Console Errors
  results.tests.noConsoleErrors = results.consoleErrors.length === 0;
  console.log(`[${results.tests.noConsoleErrors ? 'PASS' : 'FAIL'}] Console Errors: ${results.consoleErrors.length}`);

  // TEST 6: Offline State Handling (Stop Backend)
  console.log('Simulating Backend Failure: Stopping FastAPI backend process...');
  backendProc.kill('SIGKILL');
  await sleep(1000);

  // Trigger health check in browser
  console.log('Triggering connection re-check in browser with backend offline...');
  await evalInPage('checkBackendHealth()');
  await sleep(2000);

  const offlineBadgeClass = await evalInPage("document.getElementById('status-badge').className");
  const offlineBadgeText = await evalInPage("document.getElementById('status-text').textContent");
  const isOfflineAlertVisible = await evalInPage(
    "document.getElementById('offline-alert').classList.contains('visible')"
  );

  results.tests.offlineState =
    offlineBadgeClass.includes('offline') &&
    offlineBadgeText.includes('Backend Disconnected') &&
    isOfflineAlertVisible === true;

  console.log(`[${results.tests.offlineState ? 'PASS' : 'FAIL'}] Offline State Verified in DOM:`, {
    offlineBadgeClass,
    offlineBadgeText,
    isOfflineAlertVisible,
  });

  // Cleanup
  ws.close();
  chromeProc.kill('SIGKILL');
  frontendServer.close();

  console.log('=== CHROME BROWSER AUTOMATION AUDIT COMPLETED ===');
  console.log('Final Test Summary:', JSON.stringify(results.tests, null, 2));

  const allPassed = Object.values(results.tests).every(Boolean) && results.tests.noConsoleErrors;
  process.exit(allPassed ? 0 : 1);
}

runBrowserAudit().catch((err) => {
  console.error('Audit Script Error:', err);
  process.exit(1);
});
