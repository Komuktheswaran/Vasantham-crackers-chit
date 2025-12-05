const bcrypt = require('bcryptjs');
const { executeQuery } = require('./models/db');

const resetPassword = async () => {
  try {
    console.log('🔍 Checking current user...\n');
    
    const users = await executeQuery('SELECT User_ID, Username, Password_Hash, Role FROM Users');
    console.table(users);
    
    // Hash a new password
    const newPassword = 'admin123';
    const newHash = bcrypt.hashSync(newPassword, 10);
    
    console.log('\n🔐 Resetting admin password...');
    console.log('New password:', newPassword);
    console.log('New hash:', newHash);
    
    await executeQuery(
      "UPDATE Users SET Password_Hash = @hash WHERE Username = 'admin'",
      [{ name: 'hash', value: newHash, type: require('mssql').VarChar }]
    );
    
    console.log('\n✅ Password reset successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\nℹ️  You can now login and create other users.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

resetPassword();
