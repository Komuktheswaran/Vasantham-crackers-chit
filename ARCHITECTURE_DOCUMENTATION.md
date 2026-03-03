# Architecture Documentation 🏗️

This document explains the high-level architecture of the Vasantham Crackers Fund Management system, detailing how the frontend, backend, and database interact to provide a seamless experience.

## System Overview

The application follows a standard **3-Tier Architecture**:

1. **Presentation Layer (Frontend):** A Single Page Application (SPA) built with React and Vite. It consumes RESTful APIs to display data and forms.
2. **Business Logic Layer (Backend):** A Node.js and Express server that processes requests, validates business rules (e.g., scheme maturity, payment limits), and handles authentication.
3. **Data Access Layer (Database):** A Microsoft SQL Server (MSSQL) database that ensures data integrity through constraints, foreign keys, and triggers.

---

## Architecture Diagram

The architecture is decoupled. The React Application runs on the client browser and communicates asynchronously with the NodeJS backend over HTTPS.

\`\`\`mermaid
flowchart TD
subgraph Client [Client Tier]
UI[React.js Frontend (SPA)]
Mobile[Mobile Devices]
Desktop[Desktop Browsers]
Mobile --> UI
Desktop --> UI
end

    subgraph API [Application Tier (Node.js/Express)]
        Router[Express Router]
        Auth[Auth Middleware (JWT)]
        Controllers[Business Logic / Controllers]
        Validation[Input Validators]

        UI -- "HTTPS REST (JSON)" --> Router
        Router --> Auth
        Auth --> Validation
        Validation --> Controllers
    end

    subgraph Data [Data Tier (MSSQL)]
        DB[(Chit Schemes DB)]
        Procs[Stored Procedures & Triggers]

        Controllers -- "T-SQL Queries (mssql module)" --> DB
        DB --- Procs
    end

\`\`\`

---

## Data Flow Diagram

Understanding the lifecycle of a request from the user interacting with the UI, to the database, and back.

### Example: Processing a Scheme Payment

\`\`\`mermaid
sequenceDiagram
participant User
participant ReactUI as Frontend (React)
participant Server as Backend API (Express)
participant MSSQL as Database (SQL Server)

    User->>ReactUI: Enters payment amount for Due #3
    ReactUI->>ReactUI: Validates input (amount > 0)
    ReactUI->>Server: POST /api/payments {Customer, Scheme, Amount} + JWT

    Server->>Server: Verifies JWT token
    Server->>Server: Validates request payload against rules

    Server->>MSSQL: Query: Check if Due is already paid
    MSSQL-->>Server: Result: Partially paid

    Server->>Server: Calculates remaining balance

    Server->>MSSQL: UPDATE Scheme_Due SET Recd_amount = ...
    MSSQL-->>Server: Update confirmed

    Server->>MSSQL: INSERT to Audit/Transaction Log
    MSSQL-->>Server: Insert confirmed

    Server-->>ReactUI: 200 OK, {receipt_no, remaining_balance}
    ReactUI-->>User: Shows Success Toast & updates UI table

\`\`\`

---

## Component Interaction

### Frontend State Management

- Built primarily utilizing React Context and Local State (`useState`, `useEffect`).
- Heavy API calls are offloaded to custom Axios interceptors in `services/`, which handle token injection and global 401 (Unauthorized) redirection to the Login page.
- Layouts are managed centrally via a dashboard wrapper, ensuring navigation headers and sidebars are maintained independently of the changing page content.

### Backend Routing & Middleware

- All incoming requests hit `server.js`.
- Security headers are applied via `helmet`.
- Allowed origins are filtered through `cors`.
- `morgan` and custom `auditLogger` middleware record access patterns.
- Requests matching `/api/*` are delegated to specific route files (e.g., `routes/payments.js`).
- Controllers (e.g., `customerController_v2.js`) contain the raw business logic, keeping routes clean.

---

## Scalability and Performance

- **Stateless Authentication:** Using JWT means the backend doesn't need to query session stores for every request, easily allowing the server to scale horizontally.
- **Connection Pooling:** The `mssql` package implements connection pooling to optimize database queries, reducing connection overhead for repetitive tasks.
- **Pagination & Indexing:** Large endpoints (like fetching all scheme members) use optimized SQL queries. Heavily searched columns (`Scheme_ID`, `Customer_ID`, `Phone_Number`) have clustered/non-clustered indexes.
