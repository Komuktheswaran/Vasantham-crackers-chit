// k6 load test for the VCW Chit backend.
//
// Run modes (pick one via SCENARIO env var):
//   smoke  — 1 VU for 30s, sanity check that nothing is broken
//   load   — 10 VUs for 2 min, simulates your normal user count
//   stress — ramp 0 → 50 VUs over 5 min, find the breaking point
//   soak   — 5 VUs for 10 min, catch memory leaks / pool exhaustion
//
// Example invocations:
//   k6 run -e SCENARIO=smoke  -e BASE=https://103.38.50.247:100 -e USER=admin -e PASS=yourpass smoke.js
//   k6 run -e SCENARIO=load   -e BASE=http://localhost:5011     -e USER=admin -e PASS=yourpass smoke.js
//   k6 run -e SCENARIO=stress -e BASE=http://localhost:5011     -e USER=admin -e PASS=yourpass smoke.js
//
// IMPORTANT — what this script does NOT do:
//   * Does not call /api/reminders/send  (would spam real WhatsApp)
//   * Does not POST/PUT/DELETE customers or payments (writes pollute prod data)
//   * Does not exceed 50 concurrent VUs (default rate limits / pool size)
// If you want to test write paths, point this at a *staging* DB and uncomment
// the writeFlow() calls at the bottom.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ---------- config from env ----------
const BASE = __ENV.BASE || 'http://localhost:5011';
const USER = __ENV.USER || 'admin';
const PASS = __ENV.PASS || 'admin';
const SCENARIO = __ENV.SCENARIO || 'smoke';

// ---------- scenarios ----------
const SCENARIOS = {
  smoke:  { executor: 'constant-vus', vus: 1,  duration: '30s' },
  load:   { executor: 'constant-vus', vus: 10, duration: '2m'  },
  soak:   { executor: 'constant-vus', vus: 5,  duration: '10m' },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m',  target: 10 },
      { duration: '2m',  target: 30 },
      { duration: '2m',  target: 50 },
      { duration: '30s', target: 0  },
    ],
  },
};

export const options = {
  scenarios: { default: SCENARIOS[SCENARIO] },
  // Pass/fail gates — k6 exits non-zero if any threshold breached.
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{endpoint:customers-list}':         ['p(95)<2000'],
    'http_req_duration{endpoint:scheme-members-paged}':   ['p(95)<2000'],
    'http_req_duration{endpoint:scheme-members-month-filter}': ['p(95)<3000'],
    'http_req_duration{endpoint:schemes-list}':           ['p(95)<2000'],
    'http_req_duration{endpoint:fund-next}':              ['p(95)<500'],
    'http_req_duration{endpoint:customers-search-20}':    ['p(95)<1500'],
    'http_req_duration{endpoint:login}': ['p(95)<2000'],
  },
  // The cert at 103.38.50.247:100 is self-signed; skip verification when testing prod.
  insecureSkipTLSVerify: true,
};

// ---------- custom metrics ----------
const authFailures = new Counter('auth_failures');
const endpoint5xx  = new Counter('endpoint_5xx');

// ---------- one login per VU, token cached in the VU's iteration context ----------
function login() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ username: USER, password: PASS }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login' },
    },
  );
  const ok = check(res, {
    'login 200': r => r.status === 200,
    'login returns token': r => {
      try { return !!(r.json().data?.token || r.json().token); }
      catch { return false; }
    },
  });
  if (!ok) {
    authFailures.add(1);
    return null;
  }
  return res.json().data?.token || res.json().token;
}

// k6 setup() runs once before all VUs start.
// We grab a token here too so the script fails fast on bad credentials.
export function setup() {
  const token = login();
  if (!token) throw new Error('setup login failed — check BASE / USER / PASS');
  return { token };
}

// ---------- the actual user behaviour ----------
// Each iteration simulates a real user opening Customers → Payments → Scheme Members,
// hitting the SAME endpoints the UI fires on mount. This is the load profile that
// matters — paginated 20-row queries (what the old smoke did) hide the real bottlenecks.
export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // ────────── Customers page open (NEW lightweight workload) ──────────
  group('OPEN customers page', () => {
    // The new frontend only fetches a paginated list — no more 5000-row map.
    const a = http.get(`${BASE}/api/customers?page=1&limit=20`, {
      headers, tags: { endpoint: 'customers-list' },
    });
    check(a, { 'customers list 200': r => r.status === 200 });
    if (a.status >= 500) endpoint5xx.add(1);
  });

  sleep(Math.random() * 1 + 0.5);

  // ────────── Payments page open (NEW lightweight workload) ──────────
  group('OPEN payments page', () => {
    // Payments no longer pre-loads any customers — search is on-demand now.
    // Simulating one keystroke search the user typically does:
    const a = http.get(`${BASE}/api/customers?search=A&has_scheme=true&limit=20`, {
      headers, tags: { endpoint: 'customers-search-20' },
    });
    check(a, { 'customers search 200': r => r.status === 200 });
    if (a.status >= 500) endpoint5xx.add(1);

    // O(1) "next fund" lookup
    const b = http.get(`${BASE}/api/payments/fund-next?current=fund/2026/001`, {
      headers, tags: { endpoint: 'fund-next' },
    });
    check(b, { 'fund-next 200': r => r.status === 200 });
    if (b.status >= 500) endpoint5xx.add(1);
  });

  sleep(Math.random() * 1 + 0.5);

  // ────────── Scheme Members page open + month filter ──────────
  group('OPEN scheme-members + apply month filter', () => {
    const a = http.get(`${BASE}/api/schemes/members?page=1&limit=20`, {
      headers, tags: { endpoint: 'scheme-members-paged' },
    });
    check(a, { 'members paged 200': r => r.status === 200 });
    if (a.status >= 500) endpoint5xx.add(1);

    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const b = http.get(
      `${BASE}/api/schemes/members?page=1&limit=20&due_months=${month}`,
      { headers, tags: { endpoint: 'scheme-members-month-filter' } },
    );
    check(b, { 'month-filter 200': r => r.status === 200 });
    if (b.status >= 500) endpoint5xx.add(1);
  });

  sleep(Math.random() * 1 + 0.5);

  // ────────── Schemes page open ──────────
  group('OPEN schemes page', () => {
    const r = http.get(`${BASE}/api/schemes`, {
      headers, tags: { endpoint: 'schemes-list' },
    });
    check(r, { 'schemes 200': res => res.status === 200 });
    if (r.status >= 500) endpoint5xx.add(1);
  });

  // Realistic think-time between user "page visits"
  sleep(Math.random() * 3 + 2);  // 2–5s
}

// ---------- summary printed at the end ----------
export function handleSummary(data) {
  const m = data.metrics;
  const get = k => m[k]?.values || {};
  return {
    stdout: `
================ k6 summary ================
Scenario        : ${SCENARIO}
Total requests  : ${get('http_reqs').count || 0}
Failed requests : ${(get('http_req_failed').rate * 100).toFixed(2)}%
Latency p50     : ${(get('http_req_duration').med || 0).toFixed(0)}ms
Latency p95     : ${(get('http_req_duration')['p(95)'] || 0).toFixed(0)}ms
Latency p99     : ${(get('http_req_duration')['p(99)'] || 0).toFixed(0)}ms
5xx count       : ${get('endpoint_5xx').count || 0}
Auth failures   : ${get('auth_failures').count || 0}
============================================
`,
  };
}
