# API Documentation

## Base Information

- **Base URL:** `http://localhost:5000/api` (Development) / `https://api.yourdomain.com/api` (Production)
- **Authentication Method:** Bearer Token (JWT). Most API endpoints require the `Authorization` header to be present with a valid token.

---

## Authorization

**Header format:**
\`\`\`json
{
"Authorization": "Bearer <YOUR_JWT_TOKEN>"
}
\`\`\`

---

## 1. Authentication Endpoints

### Login

- **Method:** `POST`
- **URL:** `/auth/login`
- **Description:** Authenticates a user and returns a JWT token along with user details.
- **Request Headers:**
  - `Content-Type: application/json`
- **Request Body:**
  \`\`\`json
  {
  "username": "admin",
  "password": "securepassword123"
  }
  \`\`\`
- **Success Response (200 OK):**
  \`\`\`json
  {
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
  "id": 1,
  "username": "admin",
  "role": "Admin"
  }
  }
  \`\`\`
- **Error Responses:**
  - `401 Unauthorized`: "Invalid credentials"
  - `400 Bad Request`: "Username and password are required"
- **Example cURL:**
  \`\`\`bash
  curl -X POST http://localhost:5000/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"username": "admin", "password": "securepassword123"}'
  \`\`\`

---

## 2. Customer Endpoints

### Get All Customers

- **Method:** `GET`
- **URL:** `/customers`
- **Description:** Retrieves all registered customers.
- **Request Headers:**
  - `Authorization: Bearer <token>`
- **Request Body:** None
- **Success Response (200 OK):**
  \`\`\`json
  [
  {
  "Customer_ID": "C001",
  "Name": "John Doe",
  "Customer_Code": "JD123",
  "Phone_Number": "9876543210",
  "Area": "Downtown",
  "Customer_Type": "Retail"
  }
  ]
  \`\`\`
- **Error Responses:**
  - `401 Unauthorized`: "Access Denied"
  - `500 Internal Server Error`: "Database error retrieving customers."
- **Example cURL:**
  \`\`\`bash
  curl -X GET http://localhost:5000/api/customers \
   -H "Authorization: Bearer <token>"
  \`\`\`

### Create New Customer

- **Method:** `POST`
- **URL:** `/customers`
- **Description:** Registers a new customer in the system.
- **Request Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body:**
  \`\`\`json
  {
  "Customer_ID": "C002",
  "Name": "Jane Smith",
  "Phone_Number": "9876543211",
  "Address1": "123 Main St",
  "Area": "Uptown",
  "State_ID": 1,
  "District_ID": 5,
  "Customer_Code": "JS456",
  "Customer_Type": "Wholesale"
  }
  \`\`\`
- **Success Response (201 Created):**
  \`\`\`json
  {
  "message": "Customer created successfully!",
  "customerId": "C002"
  }
  \`\`\`
- **Error Responses:**
  - `400 Bad Request`: "Validation error: Missing required fields"
  - `409 Conflict`: "Customer ID or Code already exists"
- **Example cURL:**
  \`\`\`bash
  curl -X POST http://localhost:5000/api/customers \
   -H "Authorization: Bearer <token>" \
   -H "Content-Type: application/json" \
   -d '{"Name":"Jane Smith", "Phone_Number":"9876543211", "Customer_ID":"C002"}'
  \`\`\`

### Update Customer

- **Method:** `PUT`
- **URL:** `/customers/:id`
- **Description:** Updates the details of an existing customer by `Customer_ID`.
- **Request Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body:** (Include only fields to update)
  \`\`\`json
  {
  "Phone_Number": "9998887776",
  "Area": "Suburbs"
  }
  \`\`\`
- **Success Response (200 OK):**
  \`\`\`json
  {
  "message": "Customer updated successfully!"
  }
  \`\`\`
- **Error Responses:**
  - `404 Not Found`: "Customer not found."
- **Example cURL:**
  \`\`\`bash
  curl -X PUT http://localhost:5000/api/customers/C001 \
   -H "Authorization: Bearer <token>" \
   -H "Content-Type: application/json" \
   -d '{"Phone_Number": "9998887776"}'
  \`\`\`

---

## 3. Scheme Management Endpoints

### Get All Schemes

- **Method:** `GET`
- **URL:** `/schemes`
- **Description:** Retrieves a list of all active chit schemes.
- **Request Headers:**
  - `Authorization: Bearer <token>`
- **Request Body:** None
- **Success Response (200 OK):**
  \`\`\`json
  [
  {
  "Scheme_ID": 1,
  "Name": "Diwali Bonanza",
  "Total_Amount": 12000,
  "Amount_per_month": 1000,
  "Period": 12,
  "Month_from": "2024-01-01",
  "Month_to": "2024-12-01",
  "Bonus_Percentage": 5.0
  }
  ]
  \`\`\`
- **Example cURL:**
  \`\`\`bash
  curl -X GET http://localhost:5000/api/schemes \
   -H "Authorization: Bearer <token>"
  \`\`\`

### Create New Scheme

- **Method:** `POST`
- **URL:** `/schemes`
- **Description:** Creates a new monthly payment scheme configuration.
- **Request Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body:**
  \`\`\`json
  {
  "Name": "Pongal Special",
  "Total_Amount": 6000,
  "Amount_per_month": 500,
  "Period": 12,
  "Month_from": "2024-02-01",
  "Month_to": "2025-01-01",
  "Number_of_due": 12,
  "Bonus_Percentage": 3.5,
  "Bonus_Amount": 210
  }
  \`\`\`
- **Success Response (201 Created):**
  \`\`\`json
  {
  "message": "Scheme created successfully",
  "schemeId": 2
  }
  \`\`\`
- **Error Responses:**
  - `400 Bad Request`: "Required scheme details are missing"
- **Example cURL:**
  \`\`\`bash
  curl -X POST http://localhost:5000/api/schemes \
   -H "Authorization: Bearer <token>" \
   -H "Content-Type: application/json" \
   -d '{"Name":"Pongal Special", "Total_Amount":6000, "Amount_per_month":500}'
  \`\`\`

### Assign Scheme to Customer

- **Method:** `POST`
- **URL:** `/customers/:id/schemes`
- **Description:** Enrolls a customer into a specific scheme and generates their due schedule.
- **Request Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body:**
  \`\`\`json
  {
  "Scheme_ID": 1,
  "Join_date": "2024-01-15",
  "Fund_Number": "F-001"
  }
  \`\`\`
- **Success Response (200 OK):**
  \`\`\`json
  {
  "message": "Scheme assigned successfully. Due schedules created."
  }
  \`\`\`
- **Error Responses:**
  - `404 Not Found`: "Customer or Scheme ID does not exist"
- **Example cURL:**
  \`\`\`bash
  curl -X POST http://localhost:5000/api/customers/C001/schemes \
   -H "Authorization: Bearer <token>" \
   -H "Content-Type: application/json" \
   -d '{"Scheme_ID": 1, "Join_date": "2024-01-15", "Fund_Number": "F-001"}'
  \`\`\`

---

## 4. Payment Endpoints

### Process Payment

- **Method:** `POST`
- **URL:** `/payments`
- **Description:** Process an incoming payment for a scheme due. It handles updating `Scheme_Due` records.
- **Request Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body:**
  \`\`\`json
  {
  "Customer_ID": "C001",
  "Scheme_ID": 1,
  "Due_number": 1,
  "Payment_Amount": 1000,
  "Payment_Mode": "Cash",
  "Transaction_Reference": "TX-99238"
  }
  \`\`\`
- **Success Response (200 OK):**
  \`\`\`json
  {
  "message": "Payment recorded successfully",
  "receiptNo": "R-1004"
  }
  \`\`\`
- **Error Responses:**
  - `400 Bad Request`: "Payment amount exceeds due balance"
  - `404 Not Found`: "Matching scheme due not found"

## 5. System Health

### Health Check

- **Method:** `GET`
- **URL:** `/health`
- **Description:** Verifies database connectivity and API health.
- **Request Headers:** None
- **Success Response (200 OK):**
  \`\`\`json
  {
  "status": "OK",
  "db": "Connected",
  "timestamp": "2024-10-25T14:48:00.000Z"
  }
  \`\`\`
