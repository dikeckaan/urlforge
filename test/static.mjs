/* Checks that need no browser: the file's own invariants. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { suite, eq, ok } from './harness.mjs';

const SIZE_BUDGET = 600 * 1024;

export function staticChecks(path) {
  const s = suite('static — index.html invariants');
  const src = readFileSync(path, 'utf8');
  const bytes = Buffer.byteLength(src, 'utf8');

  s.check('parses as one script block', () => {
    const m = src.match(/<script>\n([\s\S]*)\n<\/script>/);
    ok(m, 'no inline <script> block found');
    new vm.Script(m[1]);            /* throws on a syntax error */
    return m[1].split('\n').length + ' lines';
  });

  s.check('stays inside the size budget', () =>
    ok(bytes <= SIZE_BUDGET, `${bytes} bytes exceeds ${SIZE_BUDGET}`) ||
    `${Math.round(bytes / 1024)} KB of ${Math.round(SIZE_BUDGET / 1024)} KB`);

  s.check('loads nothing from anywhere else', () => {
    const bad = [];
    if (/<script[^>]+\bsrc=/i.test(src)) bad.push('<script src>');
    if (/<link[^>]+rel=["']?stylesheet/i.test(src)) bad.push('<link rel=stylesheet>');
    if (/@import/i.test(src)) bad.push('@import');
    if (/url\(\s*['"]?https?:/i.test(src)) bad.push('url(http...) in CSS');
    if (/<img[^>]+\bsrc=["']?https?:/i.test(src)) bad.push('<img src=http>');
    return ok(!bad.length, 'external references: ' + bad.join(', ')) || 'no external references';
  });

  s.check('only the camera input forces the camera', () => {
    const n = (src.match(/capture=["']environment["']/g) || []).length;
    const onQrFile = /id=["']qr-file["'][^>]*capture=/.test(src);
    ok(!onQrFile, 'the gallery input must not carry capture=');
    return eq(n, 1, 'capture= occurrences in markup');
  });

  s.check('English and Turkish carry the same keys', () => {
    const js = src.match(/const I18N = \{\n([\s\S]*?)\n\};\n/)[1];
    const [en, tr] = js.split('\ntr: {');
    const keys = block => new Set([...block.matchAll(/'([a-zA-Z][a-zA-Z0-9._]*)':\s/g)].map(m => m[1]));
    const a = keys(en), b = keys(tr);
    const missing = [...a].filter(k => !b.has(k));
    const extra = [...b].filter(k => !a.has(k));
    ok(!missing.length, 'missing in tr: ' + missing.join(', '));
    ok(!extra.length, 'extra in tr: ' + extra.join(', '));
    return `${a.size} keys each`;
  });

  s.check('no empty translations', () => {
    const js = src.match(/const I18N = \{\n([\s\S]*?)\n\};\n/)[1];
    const empties = [...js.matchAll(/'([a-zA-Z][a-zA-Z0-9._]*)':\s*''/g)].map(m => m[1]);
    return ok(!empties.length, 'empty: ' + empties.join(', ')) || 'none empty';
  });

  s.check('has the head a page needs', () => {
    ok(/<html lang="[a-z]{2}"/.test(src), 'no lang on <html>');
    ok(/<title>[^<]+<\/title>/.test(src), 'no <title>');
    ok(/name="viewport"/.test(src), 'no viewport meta');
    ok(/name="description"/.test(src), 'no description meta');
    return 'lang, title, viewport, description';
  });

  return s;
}
