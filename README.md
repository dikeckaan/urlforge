# urlforge

A single-file, offline toolkit for the encoding problems that fill an API developer's day:
percent-encoding, query strings, Base64, punycode, curl commands and OAuth redirects — all
decoded, inspected and rebuilt inside the browser.

**Everything is one `index.html`.** No backend, no build step, no npm, no CDN, no external
JavaScript, CSS or fonts, and no network requests of any kind. Save the file and open it
directly — it works with networking switched off.

Live: **https://kaandikec.com/urlforge/** · Interface in English and Turkish.

## Two ways in

**Simple** is what opens first: eight jobs written in plain language, each one a single screen
with one box to paste into and one answer to copy. No scheme to choose, no direction to set, no
jargon — and every job links through to the full tool with whatever you had typed carried over.

> Make a copied URL readable · Make a value safe for a URL · See and edit the query parameters ·
> Check a URL for problems · Turn a curl command into code · Show what is inside Base64 or a JWT ·
> Do the same thing to many lines · Timestamps, hashes and IDs · Check a webhook signature ·
> Why did the browser block my request? · QR codes, both ways

Paste anything into the box above the cards and urlforge picks the job for you. `⌘K` opens a
command palette over every job, tool and setting.

**Expert** is the nine-tab workbench below, one click away in the top bar. The choice is remembered.

It works on a phone, and not by accident: 16px fields so iOS stops zooming, touch targets that
clear 40px, wide tables that become labelled blocks instead of a horizontal scroll race, safe-area
insets, and a Paste button wherever there is no keyboard.

**Keep a copy.** The Download button saves the whole page as one file. That copy carries an
“Offline edition” badge linking back here, and needs nothing from the network — which is the
only thing urlforge asks you to trust it about.

## What it does

### Encode & decode

- Thirteen schemes side by side: `encodeURIComponent`, `encodeURI`, strict RFC 3986
  (which also escapes `!'()*`), form data (`application/x-www-form-urlencoded`, space → `+`),
  path segment, fragment, every-byte, Base64, Base64URL, `\xNN` hex escapes, `\uXXXX` unicode
  escapes, HTML entities, and Punycode/IDN.
- **A character-by-character map** of what the conversion did. Every rewritten character is
  highlighted with what it became, so `ç → %C3%A7` and a stray space are visible at a glance
  rather than buried in a wall of percent signs.
- **Encoding layers.** Text that was encoded more than once is peeled apart pass by pass, with
  the intermediate result shown at each step. Double-encoding is called out explicitly instead
  of leaving you to notice the `%25`.
- Precise, non-blocking errors: a broken percent escape reports its exact position and the
  three characters that failed; invalid UTF-8 says where the byte run went wrong. Undecodable
  bytes can be replaced with U+FFFD instead, on request.
- Line-by-line mode, deep decoding, live byte and character counts, and a size delta.

### URL inspector

- Splits a URL into scheme, user info, host, port, path, query, fragment and origin, and shows
  the punycode host in its unicode form when they differ.
- **An editable query table.** Rename, retype, reorder by dragging, duplicate or delete
  parameters and the URL above rebuilds itself. Raw and decoded values sit side by side, and
  each row is annotated: double-encoded, repeated, empty, contains `+`, holds JSON, a URL or a JWT.
- Path segments listed raw and decoded, one row per segment.
- **Findings**, ranked by severity: credentials in the URL, secrets in the query string,
  literal spaces, double-encoded values, non-ASCII hosts that need punycode, repeated
  parameters and how frameworks disagree about them, dot segments, default ports, lower-case
  percent escapes, over-long URLs, trailing characters from a bad copy-paste.
- RFC 3986 normalisation: lower-case the scheme and host, drop the default port, resolve
  `.` and `..`, upper-case percent escapes and decode the ones that never needed escaping.
- Side-by-side comparison of two URLs, diffing both the parts and the parameters.

### QR codes

A byte-mode encoder written from scratch — Reed-Solomon over GF(256), block interleaving, all
eight masks scored by penalty, versions 1 to 40 — verified by round-tripping its own output back
through the browser's `BarcodeDetector`. Reading works the same way: pick a photo or a screenshot
and, on a phone, the file input opens the camera, so you can point it at a code and take the URL
apart before trusting it.

### Batch — and HAR files

Drop a `.har` from your browser's network panel anywhere on the page and every URL in the session
is taken apart at once: secrets in query strings, doubly-encoded values, credentials, plain http,
mixed-script hosts, repeated parameters. A summary of hosts and the parameters that appear most,
a filter, a flagged-only view, CSV out, and one click to send any URL to the inspector.

Sixteen operations applied to every line: encode and decode in four flavours, decode until
the text stops changing, normalise, keep only the host, origin or path, drop the query and
fragment, query string to JSON, slugify, punycode. Optional deduplication and sorting;
export as TXT, CSV or JSON.

### Request forge

- Build a request — method, URL, headers, body — and get the snippet in **curl, HTTPie,
  JavaScript `fetch`, axios, Python `requests`, Go `net/http`, PowerShell or PHP curl**, each
  quoted correctly for that language.
- **Paste a curl command and the form fills itself.** Line continuations, single and double
  quoting, `-X`, `-H`, `-d`/`--data-raw`, `--data-urlencode`, `-F`, `-u` (converted to a Basic
  header), `-A`, `-e`, `-b` and `--url` are all understood; the body type is inferred from the
  `Content-Type` or the body's own shape.
- An OAuth 2.0 authorisation URL builder with a locally generated **PKCE pair** (`code_verifier`
  plus its S256 `code_challenge`), and a callback reader that tells you whether a `code`, an
  `error` or an implicit token came back, and lists every parameter.

### Convert

- Text ⇄ Base64 ⇄ Base64URL ⇄ hex, all four fields live and linked.
- Query string ⇄ JSON, with repeated keys collapsed into arrays.
- Unix seconds ⇄ milliseconds ⇄ ISO 8601 ⇄ local time.
- SHA-1/256/384/512 and HMAC through the Web Crypto API, output as hex, Base64 or Base64URL.
- UUID v4, random hex, random Base64URL, a short nonce, and a slug maker that handles Turkish
  characters properly (`Çorbacı Ali'nin 2. şubesi` → `corbaci-ali-nin-2-subesi`).
- A JWT peek that decodes the header and payload and renders `iat`, `nbf` and `exp` as dates.
  It never checks signatures — [jwtforge](https://kaandikec.com/jwtforge/) does that.

### Shapes — also URL templates

RFC 6570, the notation OpenAPI and the GitHub API hand you: `{id}`, `{/path*}`, `{?q,page}`.
All eight operators and both modifiers, checked against the eleven expansion examples in the
specification. It also runs backwards: paste a finished URL and get the variables out.

### Sign

Nothing on this tab leaves the page, which is the point: a signing secret has no business being
pasted into a website that talks to a server.

- **AWS Signature Version 4**, shown as working rather than as an answer: the canonical request,
  the string to sign, each step of the signing-key derivation, and the finished `Authorization`
  header — or a presigned URL, with `X-Amz-Expires` and the query-string form of the signature.
  Handles session tokens, `UNSIGNED-PAYLOAD`, and the S3-versus-everything-else difference in
  how the path is encoded, which is where most signature mismatches actually come from.
  Verified against AWS's own `get-vanilla` test-suite vector and the presigned S3 example in the docs.
- **Webhook signatures** for Stripe, GitHub, Shopify, Slack and plain HMAC. Paste the raw body,
  the secret and the signature header; urlforge shows exactly what gets signed, what the signature
  should be and what arrived. When it does not match it says what usually causes that — a trailing
  newline your editor added, whitespace in the secret, or JSON that was parsed and re-serialised
  before you copied it. "Load an example" mints a body and a matching signature so you can see a
  passing case first.
- **Azure Blob shared access signatures**, built and read. The string to sign is shown in full,
  because a single stray blank line in it is the usual reason a SAS comes back 403. Reading one
  spells out the permission letters, works out how long is left on it, and says when it allows
  writing, or plain http, or started life already valid.
- **Google Cloud Storage V4 signed URLs**, RSA-SHA256 with the PKCS#8 key from a service-account
  JSON, signed in the page through the Web Crypto API. “Make a test key” generates a throw-away
  pair so no real key has to be pasted to see how it works.

### Shapes — query dialects

The same JSON object written out the way nine different stacks write it — `qs`, PHP, Rails, Rack,
Spring, ASP.NET Core, `URLSearchParams`, Go, `requests`, and the OpenAPI `form`, `deepObject`,
`spaceDelimited` and `pipeDelimited` styles — side by side, so an interop argument can be settled by
looking. The OpenAPI parameter-style table (`in: query` / `path` / `header`, each style and both
`explode` values) is reproduced from the specification. Paste a query string in and it goes the
other way: back to JSON, with a guess at which dialect wrote it.

### HTTP

- **CORS preflight.** Describe the request — origin, URL, method, whether it carries credentials,
  which headers it sets — and paste what the server answered. You get a verdict and the rules one
  by one: whether a preflight is even needed and why, whether the origin is echoed back exactly,
  the `*`-with-credentials trap, missing `Allow-Methods` or `Allow-Headers`, `Max-Age`,
  a missing `Vary: Origin`, and what JavaScript will actually be allowed to read.
- **Set-Cookie.** Attributes decoded, lifetime worked out, and the usual mistakes called out:
  `SameSite=None` without `Secure`, a session cookie with no `HttpOnly`, a `__Host-` name that
  breaks its own rules, `Max-Age` and `Expires` fighting each other, and anything over 4 KB.
- **Redirect chains.** Give it a status and a `Location` per hop; it resolves them the way a
  browser would and says what changes underfoot — a 301 or 302 rewriting your POST into a GET and
  dropping the body, 307 and 308 keeping it, loops, https-to-http downgrades, a query that stops
  being carried, and the origin change that drops your `Authorization` header.
- **Caching.** Two verdicts, browser and CDN, because they disagree more often than not.
  Freshness in the order the spec checks it — `s-maxage`, `max-age`, `Expires` minus `Date`, then
  the `Last-Modified` heuristic — against the `Age` already on the clock, plus `no-store`,
  `private`, `Vary: *`, `immutable` and `stale-while-revalidate`.
- **Content-Security-Policy.** Every directive with its sources, and the findings that matter:
  `unsafe-inline` (and when a nonce makes browsers ignore it), `unsafe-eval`, a wildcard or bare
  scheme in `script-src`, missing `object-src`, `base-uri`, `frame-ancestors` and `form-action`,
  and directive names no browser knows — which fail silently.

### Reference

A searchable table of every printable ASCII character plus a few non-ASCII samples: its RFC 3986
class (unreserved, gen-delims, sub-delims, other), what each encoding scheme turns it into, and
whether it may appear literally in a path segment, a query or a fragment.

The URL inspector also flags **mixed writing systems** in a hostname — the Cyrillic а in
`аpple.com` — naming the odd characters and their code points.

## Getting around

`⌘K` or `Ctrl+K` opens a command palette over every job, tool and setting. `Alt+1` to `Alt+9`
jump straight to a tool. A single open job shares as a readable link — `#/encode?v=…` — rather
than one opaque blob, and a link pasted into an already-open tab lands rather than doing nothing.
The last eight things you worked on come back as chips on the start screen.

## Privacy

Nothing leaves the page. There are no analytics, no fonts, no CDN and no requests of any kind.
Only the language and theme choice are stored, in this browser's local storage.

"Copy workspace link" puts the current input into the link's fragment. Fragments are never sent
to a server, but anyone holding the link can read it — treat a shared link like the data it carries.

## Running it

Open `index.html`. That is the whole thing.

For GitHub Pages, the workflow in `.github/workflows/pages.yml` publishes the repository root
on every push to `main`.

## Licence

MIT.
