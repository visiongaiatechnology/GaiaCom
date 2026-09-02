// STATUS: PLATIN
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(SCRIPT_DIRECTORY, '..');
const OUTPUT_ROOT = resolve(FRONTEND_ROOT, '.hqc-smoke-dist');
const MAX_TEST_DURATION_MS = 120_000;
const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.wasm', 'application/wasm']
]);

function resolveChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter((candidate) => typeof candidate === 'string' && candidate.length > 0);
  const executable = candidates.find(existsSync);
  if (!executable) throw new Error('Chrome executable is unavailable; set CHROME_BIN.');
  return executable;
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitForDevTools(profileDirectory) {
  const activePortFile = join(profileDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const [portLine] = (await readFile(activePortFile, 'utf8')).trim().split(/\r?\n/u);
      const port = Number.parseInt(portLine, 10);
      if (Number.isSafeInteger(port) && port > 0 && port <= 65_535) return port;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    await delay(100);
  }
  throw new Error('Chrome DevTools endpoint did not become ready.');
}

async function findPageTarget(devToolsPort) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const response = await fetch(`http://127.0.0.1:${devToolsPort}/json/list`);
    if (!response.ok) throw new Error('Chrome DevTools target query failed.');
    const targets = await response.json();
    const target = targets.find((candidate) => candidate.type === 'page' && candidate.webSocketDebuggerUrl);
    if (target) return target.webSocketDebuggerUrl;
    await delay(100);
  }
  throw new Error('Chrome page target did not become ready.');
}

function connectDevTools(webSocketUrl) {
  return new Promise((resolveConnection, rejectConnection) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    let sequence = 0;

    socket.addEventListener('error', () => rejectConnection(new Error('Chrome DevTools connection failed.')), { once: true });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!Number.isSafeInteger(message.id)) return;
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error('Chrome DevTools command failed.'));
      else request.resolve(message.result);
    });
    socket.addEventListener('open', () => {
      resolveConnection({
        close: () => socket.close(),
        send(method, params = {}) {
          sequence += 1;
          const id = sequence;
          return new Promise((resolveRequest, rejectRequest) => {
            pending.set(id, { resolve: resolveRequest, reject: rejectRequest });
            socket.send(JSON.stringify({ id, method, params }));
          });
        }
      });
    }, { once: true });
  });
}

async function waitForSmokeResult(client) {
  const deadline = Date.now() + MAX_TEST_DURATION_MS;
  while (Date.now() < deadline) {
    const response = await client.send('Runtime.evaluate', {
      expression: '({ result: document.body?.dataset.result ?? "pending", text: document.body?.textContent ?? "" })',
      returnByValue: true
    });
    const value = response?.result?.value;
    if (value?.result === 'pass' && value.text.includes('HQC_BROWSER_SMOKE_PASS')) return;
    if (value?.result === 'fail') throw new Error(value.text || 'Compiled HQC browser smoke test failed.');
    await delay(200);
  }
  throw new Error('Compiled HQC browser smoke test timed out.');
}

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      const relativePath = requestUrl.pathname === '/' ? '/hqc-smoke.html' : decodeURIComponent(requestUrl.pathname);
      const filePath = resolve(OUTPUT_ROOT, `.${relativePath}`);
      if (!filePath.startsWith(`${OUTPUT_ROOT}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const metadata = await stat(filePath);
      if (!metadata.isFile()) throw new Error('Requested smoke-test asset is not a file.');
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': MIME_TYPES.get(extname(filePath)) ?? 'application/octet-stream',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404).end();
    }
  });
}

async function main() {
  const chromeExecutable = resolveChrome();
  const profileDirectory = await mkdtemp(join(tmpdir(), 'gaiacom-hqc-smoke-'));
  const server = createStaticServer();
  let chrome;
  let client;

  try {
    await new Promise((resolveListen, rejectListen) => {
      server.once('error', rejectListen);
      server.listen(0, '127.0.0.1', resolveListen);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Smoke-test server address is invalid.');

    chrome = spawn(chromeExecutable, [
      '--headless=new',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-gpu',
      '--no-default-browser-check',
      '--no-first-run',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileDirectory}`,
      `http://127.0.0.1:${address.port}/hqc-smoke.html`
    ], { stdio: 'ignore', windowsHide: true });

    const devToolsPort = await waitForDevTools(profileDirectory);
    client = await connectDevTools(await findPageTarget(devToolsPort));
    await client.send('Runtime.enable');
    await waitForSmokeResult(client);
    process.stdout.write('HQC_BROWSER_SMOKE_PASS\n');
  } finally {
    client?.close();
    if (chrome && chrome.exitCode === null) {
      chrome.kill();
      await Promise.race([once(chrome, 'exit'), delay(5_000)]);
    }
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(profileDirectory, { force: true, maxRetries: 20, recursive: true, retryDelay: 200 });
    await rm(OUTPUT_ROOT, { force: true, recursive: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'HQC browser smoke test failed.'}\n`);
  process.exitCode = 1;
});
