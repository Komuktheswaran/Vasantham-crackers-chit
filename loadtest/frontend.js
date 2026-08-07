// k6 stress test for the IIS-served frontend bundle.
// Tests that IIS can deliver the SPA's static assets under concurrent load.
//
// Run:
//   k6 run -e SCENARIO=stress -e BASE=https://103.38.50.247 frontend.js
//
// What this catches:
//   - IIS request-queue saturation
//   - TLS handshake bottlenecks
//   - Disk I/O on the static asset folder
// What this does NOT catch:
//   - Slow render / large bundle issues (use the browser test for that)

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE || 'https://103.38.50.247';
const SCENARIO = __ENV.SCENARIO || 'smoke';

const SCENARIOS = {
  smoke:  { executor: 'constant-vus', vus: 1,  duration: '30s' },
  load:   { executor: 'constant-vus', vus: 20, duration: '2m'  },
  soak:   { executor: 'constant-vus', vus: 5,  duration: '10m' },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m',  target: 50  },
      { duration: '2m',  target: 200 },
      { duration: '2m',  target: 500 },
      { duration: '30s', target: 0   },
    ],
  },
};

export const options = {
  scenarios: { default: SCENARIOS[SCENARIO] },
  thresholds: {
    http_req_failed:   ['rate<0.01'],   // <1% failures (static files should be rock-solid)
    http_req_duration: ['p(95)<500'],   // p95 < 500ms (it's just file delivery)
  },
  insecureSkipTLSVerify: true,
};

export default function () {
  // Loading the index.html triggers the browser to fetch the JS/CSS bundle.
  // We simulate this by fetching index.html then any asset URLs it references.
  const indexRes = http.get(`${BASE}/`, { tags: { asset: 'html' } });
  check(indexRes, {
    'index 200': r => r.status === 200,
    'has react root': r => r.body && r.body.includes('id="root"'),
  });

  // Extract asset URLs from the HTML — Vite outputs /assets/index-XXX.js etc.
  const assetMatches = (indexRes.body || '').match(/\/assets\/[^"]+\.(js|css)/g) || [];

  // Fetch each asset (deduped). k6 doesn't follow links automatically.
  const seen = new Set();
  assetMatches.forEach((path) => {
    if (seen.has(path)) return;
    seen.add(path);
    const ext = path.endsWith('.js') ? 'js' : 'css';
    const r = http.get(`${BASE}${path}`, { tags: { asset: ext } });
    check(r, { [`${ext} 200`]: res => res.status === 200 });
  });

  sleep(Math.random() * 3 + 2);  // 2–5s pause (page loads are infrequent)
}
