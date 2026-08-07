# Chit E2E Tests

Read-only Playwright smoke tests that drive the **deployed** app. Safe to run
against production — every test only reads, never POST/PUT/DELETEs.

## Setup (one-time)

```powershell
cd "D:\React Dev\chit\tests\e2e"
npm install
npx playwright install chromium
```

## Run

```powershell
# Headless against the deployed prod URL
npm test

# Watch it run in a real browser
npm run test:headed

# Interactive UI mode (best for debugging)
npm run test:ui

# After a run, open the HTML report
npm run report
```

## Configuration

Environment variables (all optional):

| Var | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://103.38.50.247` | Frontend URL under test |
| `E2E_USER` | `admin` | Login username |
| `E2E_PASS` | `admin123` | Login password |

```powershell
$env:BASE_URL = "https://103.38.50.247"
$env:E2E_USER = "loadtest"
$env:E2E_PASS = "loadtest123"
npm test
```

## What the suite covers

- **01-auth** — login with valid + invalid credentials.
- **02-pages-render** — every menu page loads, headings render, tables fetch
  data, no console errors, no 5xx responses.
- **03-key-flows** — read-only regression for the recent changes:
  - Customer search + Customer Type filter still work
  - SchemeMembers multi-month picker shows 24 months
  - SchemeMembers row-selection enables "Send to Selected"
  - Payments page handles a bogus fund-number lookup gracefully
  - Audit Logs page loads with filter inputs

## What this suite does NOT cover

Write operations:
- Creating / editing / deleting customers
- Assigning schemes
- Recording payments
- Sending WhatsApp messages
- Bulk upload (Excel)
- Anything that hits POST/PUT/DELETE

Those are listed in `MANUAL_CHECKLIST.md` — run them by hand or only in a staging environment.
