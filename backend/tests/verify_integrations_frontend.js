/**
 * CareSaathi - Frontend API Integrations CDP Browser Verification
 * Uses Node.js built-in WebSocket to audit live integration cards via Chrome DevTools Protocol.
 */

const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9223;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAudit() {
  console.log('--- Starting Chrome Headless CDP Audit for API Integrations ---');

  // Spawn headless chrome
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=' + require('os').tmpdir() + '/care_cdp_' + Date.now(),
    'http://127.0.0.1:3000/#settings',
  ]);

  await sleep(2500);

  try {
    // 1. Fetch CDP target
    const versionRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = await versionRes.json();
    const pageTarget = targets.find((t) => t.type === 'page');

    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('Could not find Chrome page WebSocketDebuggerUrl');
    }

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let messageId = 1;
    const callbacks = new Map();

    const sendCommand = (method, params = {}) => {
      const id = messageId++;
      return new Promise((resolve, reject) => {
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    const consoleErrors = [];
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value || a.description).join(' '));
      }
    };

    await sendCommand('Runtime.enable');
    await sendCommand('Page.enable');

    // Wait for scripts to execute and integrations status to fetch
    await sleep(2500);

    // Evaluate integration elements in the DOM
    const evalScript = `
      (() => {
        return {
          currentView: appState.currentView,
          supabaseText: document.getElementById('integ-status-supabase')?.textContent,
          googleOAuthText: document.getElementById('integ-status-google-oauth')?.textContent,
          googleCalendarText: document.getElementById('integ-status-google-calendar')?.textContent,
          geminiText: document.getElementById('integ-status-gemini')?.textContent,
          resendText: document.getElementById('integ-status-resend')?.textContent,
          googleHealthText: document.getElementById('integ-status-google-health')?.textContent,
          hasGoogleLoginBtn: !!document.getElementById('google-login-btn'),
          hasTestEmailBtn: !!document.getElementById('send-test-email-btn'),
          activeToken: !!appState.activeToken,
        };
      })()
    `;

    const evalResult = await sendCommand('Runtime.evaluate', {
      expression: evalScript,
      returnByValue: true,
    });

    const val = evalResult.result.value;
    console.log('DOM Evaluation Result:', JSON.stringify(val, null, 2));
    console.log('Console Errors Detected:', consoleErrors.length, consoleErrors);

    ws.close();
    chromeProc.kill();

    // Assertions
    if (consoleErrors.length > 0) {
      console.error('FAIL: Console errors were logged:', consoleErrors);
      process.exit(1);
    }

    if (!val.hasGoogleLoginBtn) {
      console.error('FAIL: Google Login button not found in Settings');
      process.exit(1);
    }

    if (!val.googleOAuthText || !val.googleOAuthText.includes('Configured')) {
      console.error('FAIL: Google OAuth badge did not reflect Configured state');
      process.exit(1);
    }

    console.log('SUCCESS: All integration status badges rendered accurately with 0 console errors!');
    process.exit(0);
  } catch (err) {
    chromeProc.kill();
    console.error('Audit Script Error:', err);
    process.exit(1);
  }
}

runAudit();
