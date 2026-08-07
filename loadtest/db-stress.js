// Direct database stress test — bypasses Node/Express entirely and hits MSSQL
// through the same connection pool the app uses.
//
// Run from chit-scheme-backend so it picks up .env and config/database.js:
//   cd D:\React Dev\chit\chit-scheme-backend
//   node ..\loadtest\db-stress.js                  # default: load profile
//   node ..\loadtest\db-stress.js smoke
//   node ..\loadtest\db-stress.js stress
//
// What it does: runs each of the heavy app queries N times with C parallel
// connections, prints per-query latency percentiles. If these numbers are
// FAST and the API test is slow, the bottleneck is Node — not the DB.
// If these are slow too, fix the SQL.

require('dotenv').config();
const { executeQuery } = require('../chit-scheme-backend/models/db');

const PROFILES = {
  smoke:  { iterations: 20,   parallel: 1  },
  load:   { iterations: 200,  parallel: 10 },
  stress: { iterations: 1000, parallel: 30 },
  // Soak = sustained moderate load. ~10 minutes if each query is ~50ms.
  soak:   { iterations: 6000, parallel: 5  },
};
const profile = PROFILES[process.argv[2]] || PROFILES.load;

// Each query mirrors what the API actually runs. Use the unparameterised form
// for simplicity — the goal is timing, not correctness.
const QUERIES = [
  {
    name: 'customers-list (page 1)',
    sql: `
      SELECT TOP 20 c.Customer_ID, c.Customer_Code, c.Name, c.Phone_Number
      FROM Customer_Master c
      ORDER BY c.Created_At DESC
    `,
  },
  {
    name: 'scheme-members (no filter)',
    sql: `
      SELECT TOP 20 sm.Fund_Number, c.Name, cm.Name as Scheme_Name
      FROM Scheme_Members sm
      JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
      JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID
    `,
  },
  {
    name: 'scheme-members (unpaid this month EXISTS)',
    sql: `
      SELECT TOP 20 sm.Fund_Number, c.Name
      FROM Scheme_Members sm
      JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
      WHERE EXISTS (
        SELECT 1 FROM Scheme_Due sd
        WHERE sd.Fund_Number = sm.Fund_Number
          AND (sd.Recd_amount IS NULL OR sd.Recd_amount < sd.Due_amount)
          AND FORMAT(sd.Due_date, 'yyyy-MM') = FORMAT(GETDATE(), 'yyyy-MM')
      )
    `,
  },
  {
    name: 'audit-logs-list (paged)',
    sql: `
      SELECT TOP 50 User_Name, Action_Type, Endpoint, Status_Code, Timestamp
      FROM Audit_Logs
      ORDER BY Timestamp DESC
    `,
  },
  {
    // *** THE SUSPECTED CULPRIT — what Customers/Payments page fires on mount ***
    name: 'scheme-members 5000 (Customers/Payments page mount)',
    sql: `
      SELECT TOP 5000
        sm.Fund_Number, sm.Status, sm.Join_date,
        c.Customer_ID, c.Customer_Code, c.Name AS Customer_Name, c.Phone_Number,
        cm.Scheme_ID, cm.Name AS Scheme_Name, cm.Amount_per_month,
        cm.Month_from, cm.Month_to, cm.Total_Amount, cm.Bonus_Amount
      FROM Scheme_Members sm
      JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
      JOIN Chit_Master    cm ON sm.Scheme_ID    = cm.Scheme_ID
      ORDER BY sm.Fund_Number
    `,
  },
  {
    name: 'customers has_scheme=true 1000 (Payments page mount)',
    sql: `
      SELECT TOP 1000 c.Customer_ID, c.Customer_Code, c.Name, c.Phone_Number
      FROM Customer_Master c
      WHERE EXISTS (SELECT 1 FROM Scheme_Members sm WHERE sm.Customer_ID = c.Customer_ID)
      ORDER BY c.Customer_ID DESC
    `,
  },
];

const pct = (arr, p) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
};

async function runOne(q) {
  const start = Date.now();
  await executeQuery(q.sql, []);
  return Date.now() - start;
}

async function runQuery(q, iterations, parallel) {
  console.log(`\n▶ ${q.name}  (n=${iterations}, parallel=${parallel})`);
  const samples = [];
  let inflight = 0;
  let done = 0;
  let failed = 0;
  const start = Date.now();
  await new Promise((resolve) => {
    const dispatch = () => {
      while (inflight < parallel && done + inflight < iterations) {
        inflight++;
        runOne(q)
          .then((ms) => samples.push(ms))
          .catch(() => failed++)
          .finally(() => {
            inflight--;
            done++;
            if (done >= iterations) resolve();
            else dispatch();
          });
      }
    };
    dispatch();
  });
  const totalSec = (Date.now() - start) / 1000;
  console.log(
    `   ✓ ${samples.length} ok / ${failed} failed   ` +
    `p50=${pct(samples, 0.5)}ms  p95=${pct(samples, 0.95)}ms  p99=${pct(samples, 0.99)}ms  ` +
    `throughput=${(samples.length / totalSec).toFixed(1)}/s`,
  );
}

(async () => {
  console.log(`\n=== DB stress: profile=${process.argv[2] || 'load'} ===`);
  for (const q of QUERIES) await runQuery(q, profile.iterations, profile.parallel);
  console.log('\nDone. Note: numbers exclude Node/Express/JSON overhead.');
  process.exit(0);
})().catch((err) => {
  console.error('DB stress failed:', err.message);
  process.exit(1);
});
