# Manual Test Checklist

Print this and walk through it. Use a **disposable user account** for the
mutations — don't pollute real data with tests.

**Test fixture conventions:**
- Customer names: `TEST_<your-initials>_<timestamp>` (easy to clean up after)
- Customer codes: `ZZ_TEST_001`, `ZZ_TEST_002`… (sorts to the bottom; greppable)
- Always note which records you created so you can DELETE them after

---

## 0. Pre-flight

- [ ] Backend service is up: `https://103.38.50.247:100/api/health` returns `{"status":"OK"}`
- [ ] Frontend loads at `https://103.38.50.247`
- [ ] Login as admin succeeds
- [ ] No browser console errors on the dashboard

## 1. Login & session

- [ ] Login with correct password → lands on dashboard
- [ ] Login with wrong password → stays on login, shows error
- [ ] Login with empty fields → validation error, no submission
- [ ] Logout button visible in user menu
- [ ] After logout, refreshing a protected page redirects to login
- [ ] Spam-login 11+ times in 15 min → rate limit kicks in (`429 Too Many Login Attempts`)

## 2. Customers

### Read
- [ ] Customer list loads, pagination shows total count
- [ ] No default sort applied on initial load (no arrow icon on any column)
- [ ] Click Cust ID column → sorts ascending; click again → descending; click again → unsorted
- [ ] Search by name narrows results
- [ ] Search input value displays in uppercase as you type
- [ ] Customer Type filter dropdown shows all 7 types; selecting one filters the table
- [ ] Column order is: Cust ID, Cust Code, Name, Phone, Ref Code, Type, Address, Action
- [ ] No "Fund No" column visible
- [ ] No "Fund Number" search input visible

### Write (use disposable data)
- [ ] Add Customer button opens modal with auto-populated Customer_ID
- [ ] Name, Address fields uppercase the input as you type
- [ ] Submitting with required fields creates the customer; success toast appears
- [ ] New customer appears in the list (page back to find it)
- [ ] Edit the test customer → fields pre-populated; save → list shows new value
- [ ] Delete the test customer → confirmation modal; confirm → row gone

### Bulk
- [ ] Sample Excel download works
- [ ] Upload Excel with 1 test row succeeds, customer appears in list
- [ ] **Cleanup**: delete all test rows

## 3. Schemes (Assigned Schemes / Fund Scheme Report)

### Read
- [ ] Page title shows "Fund Scheme Report"
- [ ] Table loads, fund numbers sorted naturally (001 < 002 < ... < 100)
- [ ] Fund Number search filters correctly
- [ ] Scheme filter dropdown works
- [ ] Customer filter dropdown shows results when typing

### New month filter (regression for recent change)
- [ ] Month picker shows last 24 months as options ("Jun 2026", "May 2026"…)
- [ ] Selecting 1 month → table filters to members with unpaid dues that month
- [ ] Selecting 2 months → union of both
- [ ] Clearing the picker → table returns to unfiltered view

### Row selection + targeted send (regression)
- [ ] Each row has a checkbox; clicking selects
- [ ] "Selected: N" counter updates
- [ ] "Send to Selected" button is disabled when no rows selected
- [ ] With rows selected, button is enabled
- [ ] **DO NOT CLICK SEND IN PROD** unless you've confirmed the WhatsApp creds point to a test environment

### Per-row actions
- [ ] Edit Customer button opens the edit modal with that customer's data
- [ ] Set Inactive button shows confirmation, sets status to Inactive (test on a known-test-fixture row only)
- [ ] After deactivating, button changes to Set Active

### Current-month general reminder
- [ ] Button is labelled "Current-Month Reminder (All)"
- [ ] **Do not click in prod** unless cleared with the business

## 4. Payments

### Read
- [ ] Selecting a customer loads their schemes
- [ ] Selecting a scheme loads dues table
- [ ] Searching by fund number resolves correctly
- [ ] Bogus fund number shows a clean error, doesn't crash the page
- [ ] Prev/Next fund navigation buttons work
- [ ] History modal opens, shows payment history

### Download PDF (regression for the autoTable fix)
- [ ] Click "Download PDF" in the history modal
- [ ] PDF downloads (no `n.autoTable is not a function` error)
- [ ] PDF opens, contains: logo, scheme details, table of payments, totals

### Write (use a real test customer in a staging env if possible)
- [ ] Record a small test payment, verify it appears in dues table
- [ ] Edit that payment, change amount → reflects
- [ ] **Cleanup**: delete the test payment row from DB if running on prod

## 5. Auction, Transport, Tracking Order, Reports

Smoke only — each page loads, basic search works, no console errors.

- [ ] Auction page loads
- [ ] Transport page loads
- [ ] Tracking Order page loads
- [ ] Reports page loads

## 6. Downloads

- [ ] Each tab (Customers / Payments / Schemes / Orders) loads
- [ ] Customers download: select a filter, click Preview → table populates
- [ ] Customers download: click Download CSV → file downloads, opens in Excel cleanly
- [ ] Payments download: **From Date** and **To Date** are two separate pickers (regression for the split)
- [ ] Order Downloads: From + To dates also separate pickers
- [ ] Clear Filters resets state

## 7. User Management (admin only)

- [ ] Menu item visible
- [ ] List of users shows
- [ ] Create a test user with role=user; verify can log in
- [ ] Edit role to admin; verify menu items change after re-login
- [ ] **Cleanup**: delete test user

## 8. Audit Logs (admin only, new feature)

- [ ] Menu item "Audit Logs" visible
- [ ] Table loads with recent entries
- [ ] Filter by user, endpoint, method, status — each narrows results
- [ ] From/To date pickers filter correctly
- [ ] Click the eye icon → drawer shows full payload as pretty JSON
- [ ] Status column colour-codes 2xx/4xx/5xx differently

## 9. Cross-cutting checks

- [ ] All text inputs accept lowercase but display uppercase (CSS rule)
- [ ] Forms submit values in uppercase (Customers form, SchemeMembers edit modal verified)
- [ ] Mobile breakpoint: sidebar collapses to hamburger at <768px
- [ ] Browser back button works (doesn't dead-end on a blank page)
- [ ] Token expiry: leave a tab idle 8 hours, then try an action → redirected to login

## 10. After testing — cleanup

- [ ] Delete all test customers, schemes, payments
- [ ] Delete test users
- [ ] Confirm `SELECT COUNT(*) FROM Customer_Master WHERE Customer_Code LIKE 'ZZ_TEST_%'` returns 0
- [ ] Truncate Audit_Logs older than 30 days (or whatever your retention is)
