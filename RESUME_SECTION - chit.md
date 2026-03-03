# Resume Section: Vasantham Crackers Fund Management

_When formatting this on your resume, combine or pick the bullet points that best fit the role you are applying for. The notes below are written in a natural, conversational tone so you don't sound like a robot during interviews._

### D. One-liner for Resume Header

**Full-stack chit fund platform managing member cycles, automated dues, and logistics tracking**

---

### A. Project Summary

This started as an internal tool to help our family's seasonal cracker business handle the chaotic math of chit funds, but it quickly grew into a full platform that now manages hundreds of customers and their monthly dues. I built the entire system from the ground up, moving us away from messy Excel sheets into a role-based web app that handles everything from tracking partial cash payments to assigning delivery branches for final payouts.

---

### B. Key Contributions

- Designed the entire DB schema from scratch — 8 interconnected tables handling the complex calculations for scheme maturities, bonus percentages, and customer tracking.
- Built a custom due-calculation engine that automatically generates monthly payment schedules when a user joins a scheme, completely removing manual ledger entries.
- The JWT auth flow took me a few iterations to get right, but the final version now safely manages distinct Admin and Staff roles with custom CORS policies to block unauthorized API hits.
- Engineered a flexible payment tracking system that handles difficult edge cases, like when a customer makes a partial cash payment across multiple different outstanding dues.
- Created an interactive logistics dashboard that maps mature funds to specific transporters and delivery points, cutting down order mix-ups during the busy season.
- Optimized the React frontend with Ant Design to handle dense data tables, making it lightning fast to search through hundreds of active scheme members by name or phone.

---

### C. Tech Highlights

- **React (Vite) & Ant Design:** Built a snappy, data-dense SPA that our staff actually enjoys using for daily entry.
- **Node.js & Express:** Wrote the core REST API layer with over 30 endpoints covering the full business workflow and custom validation.
- **Microsoft SQL Server:** Structured complex relational data and optimized queries to handle real-time aggregate reporting for the dashboard.
- **JWT & Helmet.js:** Locked down the API against brute-force attacks and unauthorized access by securing HTTP headers and enforcing stateless authentication.

---

### E. Interview Talking Points (Notes to Self)

- _Talk about the challenge of handling partial payments._ It was really tricky to figure out the logic when a customer hands over 1,500 rupees but owes 1,000 for January and 1,000 for February. I had to write the backend to gracefully split the receipt and leave a 500 balance on the second due.
- _Mention how I restructured the customer schema mid-project._ Early on, I realized linking a customer strictly to one scheme broke down when they wanted to buy two tickets. I had to extract the `Scheme_Members` table to allow many-to-many relationships without breaking the existing data.
- _Bring up the "real world" constraints._ Explain that our users aren't highly technical, so I spent a lot of time polishing the React UI to make error messages incredibly clear and preventing double-clicks from charging a payment twice.
