// Turso Database for Vercel Deployment
import { createClient } from '@libsql/client';

// Create Turso client
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:fastnet.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize database tables
export async function initializeDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration_hours INTEGER NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_ref TEXT UNIQUE NOT NULL,
      flw_ref TEXT,
      phone TEXT NOT NULL,
      amount INTEGER NOT NULL,
      package_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      mac_address TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      expires_at DATETIME,
      FOREIGN KEY (package_id) REFERENCES packages(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      mac_address TEXT NOT NULL,
      ip_address TEXT,
      username TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1,
      bytes_in INTEGER DEFAULT 0,
      bytes_out INTEGER DEFAULT 0,
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      package_id INTEGER NOT NULL,
      is_used INTEGER DEFAULT 0,
      used_by TEXT,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id)
    )
  `);

  // Seed default packages if none exist
  const result = await db.execute('SELECT COUNT(*) as count FROM packages');
  if (result.rows[0].count === 0) {
    await db.execute(`INSERT INTO packages (name, duration_hours, price, description) VALUES ('1 DAY', 24, 1000, '24 Hours unlimited access')`);
    await db.execute(`INSERT INTO packages (name, duration_hours, price, description) VALUES ('3 DAYS', 72, 2500, '72 Hours unlimited access')`);
    await db.execute(`INSERT INTO packages (name, duration_hours, price, description) VALUES ('WEEKLY', 168, 6000, '7 Days unlimited access')`);
    await db.execute(`INSERT INTO packages (name, duration_hours, price, description) VALUES ('MONTHLY', 720, 25000, '30 Days unlimited access')`);
  }
}

// Type definitions
export interface Package {
  id: number;
  name: string;
  duration_hours: number;
  price: number;
  description: string;
  is_active: number;
}

export interface Payment {
  id: number;
  tx_ref: string;
  flw_ref: string | null;
  phone: string;
  amount: number;
  package_id: number;
  status: string;
  mac_address: string | null;
  ip_address: string | null;
  created_at: string;
  paid_at: string | null;
  expires_at: string | null;
}

export interface Session {
  id: number;
  payment_id: number;
  mac_address: string;
  ip_address: string | null;
  username: string;
  started_at: string;
  expires_at: string;
  is_active: number;
}

export interface Voucher {
  id: number;
  code: string;
  package_id: number;
  is_used: number;
  used_by: string | null;
  used_at: string | null;
}

// Package operations
export async function getPackages(): Promise<Package[]> {
  const result = await db.execute('SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC');
  return result.rows as unknown as Package[];
}

export async function getPackageById(id: number): Promise<Package | undefined> {
  const result = await db.execute({ sql: 'SELECT * FROM packages WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as Package | undefined;
}

export async function updatePackage(id: number, data: Partial<Package>): Promise<void> {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];
  await db.execute({ sql: `UPDATE packages SET ${fields} WHERE id = ?`, args: values });
}

// Payment operations
export async function createPayment(data: {
  tx_ref: string;
  phone: string;
  amount: number;
  package_id: number;
  mac_address?: string;
  ip_address?: string;
}): Promise<number> {
  const result = await db.execute({
    sql: `INSERT INTO payments (tx_ref, phone, amount, package_id, mac_address, ip_address) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [data.tx_ref, data.phone, data.amount, data.package_id, data.mac_address || null, data.ip_address || null]
  });
  return Number(result.lastInsertRowid);
}

export async function getPaymentByTxRef(tx_ref: string): Promise<Payment | undefined> {
  const result = await db.execute({ sql: 'SELECT * FROM payments WHERE tx_ref = ?', args: [tx_ref] });
  return result.rows[0] as unknown as Payment | undefined;
}

export async function getPaymentById(id: number): Promise<Payment | undefined> {
  const result = await db.execute({ sql: 'SELECT * FROM payments WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as Payment | undefined;
}

export async function updatePaymentStatus(tx_ref: string, status: string, flw_ref?: string): Promise<void> {
  if (status === 'successful' && flw_ref) {
    const payment = await getPaymentByTxRef(tx_ref);
    if (payment) {
      const pkg = await getPackageById(payment.package_id);
      if (pkg) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + pkg.duration_hours);
        await db.execute({
          sql: `UPDATE payments SET status = ?, flw_ref = ?, paid_at = CURRENT_TIMESTAMP, expires_at = ? WHERE tx_ref = ?`,
          args: [status, flw_ref, expiresAt.toISOString(), tx_ref]
        });
        return;
      }
    }
  }
  await db.execute({
    sql: 'UPDATE payments SET status = ?, flw_ref = ? WHERE tx_ref = ?',
    args: [status, flw_ref || null, tx_ref]
  });
}

export async function getRecentPayments(limit: number = 50): Promise<(Payment & { package_name?: string })[]> {
  const result = await db.execute({
    sql: `SELECT p.*, pkg.name as package_name FROM payments p LEFT JOIN packages pkg ON p.package_id = pkg.id ORDER BY p.created_at DESC LIMIT ?`,
    args: [limit]
  });
  return result.rows as unknown as (Payment & { package_name?: string })[];
}

export async function getPaymentsByStatus(status: string): Promise<Payment[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM payments WHERE status = ? ORDER BY created_at DESC',
    args: [status]
  });
  return result.rows as unknown as Payment[];
}

export async function getTodayStats() {
  const today = new Date().toISOString().split('T')[0];

  const revenue = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'successful' AND DATE(paid_at) = ?`,
    args: [today]
  });

  const totalRevenue = await db.execute(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'successful'`);

  const totalPayments = await db.execute({
    sql: `SELECT COUNT(*) as count FROM payments WHERE DATE(created_at) = ?`,
    args: [today]
  });

  const successfulPayments = await db.execute({
    sql: `SELECT COUNT(*) as count FROM payments WHERE status = 'successful' AND DATE(paid_at) = ?`,
    args: [today]
  });

  const pendingPayments = await db.execute(`SELECT COUNT(*) as count FROM payments WHERE status = 'pending'`);

  const activeSessions = await db.execute(`SELECT COUNT(*) as count FROM sessions WHERE is_active = 1 AND expires_at > CURRENT_TIMESTAMP`);

  return {
    todayRevenue: Number(revenue.rows[0].total),
    totalRevenue: Number(totalRevenue.rows[0].total),
    totalPayments: Number(totalPayments.rows[0].count),
    successfulPayments: Number(successfulPayments.rows[0].count),
    pendingPayments: Number(pendingPayments.rows[0].count),
    activeSessions: Number(activeSessions.rows[0].count)
  };
}

// Session operations
export async function createSession(data: {
  payment_id: number;
  mac_address: string;
  ip_address?: string;
  username: string;
  expires_at: string;
}): Promise<number> {
  const result = await db.execute({
    sql: `INSERT INTO sessions (payment_id, mac_address, ip_address, username, expires_at) VALUES (?, ?, ?, ?, ?)`,
    args: [data.payment_id, data.mac_address, data.ip_address || null, data.username, data.expires_at]
  });
  return Number(result.lastInsertRowid);
}

export async function getActiveSessions(): Promise<Session[]> {
  const result = await db.execute(`SELECT * FROM sessions WHERE is_active = 1 AND expires_at > CURRENT_TIMESTAMP ORDER BY started_at DESC`);
  return result.rows as unknown as Session[];
}

export async function deactivateSession(id: number): Promise<void> {
  await db.execute({ sql: 'UPDATE sessions SET is_active = 0 WHERE id = ?', args: [id] });
}

export async function deactivateExpiredSessions(): Promise<number> {
  const result = await db.execute(`UPDATE sessions SET is_active = 0 WHERE is_active = 1 AND expires_at <= CURRENT_TIMESTAMP`);
  return result.rowsAffected;
}

// Voucher operations
export async function createVoucher(code: string, package_id: number): Promise<number> {
  const result = await db.execute({
    sql: 'INSERT INTO vouchers (code, package_id) VALUES (?, ?)',
    args: [code, package_id]
  });
  return Number(result.lastInsertRowid);
}

export async function getVoucherByCode(code: string): Promise<(Voucher & { package_name?: string; duration_hours?: number }) | undefined> {
  const result = await db.execute({
    sql: `SELECT v.*, p.name as package_name, p.duration_hours FROM vouchers v LEFT JOIN packages p ON v.package_id = p.id WHERE v.code = ?`,
    args: [code]
  });
  return result.rows[0] as unknown as (Voucher & { package_name?: string; duration_hours?: number }) | undefined;
}

export async function redeemVoucher(code: string, mac_address: string): Promise<boolean> {
  const voucher = await getVoucherByCode(code);
  if (!voucher || voucher.is_used) return false;

  await db.execute({
    sql: `UPDATE vouchers SET is_used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?`,
    args: [mac_address, code]
  });

  return true;
}

export function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default db;
