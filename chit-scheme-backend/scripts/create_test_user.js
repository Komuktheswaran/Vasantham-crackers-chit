const { sql, connectDB } = require("../config/database");
const bcrypt = require("bcryptjs");

const createTestUser = async () => {
  try {
    await connectDB();

    const username = "testadmin";
    const password = "password123";
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Check if user exists
    const check = await new sql.Request()
      .input("username", sql.VarChar, username)
      .query("SELECT * FROM Users WHERE Username = @username");

    if (check.recordset.length > 0) {
      console.log("ℹ️ Test user already exists. Updating password...");
      await new sql.Request()
        .input("pass", sql.VarChar, hashedPassword)
        .input("username", sql.VarChar, username)
        .query(
          "UPDATE Users SET Password_Hash = @pass, Role = 'admin' WHERE Username = @username",
        );
      console.log("✅ Test user updated");
    } else {
      console.log("ℹ️ Creating test user...");
      await new sql.Request()
        .input("username", sql.VarChar, username)
        .input("pass", sql.VarChar, hashedPassword)
        .input("fullname", sql.VarChar, "Test Admin")
        .input("role", sql.VarChar, "admin").query(`
                    INSERT INTO Users (Username, Password_Hash, Full_Name, Role) 
                    VALUES (@username, @pass, @fullname, @role)
                `);
      console.log("✅ Test user created");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating test user:", err);
    process.exit(1);
  }
};

createTestUser();
