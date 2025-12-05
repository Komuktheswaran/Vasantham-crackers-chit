const { executeQuery } = require('./models/db');

const assignAdminRole = async () => {
  try {
    console.log('🔄 Assigning admin role...\n');

    await executeQuery("UPDATE Users SET Role = 'admin' WHERE Username = 'admin'");
    console.log('✅ Admin role assigned to user "admin"\n');

    console.log('👥 Current users:');
    const users = await executeQuery('SELECT User_ID, Username, Full_Name, Role FROM Users');
    console.table(users);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

assignAdminRole();
