/* A few lines of assertion, rather than a framework. */
export function suite(title) {
  const results = [];
  return {
    title,
    results,
    check(name, fn) {
      try {
        const detail = fn();
        results.push({ name, ok: true, detail: detail == null ? '' : String(detail) });
      } catch (e) {
        results.push({ name, ok: false, detail: e.message });
      }
    },
    skip(name, detail) {
      results.push({ name, ok: true, skipped: true, detail: detail || '' });
    },
    async checkAsync(name, fn) {
      try {
        const detail = await fn();
        results.push({ name, ok: true, detail: detail == null ? '' : String(detail) });
      } catch (e) {
        results.push({ name, ok: false, detail: e.message });
      }
    }
  };
}

export function eq(got, want, what) {
  if (got !== want) {
    const g = String(got), w = String(want);
    throw new Error((what ? what + ': ' : '') +
      (g.length > 120 || w.length > 120 ? `\n    got  ${g.slice(0, 200)}\n    want ${w.slice(0, 200)}` : `${g} ≠ ${w}`));
  }
  return String(want).slice(0, 90);
}
export function ok(cond, message) {
  if (!cond) throw new Error(message || 'expected true');
  return '';
}
export function includes(haystack, needle, what) {
  if (String(haystack).indexOf(needle) < 0) {
    throw new Error((what ? what + ': ' : '') + `missing ${JSON.stringify(needle)} in ${String(haystack).slice(0, 200)}`);
  }
  return needle.slice(0, 90);
}

export function report(suites) {
  let pass = 0, fail = 0, skip = 0;
  for (const s of suites) {
    console.log(`\n── ${s.title}`);
    for (const r of s.results) {
      if (r.skipped) { skip++; console.log(`   skip  ${r.name}${r.detail ? '  — ' + r.detail : ''}`); }
      else if (r.ok) { pass++; console.log(`   ok    ${r.name}${r.detail ? '  — ' + r.detail : ''}`); }
      else { fail++; console.log(`   FAIL  ${r.name}\n         ${r.detail}`); }
    }
  }
  console.log(`\n${pass} passed, ${fail} failed${skip ? `, ${skip} skipped` : ''}\n`);
  return fail;
}
