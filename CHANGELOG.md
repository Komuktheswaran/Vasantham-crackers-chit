# Changelog 📝

All notable changes to the **Vasantham Crackers Fund Management** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

---

## [v1.0.0] - Initial Release

### Added

- **Authentication & Security:**
  - Secure JWT-based login system for Admin and Staff roles.
  - Implemented `Helmet.js` and custom CORS policies for robust API security.
  - Added request rate limiting to prevent brute-force attacks.

- **Customer Management System:**
  - Full CRUD operations to register and manage customers.
  - Robust search algorithms to find customers by Name, Phone, or ID.
  - Ability to categorize customers into geographical delivery zones.

- **Chit Scheme Engine:**
  - Dynamic creation of scheme periods, due sizes, and bonus percent calculations.
  - Association linking engine to tie users to specific schemes with individual Fund Numbers.
  - Automated generation of expected monthly due records.

- **Payment & Accounting Flow:**
  - Digital ledger to record installments and issue receipts.
  - Ability to handle partial payments and track outstanding balances.
  - Real-time aggregation of collected funds versus expected targets.

- **Logistics & Order Tracking:**
  - Transporter Master configuration module.
  - Tracking system for mature schemes to monitor shipping and delivery statuses.
  - Integrated status pipelines (Pending ➔ Packed ➔ Dispatched ➔ Delivered).

- **Analytics & Export Dashboard:**
  - Visual summary dashboard using Recharts for quick insight into business health.
  - Universal CSV/Excel export utility for Offline data processing.

### Security

- Passwords are deeply hashed using `bcrypt` before database ingestion.
- Strict input validation middleware configured on all data-mutation API endpoints to prevent SQL Injection arrays.
