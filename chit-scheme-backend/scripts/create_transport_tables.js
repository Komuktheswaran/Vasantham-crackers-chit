const { sql, connectDB } = require("../config/database");

const createTables = async () => {
  try {
    await connectDB();

    // Transporters Table
    await new sql.Request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Transporters' and xtype='U')
            BEGIN
                CREATE TABLE Transporters (
                    Transporter_ID INT IDENTITY(1,1) PRIMARY KEY,
                    Transporter_Name NVARCHAR(255) NOT NULL,
                    Contact_Person NVARCHAR(255),
                    Phone_Number NVARCHAR(20) NOT NULL,
                    Created_At DATETIME DEFAULT GETDATE(),
                    Updated_At DATETIME DEFAULT GETDATE()
                );
                PRINT '✅ Transporters table created';
            END
            ELSE
            BEGIN
                PRINT 'ℹ️ Transporters table already exists';
            END
        `);

    // Delivery_Points Table
    await new sql.Request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Delivery_Points' and xtype='U')
            BEGIN
                CREATE TABLE Delivery_Points (
                    Delivery_Point_ID INT IDENTITY(1,1) PRIMARY KEY,
                    Transporter_ID INT NOT NULL,
                    Place_Name NVARCHAR(255) NOT NULL,
                    Created_At DATETIME DEFAULT GETDATE(),
                    Updated_At DATETIME DEFAULT GETDATE(),
                    FOREIGN KEY (Transporter_ID) REFERENCES Transporters(Transporter_ID) ON DELETE CASCADE
                );
                PRINT '✅ Delivery_Points table created';
            END
            ELSE
            BEGIN
                PRINT 'ℹ️ Delivery_Points table already exists';
            END
        `);

    console.log("🎉 Database initialization complete");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating tables:", err);
    process.exit(1);
  }
};

createTables();
