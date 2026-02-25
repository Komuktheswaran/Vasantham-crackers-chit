const axios = require("axios");
const API_URL = "http://localhost:5006/api"; // Adjust port if needed

// Since routes are protected, we need to login or mock auth.
// However, protecting with admin middleware might require a token.
// Let's assume we can get a token or for testing we temporarily bypass or login.
// Let's try to login as admin first.

const runVerification = async () => {
  try {
    console.log("🔄 Starting Transport API Verification...");

    // 1. Login
    let token = null;
    try {
      // You need a valid admin user in DB. Default admin usually: admin/admin123 or from previous context.
      // If fails, we might need manual token or check specific user.
      // Using "admin" "admin123" as common default, adjust if unique.
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        username: "testadmin",
        password: "password123", // Try common test password
      });
      token = loginRes.data.token;
      console.log("✅ Login successful");
    } catch (e) {
      console.warn(
        "⚠️ Login failed (check creds), proceeding without token (might fail if auth strict):",
        e.message,
      );
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // 2. Create Transporter
    const tName = `TestTransporter_${Date.now()}`;
    console.log(`Creating transporter: ${tName}`);
    const createRes = await axios.post(
      `${API_URL}/transporters`,
      {
        Transporter_Name: tName,
        Contact_Person: "Tester",
        Phone_Number: "9998887776",
      },
      { headers },
    );

    const tId = createRes.data.Transporter_ID;
    console.log(`✅ Transporter created with ID: ${tId}`);

    // 3. Add Delivery Point
    console.log("Adding delivery point...");
    const dpRes = await axios.post(
      `${API_URL}/transporters/${tId}/delivery-points`,
      {
        Place_Name: "Test Place",
      },
      { headers },
    );
    console.log(`✅ Delivery Point added: ${dpRes.data.Delivery_Point_ID}`);

    // 4. Fetch All
    console.log("Fetching all transporters...");
    const getAllRes = await axios.get(`${API_URL}/transporters`, { headers });
    const found = getAllRes.data.find((t) => t.Transporter_ID === tId);
    if (found && found.delivery_points && found.delivery_points.length > 0) {
      console.log("✅ Fetched transporter correctly includes delivery points");
    } else {
      console.error("❌ Transporter missing or points missing in fetch all");
    }

    // 5. Cleanup
    console.log("Deleting transporter...");
    await axios.delete(`${API_URL}/transporters/${tId}`, { headers });

    // Verify delete
    try {
      await axios.get(`${API_URL}/transporters/${tId}`, { headers });
      console.error("❌ Transporter still exists after delete");
    } catch (e) {
      if (e.response && e.response.status === 404) {
        console.log("✅ Transporter deleted successfully (404 confirmed)");
      } else {
        console.warn("⚠️ Unexpected error verifying delete:", e.message);
      }
    }

    console.log("🎉 Verification Complete!");
  } catch (error) {
    console.error(
      "❌ Verification Failed:",
      error.response?.data || error.message,
    );
  }
};

runVerification();
