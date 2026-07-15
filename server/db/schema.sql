-- Khuzdar POS Database Schema

-- Drop tables if they exist (for easy reset/migration)
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS order_item_cutting_lists CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS bank_ledger CASCADE;
DROP TABLE IF EXISTS refund_items CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS purchase_returns CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS payments_vendors CASCADE;
DROP TABLE IF EXISTS payments_customers CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_types CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS banks CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS role_type CASCADE;
DROP TYPE IF EXISTS refund_type CASCADE;
DROP TYPE IF EXISTS ledger_type CASCADE;

-- Create custom types
CREATE TYPE role_type AS ENUM ('Admin', 'Cashier');
CREATE TYPE refund_type AS ENUM ('itemwise', 'bill');
CREATE TYPE ledger_type AS ENUM ('credit', 'debit');

-- Create Tables

-- 1. Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role role_type NOT NULL,
    phone VARCHAR(20),
    cnic VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 2. Categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 3. Products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    quantity_limit INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 4. Salesmen
-- 5. Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    cnic VARCHAR(20),
    address TEXT,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 6. Vendors
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 7. Banks
CREATE TABLE banks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 8. Stock
CREATE TABLE stock (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES vendors(id) ON DELETE RESTRICT,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    barcode VARCHAR(100),
    location VARCHAR(100) NOT NULL, -- e.g. 'Shop'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 9. Orders (Sales Invoices)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    change_due NUMERIC(15, 2) DEFAULT 0.00,
    payment_method_id INT REFERENCES banks(id) ON DELETE SET NULL,
    proof_of_payment VARCHAR(500),
    payment_note TEXT,
    communicate_type VARCHAR(50),
    delivery_type VARCHAR(50),
    delivery_date TIMESTAMP,
    remarks TEXT,
    sale_person VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'refunded', 'partially_refunded'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 10. Order Items
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    quantity NUMERIC(15, 4) NOT NULL DEFAULT 1.0000,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 11. Expense Types
CREATE TABLE expense_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 12. Expenses
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    expense_type_id INT REFERENCES expense_types(id) ON DELETE RESTRICT,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 13. Payments from Customers
CREATE TABLE payments_customers (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE RESTRICT,
    bank_id INT REFERENCES banks(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 14. Payments to Vendors
CREATE TABLE payments_vendors (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES vendors(id) ON DELETE RESTRICT,
    bank_id INT REFERENCES banks(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 15. Purchase Orders (Stock Purchase Invoices)
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES vendors(id) ON DELETE SET NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_qty NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 16. Purchase Order Items
CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INT REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    quantity NUMERIC(15, 4) NOT NULL DEFAULT 1.0000,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 17. Purchase Returns (Returning Stock to Vendors)
CREATE TABLE purchase_returns (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES vendors(id) ON DELETE SET NULL,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    quantity NUMERIC(15, 4) NOT NULL DEFAULT 1.0000,
    cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 18. Refunds
CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    type refund_type NOT NULL,
    total_refunded NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 19. Refund Items
CREATE TABLE refund_items (
    id SERIAL PRIMARY KEY,
    refund_id INT REFERENCES refunds(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 4) NOT NULL DEFAULT 1.0000,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 20. Bank Ledger
CREATE TABLE bank_ledger (
    id SERIAL PRIMARY KEY,
    bank_id INT REFERENCES banks(id) ON DELETE RESTRICT,
    type ledger_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    reference_id INT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 21. User Permissions
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_add BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE(user_id, module)
);

-- 22. Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Indexes for performance & search optimization
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_stock_product_id ON stock(product_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Dynamic Shop Settings
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cutting list rows for order items (marble & granite shop specific)
CREATE TABLE order_item_cutting_lists (
    id SERIAL PRIMARY KEY,
    order_item_id INT REFERENCES order_items(id) ON DELETE CASCADE,
    demand_w NUMERIC(10, 2) NOT NULL,
    demand_l NUMERIC(10, 2) NOT NULL,
    demand_uom VARCHAR(10) NOT NULL, -- 'in' or 'cm'
    demand_qty NUMERIC(10, 2) NOT NULL,
    demand_sqft NUMERIC(10, 4) NOT NULL,
    demand_description VARCHAR(255),
    billing_w NUMERIC(10, 2) NOT NULL,
    billing_l NUMERIC(10, 2) NOT NULL,
    billing_uom VARCHAR(10) NOT NULL, -- 'in' or 'cm'
    billing_qty NUMERIC(10, 2) NOT NULL,
    billing_sqft NUMERIC(10, 4) NOT NULL, -- independently editable
    billing_detail VARCHAR(255),
    wastage_diff NUMERIC(10, 4) NOT NULL
);

CREATE INDEX idx_cutting_lists_order_item_id ON order_item_cutting_lists(order_item_id);
