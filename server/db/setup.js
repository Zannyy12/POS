const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./index');

async function runSetup() {
  console.log('Starting Khuzdar POS Database Setup...');
  
  // 0. Connect to default postgres DB and create khuzdarpos if missing
  const { Client } = require('pg');
  const bootstrapClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres'
  });

  try {
    await bootstrapClient.connect();
    const checkDb = await bootstrapClient.query("SELECT 1 FROM pg_database WHERE datname = 'khuzdarpos'");
    if (checkDb.rowCount === 0) {
      console.log('Database "khuzdarpos" does not exist. Creating database...');
      // CREATE DATABASE cannot run inside a transaction block, so run directly
      await bootstrapClient.query("CREATE DATABASE khuzdarpos");
      console.log('Database "khuzdarpos" created.');
    } else {
      console.log('Database "khuzdarpos" already exists.');
    }
  } catch (err) {
    console.error('Error during database check/creation:', err);
    throw err;
  } finally {
    await bootstrapClient.end();
  }

  const client = await pool.connect();
  try {
    // 1. Read and execute schema
    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema...');
    await client.query(schemaSql);
    console.log('Schema executed successfully.');

    // 2. Hash passwords
    console.log('Hashing passwords...');
    const saltRounds = 12;
    const adminPasswordHash = await bcrypt.hash('1234', saltRounds);
    const cashierPasswordHash = await bcrypt.hash('1234', saltRounds);
    const tariqPasswordHash = await bcrypt.hash('1122', saltRounds);

    console.log('Seeding initial data...');
    
    // Seed Users
    const userRes = await client.query(`
      INSERT INTO users (name, password_hash, role, phone, cnic, address)
      VALUES 
        ('admin', $1, 'Admin', '03102673651', '42101-1234567-1', 'Reliable Tech Office, Karachi'),
        ('cashier', $2, 'Cashier', '03331234567', '42101-7654321-2', 'DHA Karachi'),
        ('tariq shamim', $3, 'Cashier', '03001234567', '42101-1111111-1', 'Karachi')
      RETURNING id, name, role;
    `, [adminPasswordHash, cashierPasswordHash, tariqPasswordHash]);

    const adminId = userRes.rows.find(u => u.name === 'admin').id;
    const cashierId = userRes.rows.find(u => u.name === 'cashier').id;
    const tariqId = userRes.rows.find(u => u.name === 'tariq shamim').id;

    // Seed User Permissions
    const modules = [
      'dashboard', 'users', 'products', 'categories', 'customers', 
      'vendors', 'stock', 'purchase-return', 'expenses', 'invoice', 
      'duplicate-bill', 'sales-view', 'refund', 'banks'
    ];

    for (const mod of modules) {
      // Admin gets full permissions
      await client.query(`
        INSERT INTO user_permissions (user_id, module, can_view, can_add, can_edit, can_delete)
        VALUES ($1, $2, true, true, true, true)
      `, [adminId, mod]);

      // Cashier gets partial permissions
      const cashierCanView = ['dashboard', 'customers', 'vendors', 'stock', 'invoice', 'duplicate-bill', 'refund'].includes(mod);
      const cashierCanAdd = ['invoice', 'refund', 'customers'].includes(mod);
      await client.query(`
        INSERT INTO user_permissions (user_id, module, can_view, can_add, can_edit, can_delete)
        VALUES ($1, $2, $3, $4, false, false)
      `, [cashierId, mod, cashierCanView, cashierCanAdd]);

      await client.query(`
        INSERT INTO user_permissions (user_id, module, can_view, can_add, can_edit, can_delete)
        VALUES ($1, $2, $3, $4, false, false)
      `, [tariqId, mod, cashierCanView, cashierCanAdd]);
    }

    // Seed Categories
    const catRes = await client.query(`
      INSERT INTO categories (name) 
      VALUES ('Electronics'), ('Grocery'), ('Beverages'), ('Stone & Marble') 
      RETURNING id, name;
    `);
    const marbleCatId = catRes.rows.find(c => c.name === 'Stone & Marble').id;

    // Seed Products
    const prodRes = await client.query(`
      INSERT INTO products (name, price, cost, discount, barcode, category_id, quantity_limit)
      VALUES 
        ('Verona Marble Slab', 120.00, 70.00, 0.00, 'MARBLE-001', $1, 10),
        ('Granite Black Pearl', 250.00, 150.00, 0.00, 'GRANITE-001', $1, 10),
        ('Sunny Grey Stone', 95.00, 50.00, 0.00, 'STONE-001', $1, 10)
      RETURNING id, name;
    `, [marbleCatId]);

    const veronaId = prodRes.rows.find(p => p.name === 'Verona Marble Slab').id;
    const graniteId = prodRes.rows.find(p => p.name === 'Granite Black Pearl').id;
    const sunnyId = prodRes.rows.find(p => p.name === 'Sunny Grey Stone').id;

    // Seed Customers (with 0.00 balance initially)
    await client.query(`
      INSERT INTO customers (name, phone, cnic, address, balance)
      VALUES 
        ('Zain Bashir', '03102673651', '42101-1234567-1', 'DHA Phase 6, Karachi', 0.00),
        ('Umar Farooq', '03339876543', '42101-9876543-2', 'Gulshan, Karachi', 0.00),
        ('Walk-in Customer', '03000000000', '00000-0000000-0', 'N/A', 0.00)
    `);

    // Seed Vendors (with 0.00 balance initially)
    const vendorRes = await client.query(`
      INSERT INTO vendors (name, phone, address, balance)
      VALUES 
        ('Nestle Pakistan', '042-111-637853', 'Sheikhupura Road, Punjab', 0.00),
        ('Unilever Pakistan', '021-111-864538', 'Avari Plaza, Karachi', 0.00),
        ('Khuzdar Stone Quarry', '0320-1234567', 'Quetta Road, Khuzdar', 0.00)
      RETURNING id, name;
    `);
    const vendorId = vendorRes.rows.find(v => v.name === 'Khuzdar Stone Quarry').id;

    // Seed Stock (NUMERIC quantities)
    await client.query(`
      INSERT INTO stock (vendor_id, product_id, quantity, price, cost, barcode, location)
      VALUES 
        ($1, $2, 1000.0000, 120.00, 70.00, 'MARBLE-001', 'Shop'),
        ($1, $3, 500.0000, 250.00, 150.00, 'GRANITE-001', 'Shop'),
        ($1, $4, 2000.0000, 95.00, 50.00, 'STONE-001', 'Shop')
    `, [vendorId, veronaId, graniteId, sunnyId]);

    // Seed Banks (with balance initially)
    await client.query(`
      INSERT INTO banks (name, balance)
      VALUES 
        ('Cash in Hand', 100000.00),
        ('Meezan Bank', 250000.00),
        ('HBL', 150000.00)
    `);

    // Seed Expense Types
    await client.query(`
      INSERT INTO expense_types (name)
      VALUES ('Rent'), ('Utility'), ('Salaries'), ('Miscellaneous')
    `);

    // Seed Shop Settings
    await client.query(`
      INSERT INTO settings (key, value)
      VALUES 
        ('shop_name', 'Khuzdar Marble & Granite'),
        ('dealer_under', 'Authorized Stone Dealer'),
        ('parent_company', 'Zannny Parent Stones Ltd.'),
        ('shop_logo', '')
    `);

    // Seed Audit Logs
    await client.query(`
      INSERT INTO audit_logs (user_id, action, details)
      VALUES ($1, 'Database Seed', 'Successfully populated initial empty database state.')
    `, [adminId]);

    console.log('Database Setup & Seeding Completed successfully!');
  } catch (err) {
    console.error('Error executing database setup script:', err);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runSetup().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runSetup;
