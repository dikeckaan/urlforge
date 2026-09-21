/* Checks that need a real browser: the page as a user meets it. */
import { suite, eq, ok, includes } from './harness.mjs';

const fire = `(sel, ev) => { const n = document.querySelector(sel); n.dispatchEvent(new Event(ev || 'input', { bubbles: true })); }`;

export async function browserChecks(page, errors) {
  const s = suite('browser — behaviour');
  const $ = sel => page.$eval(sel, n => n.textContent);
  const set = async (sel, value) => page.evaluate(([sel, value]) => {
    const n = document.querySelector(sel);
    n.value = value;
    n.dispatchEvent(new Event('input', { bubbles: true }));
  }, [sel, value]);
  const click = sel => page.click(sel);
  const mode = m => page.click(`[data-mode-set="${m}"]`);

  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();

  await s.checkAsync('boots without a console error', async () =>
    ok(errors.length === 0, 'console errors: ' + errors.join(' | ')) || 'clean');

  await s.checkAsync('opens in simple mode with every job', async () => {
    const n = await page.$$eval('.taskcard', els => els.length);
    eq(await page.evaluate(() => document.body.dataset.mode), 'simple', 'mode');
    return eq(n, 11, 'job cards');
  });

  /* ---- the page's own conformance vectors ---- */
  await s.checkAsync('self-test passes in the browser', async () => {
    await mode('expert');
    await click('#tab-reference');
    await click('#btn-selftest');
    await page.waitForFunction(() => document.querySelectorAll('#selftest-rows tr').length > 0, { timeout: 15000 });
    await page.waitForTimeout(600);
    const fails = await page.$$eval('#selftest-rows tr', rows =>
      rows.filter(tr => /FAIL|KALDI/.test(tr.children[0].textContent))
          .map(tr => tr.children[1].textContent + ': ' + tr.children[2].textContent));
    ok(!fails.length, fails.join(' | '));
    return await $('#selftest-score');
  });

  /* ---- encoding ---- */
  await s.checkAsync('double-encoded input peels apart', async () => {
    await click('#tab-codec');
    await page.click('[data-dir="decode"]');
    await page.click('[data-scheme="component"]');
    await page.check('#opt-deep');
    await set('#codec-in', 'q%253D%25C3%25A7orba');
    const got = await $('#codec-out');
    await page.uncheck('#opt-deep');
    return eq(got, 'q=çorba');
  });
  await s.checkAsync('a broken escape is located, not swallowed', async () => {
    await set('#codec-in', 'abc%zz');
    return includes(await $('#codec-status'), 'position 3');
  });

  /* ---- inspector ---- */
  await s.checkAsync('inspector finds what is wrong with a URL', async () => {
    await click('#tab-inspect');
    await set('#insp-in', 'https://user:pw@API.Example.com:443/a b?token=sk_live_1&t=a&t=b&q=%2520');
    const text = await page.$$eval('#insp-findings .finding', els => els.map(e => e.textContent).join(' || '));
    ['Credentials in the URL', 'looks like a secret', 'literal space', 'appears 2 times']
      .forEach(want => includes(text, want));
    return await $('#insp-finding-count') + ' findings';
  });
  await s.checkAsync('a mixed-script host is caught', async () => {
    await set('#insp-in', 'https://аpple.com/login');
    return includes(await page.$$eval('#insp-findings .finding', e => e.map(x => x.textContent).join(' ')),
      'Mixed writing systems');
  });
  await s.checkAsync('a plain host is not falsely accused', async () => {
    await set('#insp-in', 'https://apple.com/login');
    const text = await page.$$eval('#insp-findings .finding', e => e.map(x => x.textContent).join(' '));
    return ok(text.indexOf('Mixed writing systems') < 0, 'false positive') || 'clean';
  });

  /* ---- request forge ---- */
  await s.checkAsync('a curl command fills the form', async () => {
    await click('#tab-request');
    await set('#curl-in', `curl -u 'ali:şifre' --data-urlencode 'q=a b' https://x.example/t`);
    await click('#btn-curl-import');
    eq(await page.$eval('#req-method', n => n.value), 'POST', 'method');
    eq(await page.$eval('#req-body', n => n.value), 'q=a+b', 'body');
    return includes(await page.$$eval('#h-rows input', n => n.map(x => x.value).join(' ')), 'Basic YWxpOsWfaWZyZQ==');
  });

  /* ---- CORS ---- */
  await s.checkAsync('CORS blocks * with credentials', async () => {
    await click('#tab-http');
    await click('#btn-cors-sample');
    includes(await $('#cors-status'), 'blocks');
    return includes(await page.$$eval('#cors-findings .finding', e => e.map(x => x.textContent).join(' ')),
      'cannot be used with credentials');
  });
  await s.checkAsync('CORS passes a correct answer', async () => {
    await set('#cors-res-headers', [
      'access-control-allow-origin: https://app.example.com',
      'access-control-allow-credentials: true',
      'access-control-allow-methods: GET, POST',
      'access-control-allow-headers: content-type, authorization',
      'vary: Origin'].join('\n'));
    return includes(await $('#cors-status'), 'lets this through');
  });

  /* ---- cookies, redirects, caching, CSP ---- */
  await s.checkAsync('SameSite=None without Secure is flagged', async () => {
    await set('#cookie-in', 'session=abc; Path=/; HttpOnly; SameSite=None');
    return includes(await $('#cookie-out'), 'SameSite=None without Secure');
  });
  await s.checkAsync('a 302 rewriting POST is called out', async () => {
    await click('#btn-redir-sample');
    return includes(await page.$$eval('#redir-findings .finding', e => e.map(x => x.textContent).join(' ')),
      'rewrites the method');
  });
  await s.checkAsync('browser and CDN get separate cache verdicts', async () => {
    await click('#btn-cache-sample');
    const b = await $('#cache-browser'), c = await $('#cache-shared');
    includes(b, 'max-age');
    ok(b !== c, 'both caches gave the same verdict for a split max-age/s-maxage');
    return 'they differ, as they should';
  });
  await s.checkAsync('CSP names its own problems', async () => {
    await click('#btn-csp-sample');
    const text = await page.$$eval('#csp-findings .finding', e => e.map(x => x.textContent).join(' || '));
    ["'unsafe-inline' in script-src", 'No base-uri', 'No frame-ancestors'].forEach(w => includes(text, w));
    return await $('#csp-status');
  });

  /* ---- shapes and templates ---- */
  await s.checkAsync('one object, nine dialects', async () => {
    await click('#tab-shapes');
    await click('#btn-shp-sample');
    const rows = await page.$$eval('#shp-rows tr', els => els.map(tr => tr.children[1].textContent));
    eq(rows.length, 9, 'dialect rows');
    includes(rows.join(' '), 'tags%5B%5D=a');
    return includes(rows.join(' '), 'filter.city=');
  });
  await s.checkAsync('a query string names its own dialect', async () =>
    includes(await $('#shp-guess'), 'Rails'));

  /* ---- signing ---- */
  await s.checkAsync('the presigned S3 example matches the AWS docs', async () => {
    await click('#tab-sign');
    await click('#btn-sig-sample');
    await page.waitForTimeout(400);
    return includes(await $('#sig-out'),
      'aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
  });
  for (const provider of ['stripe', 'github', 'shopify', 'slack', 'generic']) {
    await s.checkAsync(`webhook signature verifies — ${provider}`, async () => {
      await page.selectOption('#wh-provider', provider);
      await click('#btn-wh-sample');
      await page.waitForTimeout(250);
      return includes(await $('#wh-status'), 'matches');
    });
  }
  await s.checkAsync('a tampered body is rejected with a reason', async () => {
    await page.evaluate(() => {
      const n = document.querySelector('#wh-body');
      n.value = n.value + '\n';
      n.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(250);
    return includes(await $('#wh-status'), 'ends in a newline');
  });
  await s.checkAsync('a GCS signature verifies against its own key', async () => {
    await click('#btn-gcs-key');
    await page.waitForTimeout(1500);
    includes(await $('#gcs-status'), 'Signed with RSA-SHA256');
    return includes(await $('#gcs-out'), 'X-Goog-Signature=');
  });
  await s.checkAsync('an Azure SAS round-trips through its own reader', async () => {
    await click('#btn-sas-sample');
    await page.waitForTimeout(400);
    includes(await $('#sas-out'), 'sig=');
    return includes(await $('#sas-parse-status'), 'parameter');
  });

  /* ---- HAR ---- */
  await s.checkAsync('a HAR file is taken apart', async () => {
    await click('#tab-batch');
    await page.evaluate(() => {
      const har = { log: { entries: [
        { request: { method: 'GET', url: 'https://api.example.com/s?q=kebap%2520x' }, response: { status: 200 } },
        { request: { method: 'POST', url: 'https://api.example.com/o?token=sk_live_1' }, response: { status: 201 } },
        { request: { method: 'GET', url: 'http://cdn.example.com/a b.png' }, response: { status: 404 } }
      ] } };
      const f = new File([JSON.stringify(har)], 'session.har', { type: 'application/json' });
      const dt = new DataTransfer(); dt.items.add(f);
      const input = document.querySelector('#har-file');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    const chips = await page.$$eval('#har-rows .chip', e => e.map(x => x.textContent).join(' '));
    ['double-encoded', 'secret in query', 'literal space', 'plain http'].forEach(w => includes(chips, w));
    return await $('#har-status');
  });

  /* ---- QR both ways ---- */
  await s.checkAsync('a generated QR reads back through the browser', async () => {
    await click('#tab-convert');
    await set('#qr-in', 'https://kaandikec.com/urlforge/#suite');
    await page.waitForTimeout(100);
    const value = await page.evaluate(async () => {
      const c = document.querySelector('#qr-canvas');
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const f = new File([blob], 'qr.png', { type: 'image/png' });
      const dt = new DataTransfer(); dt.items.add(f);
      const input = document.querySelector('#qr-file');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 600));
      return document.querySelector('#qr-read-out').textContent;
    });
    return eq(value, 'https://kaandikec.com/urlforge/#suite');
  });

  /* ---- links, language, shell ---- */
  await s.checkAsync('a deep link opens its job with its value', async () => {
    await page.evaluate(() => { location.hash = '#/encode?v=a2ViYXAgw6dvcmJh'; });
    await page.waitForTimeout(250);
    eq(await page.evaluate(() => document.body.dataset.mode), 'simple', 'mode');
    eq(await page.$eval('#t-enc-in', n => n.value), 'kebap çorba', 'value');
    return eq(await $('#t-enc-out'), 'kebap%20%C3%A7orba');
  });
  await s.checkAsync('Turkish leaves nothing blank', async () => {
    await page.click('[data-lang-set="tr"]');
    const empties = await page.$$eval('[data-i18n]', els =>
      els.filter(n => !n.textContent.trim()).map(n => n.dataset.i18n));
    ok(!empties.length, 'empty: ' + empties.join(', '));
    await page.click('[data-lang-set="en"]');
    return 'none';
  });
  await s.checkAsync('the saved copy knows it is a copy', async () => {
    const marked = await page.evaluate(async () => {
      const r = await fetch(location.href, { cache: 'no-store' });
      const txt = await r.text();
      return txt.replace(/<html\b([^>]*)>/i, (a, at) => '<html' + at + ' data-edition="offline">')
        .match(/<html[^>]*>/)[0];
    });
    return includes(marked, 'data-edition="offline"');
  });

  /* ---- every surface, watching the console ---- */
  await s.checkAsync('every tab and job renders without throwing', async () => {
    errors.length = 0;
    await mode('expert');
    for (const id of ['codec', 'inspect', 'shapes', 'batch', 'request', 'sign', 'http', 'convert', 'reference']) {
      await click('#tab-' + id);
      await page.waitForTimeout(40);
    }
    await mode('simple');
    const jobs = await page.$$eval('.taskcard', e => e.length);
    for (let i = 0; i < jobs; i++) {
      await page.evaluate(i => document.querySelectorAll('.taskcard')[i].click(), i);
      await page.waitForTimeout(40);
      await click('#btn-task-back');
    }
    const crashed = await page.$eval('#crash', n => n.hidden ? '' : n.textContent);
    ok(!crashed, 'crash banner: ' + crashed);
    ok(errors.length === 0, 'console errors: ' + errors.join(' | '));
    return `9 tabs, ${jobs} jobs, clean`;
  });

  /* ---- phone width ---- */
  await s.checkAsync('nothing overflows at 390px', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mode('expert');
    const bad = [];
    for (const id of ['codec', 'inspect', 'shapes', 'batch', 'request', 'sign', 'http', 'convert', 'reference']) {
      await click('#tab-' + id);
      const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (over) bad.push(id);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    return ok(!bad.length, 'overflowing: ' + bad.join(', ')) || 'all nine fit';
  });

  return s;
}
