# Security Hardening Guide

Formal names & references for every security improvement applied to this
repository, so each topic can be researched deeper (CWE / OWASP / CAPEC).

> Scope: the multi-layer stack — Nitro app (blog CRUD, auth) → nginx edge →
> Redis / PostgreSQL / MongoDB → docker-compose. Baseline date: **September 2026**.

---

## 1. Quick reference

| # | Finding (plain English) | Formal name (CWE) | OWASP Top-10 2021 | OWASP API Top-10 2023 | Where fixed |
|---|-------------------------|-------------------|-------------------|-----------------------|-------------|
| 1 | `/api/v1/test` created DB rows & dumped all posts with no auth | **CWE-862** Missing Authorization + **CWE-200** Exposure of Sensitive Information | A01 Broken Access Control | API5 Broken Function Level Authorization / API3 BOPLA | `server/api/v1/test.get.ts` |
| 2 | No rate limiting on login / email flows (brute force, mail bombing) | **CWE-307** Improper Restriction of Excessive Authentication Attempts + **CWE-770** / **CWE-799** | A07 Identification & Authentication Failures | API4 Unrestricted Resource Consumption / API6 Sensitive Business Flows | `server/middleware/rateLimit.ts`, `server/config/nginx/default.conf` |
| 3 | Unpublish/delete didn't evict cached lists (stale authorization data) | **CWE-459** Incomplete Cleanup (cache-invalidation class) | A01 | API3 | `server/utils/cacheInvalidation.ts` |
| 4 | `redis.keys()` (O(N), blocking) on a shared Redis | **CWE-400** Uncontrolled Resource Consumption / **CWE-407** Algorithmic Complexity | A05 | API4 | `server/utils/cacheInvalidation.ts` (SCAN) |
| 5 | Client-spoofable `X-Forwarded-For` (IP rotation defeats limits) | **CWE-346** Origin Validation Error / **CWE-348** Use of Less Trusted Source | A05 | API8 | nginx `proxy_set_header X-Forwarded-For $remote_addr` |
| 6 | Security headers lost via nginx `add_header` inheritance | **CWE-693** Protection Mechanism Failure (clickjacking: **CWE-1021**, MIME-sniffing XSS: **CWE-79** family) | A05 | API8 | `server/config/nginx/default.conf` |
| 7 | `Cache-Control: public` stamped on API/SSR responses | **CWE-524** Use of Cache Containing Sensitive Information | A01 | API8 | nginx `location ^~ /api/` → `no-store` |
| 8 | View-count inflation by replaying GETs | **CWE-471** Modification of Assumed-Immutable Data | A01 | API6 | `[...slug].get.ts` + Redis throttle |
| 9 | Mongo auth depended only on image entrypoint flag | **CWE-306** Missing Authentication for Critical Function | A07 | API8 | `server/config/mongo/mongod.conf` |
| 10 | `requirepass ${VAR}` literal in redis.conf (no env expansion) | **CWE-1188** Insecure Default Initialization (config class) | A05 Security Misconfiguration | API8 | `server/config/redis/redis.conf` |
| 11 | Internal error details reflected to clients (Prisma message) | **CWE-209** Generation of Error Message Containing Sensitive Information | A05 | API8 | `index.post.ts`, `login.post.ts` |
| 12 | Vulnerable npm deps (tar, sharp, mysql2, uuid, esbuild, deepmerge-ts) | **CWE-1395** Dependency on Vulnerable Third-Party Component | A06 Vulnerable & Outdated Components | API10 (supply chain) | `pnpm-workspace.yaml` overrides |

Design-level note: the rate limiter deliberately **fails open** — classified as
**CWE-636** "Not Failing Securely (Failing Open)", chosen consciously as an
availability trade-off (see §3.2).

---

## 2. Detailed findings & fixes

### 2.1 Unauthenticated test/seed endpoints

- **Classification:** Broken Access Control. Two missing layers at once:
  *function-level* (**CWE-862**, OWASP API5 — the route handler itself was
  callable by anyone) and *object/property-level* (**CWE-200** / API3 BOPLA —
  the response dumped `author: true`, leaking emails and internal IDs).
  Secondary impact: unauthenticated **data tampering** (every GET created a
  post) — a "mass data injection" primitive.
- **Fix:** production returns `404` unless `ENABLE_TEST_ENDPOINT=true`; when
  enabled, admin-role required; response reduced to a safe `select`; cache +
  sitemap invalidated. `/api/v1/blog/seed` is admin-gated (no env flag) and
  a no-op when posts already exist; the auto-seed Nitro plugin only runs at
  startup in dev — in production the Welcome post is seeded lazily by the
  first authorized admin request (auth middleware), attributed to that admin
  (`ENABLE_AUTO_SEED=true` restores startup seeding).
- **Dive deeper:** OWASP API Top-10 "API5:2023 Broken Function Level
  Authorization", "API3:2023 Broken Object Property Level Authorization";
  CWE-862; "deny by default" / *fail-closed* routing.

### 2.2 Rate limiting (brute force, mail bombing, spam)

- **Classification:** **CWE-307** for the credential endpoints; the general
  class of "no throttling on expensive side-effects (sending email, writing
  rows)" is **CWE-770**/**CWE-799** and maps to **API4:2023 Unrestricted
  Resource Consumption** and **API6:2023 Unrestricted Access to Sensitive
  Business Flows** (newsletter/mail endpoints are a *business flow* abusable
  for mail bombing / notification spam).
- **Fix:** fixed-window counters in Redis (`INCR` + `EXPIRE` pipelined):
  - `auth` bucket — 10/min/IP on login, register, forgot/reset/verify/resend
  - `comments` bucket — 10/min per **account id** (IP rotation-proof), IP fallback
  - `public-write` bucket — 20/min/IP on contact form + subscribe
  - nginx edge: `limit_req_zone 20r/s burst=40` + `limit_conn 30` on `/api/`
  - Tunable via `RATE_LIMIT_*` env vars; **fails open** on Redis outage.
- **Dive deeper:** OWASP Cheat Sheet *Authentication → Prevent Brute Force*,
  OWASP *Automated Threats to Web Applications* (OAT) catalogue, CAPEC-49
  (Password Brute Forcing), token-bucket vs fixed-window vs sliding-window
  algorithms, `Retry-After` header semantics.

### 2.3 Cache invalidation on authorization-relevant writes

- **Classification:** authorization revocation vs cache TTL race. A cached
  list continues to *serve* content whose *permission state changed*
  (unpublished/deleted). Closest CWE: **CWE-459** (Incomplete Cleanup); in the
  literature this is discussed as *revocation latency* / *stale authorization
  data in caches*.
- **Fix:** `invalidateBlogListCache()` (SCAN + DEL) called from POST, PATCH,
  DELETE, seed and test handlers.
- **Dive deeper:** OWASP ASVS V4 (Access Control), cache-invalidation
  strategies (write-through vs write-invalidate), Redis `SCAN` cursor
  semantics, the *cache stampede/thundering herd* trade-off of mass-eviction.

### 2.4 Redis `KEYS` → `SCAN`

- **Classification:** **CWE-400**/**CWE-407**: an O(N) blocking command inside
  request handling turns the shared Redis into a latency bottleneck —
  a *self-inflicted denial of service* as the keyspace grows ("noisy
  neighbor" effect on the single Redis instance shared with sessions/cache).
- **Fix:** cursor-based `SCAN` with `COUNT 200`; deletion in batches.
- **Dive deeper:** Redis docs *How KEYS can ruin performance*, big-O of Redis
  commands, `SCAN` guarantees (full-iteration, may return duplicates).

### 2.5 `X-Forwarded-For` spoofing

- **Classification:** **CWE-346** Origin Validation Error / **CWE-348** Use of
  Less Trusted Source: a client-controlled header influenced security
  decisions (rate-limit identity, Token IP records). With nginx configured as
  `$proxy_add_x_forwarded_for` (append), an attacker rotates fake IPs →
  **rate-limit evasion** (**CWE-799**).
- **Fix:** nginx is the single trusted edge, so all proxy locations now
  *overwrite*: `proxy_set_header X-Forwarded-For $remote_addr`. The app keeps
  `getRequestIP(event, { xForwardedFor: true })` (h3) which is now trustworthy.
- **Dive deeper:** "rightmost-untrusted-IP" / trusted-proxy-chain design,
  nginx `real_ip` module, OWASP *Unvalidated Forwarding* cheat-sheet entries.

### 2.6 nginx header inheritance & missing security headers

- **Classification:** **CWE-693** Protection Mechanism Failure. In nginx, any
  `add_header` in a `location` suppresses *all* inherited headers —
  `/_nuxt/` and the static-asset locations silently lost
  `X-Content-Type-Options`/`X-Frame-Options`; the CSP declared in
  `location /` never applied to SSR responses (internal redirect to `@app`
  restarts header processing → headers come from the *final* location).
  Missing headers map to: clickjacking **CWE-1021** (`X-Frame-Options` /
  CSP `frame-ancestors`), MIME-sniffing XSS (**CWE-79** family;
  `X-Content-Type-Options: nosniff`), referrer leakage (**CWE-200**;
  `Referrer-Policy`), browser-API over-grant (`Permissions-Policy` —
  *least privilege* for the client surface).
- **Fix:** security-header baseline on `server` level; every location that
  declares its own `add_header` re-declares the set; CSP moved to server
  level (now also covers SSR/API-via-@app); deprecated `X-XSS-Protection`
  removed.
- **Dive deeper:** MDN *Security headers*; OWASP Secure Headers Project;
  nginx docs *add_header inheritance*; CSP `frame-ancestors` vs
  `X-Frame-Options` precedence.

### 2.7 Caching of authenticated responses

- **Classification:** **CWE-524** Use of Cache Containing Sensitive
  Information: a global `add_header Cache-Control "max-age=7200, public"`
  applied to proxied dynamic responses, so role-differentiated blog lists and
  SSR pages could be stored by shared/browser caches. Related active attack:
  **Web Cache Deception** (trick a user's browser into caching a private URL).
- **Fix:** dedicated `location ^~ /api/` issuing `Cache-Control: no-store`;
  the global public `Cache-Control` removed (static locations keep their own
  explicit cache policy).
- **Dive deeper:** PortSwigger *Web cache deception*; MDN `Cache-Control:
  no-store` semantics; Vary/`Vary: Cookie` pitfalls.

### 2.8 View-count inflation

- **Classification:** **CWE-471** Modification of Assumed-Immutable Data via
  an unauthenticated endpoint; business-metric tampering →
  **API6:2023** (Sensitive Business Flows).
- **Fix:** one view per post+IP per hour via Redis `SET NX EX` gate;
  fire-and-forget increment unchanged; fail-open when Redis is down.
- **Dive deeper:** OWASP API6 cheat-sheet ("assume every business flow is
  abusable"), proof-of-work / CAPTCHA as next escalation steps.

### 2.9 MongoDB authentication (defense in depth)

- **Classification:** **CWE-306** Missing Authentication for Critical
  Function — auth *was* enabled implicitly (the official image entrypoint
  appends `--auth` when `MONGO_INITDB_ROOT_USERNAME/PASSWORD` are set), but
  that invariant lived in a third-party entrypoint script. A config drift
  (env vars removed) would silently disable auth.
- **Fix:** `security.authorization: enabled` pinned in `mongod.conf`
  (redundant with `--auth` = harmless; keeps the guarantee under drift).
  Note: first-boot initialization intentionally runs *without* auth to create
  the root user, then restarts with auth (image behavior, unchanged).
- **Dive deeper:** MongoDB *Configure Scram Client Authentication*;
  SCRAM-SHA-256; `localhost exception` during bootstrap.

### 2.10 Redis requirepass placeholder in conf

- **Classification:** security misconfiguration (**A05:2021**): redis.conf
  does **not** expand environment variables, so `requirepass ${REDIS_PASSWORD}`
  was the literal string (inert because compose passes `--requirepass`, but a
  trap for anyone starting redis from the conf directly).
- **Fix:** commented out + explanatory note; `protected-mode yes` retained
  (rejects non-loopback clients when no auth is configured).
- **Dive deeper:** Redis `protected-mode` semantics; ACL (Redis 6+) as the
  successor of `requirepass`; env-interpolation layers in compose vs
  container shell (`$VAR` vs `$$VAR` in compose commands).

### 2.11 Error-message leakage

- **Classification:** **CWE-209** — blog POST appended `e.message` (Prisma
  internals: constraint names, table/column hints) into the client-facing
  `statusMessage`; the Capacitor social-login path reflected upstream
  validator errors.
- **Fix:** log the detail server-side, return generic messages to clients.
- **Dive deeper:** OWASP *Error Handling* cheat sheet; A09:2021 (Logging &
  Monitoring) for the logging side of the same coin.

### 2.12 Vulnerable dependencies (pnpm overrides)

- **Classification:** **A06:2021** Vulnerable and Outdated Components;
  CWE-1395 (Dependency on Vulnerable Third-Party Component). Fixed with
  *version-range overrides* (`pnpm-workspace.yaml`), e.g. `tar@<7.5.21 →
  >=7.5.21`, scoped to the vulnerable range so unrelated pins (Vite's esbuild
  0.25) are untouched.
- **Verification:** `pnpm audit` → 0 findings; `pnpm install --frozen-lockfile`
  passes (Docker `deps` stage).
- **Dive deeper:** SBOM (CycloneDX/SPDX), GitHub Advisories/GHSA IDs,
  `minimumReleaseAge` supply-chain policy (already present in this repo),
  transitive-dependency resolution.

---

## 3. Design principles applied

### 3.1 Defense in depth
Every control exists at ≥ 2 layers: rate limiting (nginx edge + app
middleware), auth (JWT middleware + per-handler role checks), Mongo auth
(entrypoint flag + conf), cache (no-store at nginx + correct invalidation in
app).

### 3.2 Fail-open vs fail-closed (**CWE-636**)
The rate limiter *deliberately* fails open (Redis outage must not take the
API down — Redis already degrades gracefully elsewhere in this codebase).
Security-critical checks (auth, roles) are fail-closed. Document the choice
per control — never let it happen by accident.

### 3.3 Deny by default
Test/seed endpoints 404 in production unless explicitly enabled — the
"unknown endpoint" default state is *closed*.

### 3.4 Single trusted identity source
Client IP is established once, at the only trust boundary (nginx), and
consumed everywhere; the per-account bucket additionally removes the value of
IP rotation.

### 3.5 Least privilege
`Permissions-Policy` locks unused browser APIs; production disables seeding
and test flows; admin-only guards on everything destructive.

---

## 4. Audited areas — currently acceptable (with caveats)

| Area | Verdict | Notes |
|------|---------|-------|
| SQL injection (**CWE-89**) | OK | Prisma parameterizes all blog CRUD; no `$queryRaw` in reviewed paths |
| NoSQL injection (**CWE-943**) | OK | Mongoose models with schema-strict queries; user input never interpolated as operators (watch for `$where`/`$gt` in any future raw usage) |
| Mass assignment (**CWE-915**, API3) | OK* | `settings.patch` stores a free-form object; Mongoose `strict` mode strips unknown paths — keep the User schema strict |
| Stored XSS in comments (**CWE-79**) | OK* | Content stored verbatim; rendering relies on Vue auto-escaping. If you ever render with `v-html`, sanitize server-side (DOMPurify) and tighten CSP |
| CSRF | OK* | Cookie auth uses `SameSite=Lax` + httpOnly + secure-in-prod; state-changing endpoints are JSON-body APIs (no form-post surface) |
| Privilege bootstrap | ⚠ Open | `register.post.ts`: first registered account becomes **admin**. If the users collection is ever empty (DB reset), the first stranger to register escalates. Consider gating behind an env flag |
| Redis container | ⚠ Open | `privileged: true` exists only for `sysctl vm.overcommit_memory=1`; set the sysctl on the host and drop the flag (least privilege) |
| CSP strictness | ⚠ Open | `unsafe-eval`/`unsafe-inline` retained for Nuxt/hydration compatibility; a nonce-based CSP is the long-term goal |

---

## 5. Verification commands

```bash
# dependency audit
pnpm audit

# lockfile matches overrides (Docker deps stage uses this)
pnpm install --frozen-lockfile

# nginx syntax (mount conf into the official image, stub upstream hosts)
docker run --rm --add-host portfolio-app-1:127.0.0.1 --add-host portfolio-app-2:127.0.0.1 \
  -v "$PWD/server/config/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:stable-alpine nginx -t

# compose interpolation & validation (resolves ${VAR:-default})
docker compose -f compose.prod.test.yaml config --quiet

# production build (the Docker builder stage runs build:prod)
NODE_OPTIONS=--max-old-space-size=12288 npm run build:prod
```

---

## 6. Glossary

- **CWE** — Common Weakness Enumeration: canonical ID for a *class* of
  software weakness (e.g. CWE-862).
- **CAPEC** — Common Attack Pattern Enumeration and Classification: the
  *attack* counterpart to CWE (e.g. CAPEC-49 Password Brute Forcing).
- **OWASP Top 10 (2021)** — most prevalent risk categories for web apps
  (A01…A10).
- **OWASP API Security Top 10 (2023)** — API-specific risk catalogue
  (API1 BOLA, API3 BOPLA, API4 Unrestricted Resource Consumption, API5 Broken
  Function Level Authorization, API6 Sensitive Business Flows, API8
  Misconfiguration…).
- **BOLA / BOPLA** — Broken (Object|Property) Level Authorization: accessing
  another user's object/fields.
- **BOPLA vs BFLA** — property-level (read a field you shouldn't) vs
  function-level (call an action you shouldn't).
- **Defense in depth** — independent controls per layer so one bypass isn't
  fatal.
- **Fail-closed / fail-open** — behavior when a security control itself fails.
- **TOFU** — Trust On First Use: bootstrap trust from the first actor (the
  first-account-admin pattern).
- **Revocation latency** — window between a permission change and its global
  effect (caches, tokens, sessions).
