require('dotenv').config({ path: '../.env' }); // Load .env from root
const { executeQuery } = require('../models/db');
const bcrypt = require('bcryptjs');

const checkLogin = async () => {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.log('Usage: node scripts/debug_login.js <username> <password>');
    process.exit(1);
  }

  console.log(`Checking login for user: '${username}'...`);

  try {
    // 1. Check if user exists
    const users = await executeQuery(
      'SELECT User_ID, Username, Password_Hash, Full_Name, Role FROM Users WHERE Username = @username',
      [{ name: 'username', value: username, type: require('mssql').VarChar }]
    );

    if (users.length === 0) {
      console.log('❌ User NOT found in database.');
      return;
    }

    const user = users[0];
    console.log(`✅ User found: ID=${user.User_ID}, Role=${user.Role}, Hash=${user.Password_Hash.substring(0, 10)}...`);

    // 2. Check password
    const isMatch = bcrypt.compareSync(password, user.Password_Hash);
    if (isMatch) {
      console.log('✅ Password match! Login should succeed.');
    } else {
      console.log('❌ Password mismatch. The provided password does not match the stored hash.');
      console.log('   Provided password:', password);
      console.log('   Stored hash:', user.Password_Hash);
    }

  } catch (error) {
    console.error('Error during check:', error);
  }
};

checkLogin();
