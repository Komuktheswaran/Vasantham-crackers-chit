# Developer Guide 💻

Welcome to the development team! This guide covers our conventions, how to contribute to the project, and how to troubleshoot common issues.

## 1. How to add a new API Endpoint

When adding a new feature that requires a backend endpoint:

1. **Define the Route:** Add the route in the appropriate file inside `chit-scheme-backend/routes/`.
   - _Example:_ If adding a feature to block customers, edit `routes/customers.js`.
   - \`router.post('/:id/block', blockCustomer);\`
2. **Create the Controller:** Implement the logic in `chit-scheme-backend/controllers/`.
   - Export the function (`blockCustomer`).
   - Use `try...catch` blocks to handle async Database operations.
   - Return clean JSON formatted error messages on catch.

3. **Add Validation:** If the endpoint accepts a payload, add rules to `middleware/validators.js`.
   - \`router.post('/:id/block', blockValidation, blockCustomer);\`

4. **Test with Postman/cURL:** Verify the endpoint works and handles errors elegantly.

## 2. How to add a new Database Table

1. **Plan the Schema:** Determine column types and Foreign Key relationships. Add it to `DATABASE_SCHEMA.md`.
2. **Create a Migration Script:** Inside `chit-scheme-backend/migrations/`, create a new `.sql` file (e.g., `create_table_rewards.sql`).
   \`\`\`sql
   CREATE TABLE Scheme_Rewards (
   Reward_ID INT IDENTITY(1,1) PRIMARY KEY,
   Scheme_ID INT FOREIGN KEY REFERENCES Chit_Master(Scheme_ID),
   Reward_Name VARCHAR(255) NOT NULL
   );
   \`\`\`
3. **Execute:** Run the script against the `chitschemes` database in SSMS.
4. **Update DB Models:** The application uses raw queries via the `mssql` package. You don't need to rebuild an ORM; simply write standard `INSERT`/`SELECT` queries in the relevant controllers.

## 3. Code Style Guide

- **Frontend (React):**
  - Use Functional Components and Hooks. Avoid Class components.
  - Follow the existing Ant Design component structures for UI consistency.
  - Keep components modular. If a page gets too large, break it down into `components/`.
- **Backend (Node):**
  - Use `camelCase` for variable and function names.
  - Enforce `const` over `let` wherever possible.
  - Prefix SQL variables clearly in queries (e.g. `@CustomerId`).

## 4. Git Branching Strategy

We follow a simplified **Trunk-Based Development** model.

- **main:** Production-ready code. Commits here trigger CI/CD to production.
- **development:** Stable development branch. Features merge here first.
- **feature/branch-name:** Create branch off `development`. (e.g., `feature/payment-gateway`).
- **bugfix/bug-name:** For critical fixes (e.g., `bugfix/admin-login-crash`).

\`\`\`bash

# Creating a new feature

git checkout development
git pull origin development
git checkout -b feature/awesome-new-feature
\`\`\`

## 5. How to Run Tests

### Frontend (E2E Tests via Playwright)

\`\`\`bash
cd chit-scheme-frontend
npm run test:e2e
\`\`\`
Use this to verify critical user journeys (Login, Scheme Creation, Payment Flow).

### Backend (Unit/Integration Tests)

\`\`\`bash
cd chit-scheme-backend
npm test
\`\`\`
Tests are written using Jest and Supertest. All controllers have adjacent test suites (e.g., in the `tests/` directory or alongside files).

## 6. Common Errors & Solutions

| Error                                                     | Cause                                               | Solution                                                                       |
| --------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `ConnectionError: Failed to connect to localhost:1433`    | MSSQL service is not running or TCP/IP is disabled. | Open SQL Server Configuration Manager -> Enable TCP/IP -> Restart SQL Service. |
| `Status 401 Unauthorized`                                 | JWT token expired or missing.                       | Clear localStorage on frontend and login again.                                |
| `TypeError: Cannot read properties of undefined` in React | State hasn't loaded before component render.        | Add optional chaining (`user?.name`) or a loading spinner state.               |
| `CORS policy blocked access`                              | Frontend URL not in backend `.env`                  | Add `http://localhost:5173` to `ALLOWED_ORIGINS`.                              |
