const { executeQuery } = require('./models/db');

const runMigration = async () => {
  try {
    console.log('🔄 Adding Role column to Users table...\n');

    // Step 1: Add Role column
    await executeQuery(`ALTER TABLE Users ADD Role VARCHAR(20) DEFAULT 'user' NOT NULL`);
    console.log('✅ Role column added successfully');

    // Step 2: Add check constraint
    await executeQuery(`ALTER TABLE Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('admin', 'user'))`);
    console.log('✅ Check constraint added successfully\n');

    // Verify the migration
    console.log('📋 Users table structure:');
    const columns = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(columns);

    console.log('\n👥 Existing users (all default to "user" role):');
    const users = await executeQuery('SELECT User_ID, Username, Full_Name, Role, Created_At FROM Users');
    console.table(users);

    console.log('\n💡 To assign admin role to a user, run:');
    console.log('   UPDATE Users SET Role = \'admin\' WHERE Username = \'your_username\';\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists') || error.message.includes('already an object')) {
      console.log('ℹ️  Role column may already exist');
    }
  }
};

runMigration();
