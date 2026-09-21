/* node test/run.mjs — static checks, then the page in a real browser. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { report } from './harness.mjs';
import { staticChecks } from './static.mjs';
import { browserChecks } from './browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.har': 'application/json' };

const server = createServer(async (req, res) => {
  const path = join(root, (req.url || '/').split('?')[0] === '/' ? 'index.html' : (req.url || '').slice(1));
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});

const suites = [staticChecks(join(root, 'index.html'))];

let chromium;
try { ({ chromium } = await import('playwright')); }
catch {
  console.error('\nplaywright is not installed. Run:  npm install  &&  npx playwright install chromium\n');
  report(suites);
  process.exit(1);
}

await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e.message)));

await page.goto(`http://127.0.0.1:${port}/index.html`);
suites.push(await browserChecks(page, errors));

await browser.close();
server.close();
process.exit(report(suites) ? 1 : 0);
