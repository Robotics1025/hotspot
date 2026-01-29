// Database schema and operations for FASTNET Hotspot Billing
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'fastnet.db');
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration_hours INTEGER NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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
  );

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
  );

  CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    package_id INTEGER NOT NULL,
    is_used INTEGER DEFAULT 0,
    used_by TEXT,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Seed default packages if none exist
const packageCount = db.prepare('SELECT COUNT(*) as count FROM packages').get() as { count: number };
if (packageCount.count === 0) {
    const insertPackage = db.prepare(`
    INSERT INTO packages (name, duration_hours, price, description) VALUES (?, ?, ?, ?)
  `);

    insertPackage.run('1 DAY', 24, 1000, '24 Hours unlimited access');
    insertPackage.run('3 DAYS', 72, 2500, '72 Hours unlimited access');
    insertPackage.run('WEEKLY', 168, 6000, '7 Days unlimited access');
    insertPackage.run('MONTHLY', 720, 25000, '30 Days unlimited access');
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
export function getPackages(): Package[] {
    return db.prepare('SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC').all() as Package[];
}

export function getPackageById(id: number): Package | undefined {
    return db.prepare('SELECT * FROM packages WHERE id = ?').get(id) as Package | undefined;
}

export function updatePackage(id: number, data: Partial<Package>): void {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    db.prepare(`UPDATE packages SET ${fields} WHERE id = ?`).run(...values, id);
}

// Payment operations
export function createPayment(data: {
    tx_ref: string;
    phone: string;
    amount: number;
    package_id: number;
    mac_address?: string;
    ip_address?: string;
}): number {
    const stmt = db.prepare(`
    INSERT INTO payments (tx_ref, phone, amount, package_id, mac_address, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    const result = stmt.run(data.tx_ref, data.phone, data.amount, data.package_id, data.mac_address || null, data.ip_address || null);
    return result.lastInsertRowid as number;
}

export function getPaymentByTxRef(tx_ref: string): Payment | undefined {
    return db.prepare('SELECT * FROM payments WHERE tx_ref = ?').get(tx_ref) as Payment | undefined;
}

export function getPaymentById(id: number): Payment | undefined {
    return db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment | undefined;
}

export function updatePaymentStatus(tx_ref: string, status: string, flw_ref?: string): void {
    if (status === 'successful' && flw_ref) {
        const payment = getPaymentByTxRef(tx_ref);
        if (payment) {
            const pkg = getPackageById(payment.package_id);
            if (pkg) {
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + pkg.duration_hours);

                db.prepare(`
          UPDATE payments 
          SET status = ?, flw_ref = ?, paid_at = CURRENT_TIMESTAMP, expires_at = ?
          WHERE tx_ref = ?
        `).run(status, flw_ref, expiresAt.toISOString(), tx_ref);
                return;
            }
        }
    }
    db.prepare('UPDATE payments SET status = ?, flw_ref = ? WHERE tx_ref = ?').run(status, flw_ref || null, tx_ref);
}

export function getRecentPayments(limit: number = 50): (Payment & { package_name?: string })[] {
    return db.prepare(`
    SELECT p.*, pkg.name as package_name 
    FROM payments p 
    LEFT JOIN packages pkg ON p.package_id = pkg.id
    ORDER BY p.created_at DESC LIMIT ?
  `).all(limit) as (Payment & { package_name?: string })[];
}

export function getPaymentsByStatus(status: string): Payment[] {
    return db.prepare('SELECT * FROM payments WHERE status = ? ORDER BY created_at DESC').all(status) as Payment[];
}

export function getTodayStats() {
    const today = new Date().toISOString().split('T')[0];

    const revenue = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM payments 
    WHERE status = 'successful' AND DATE(paid_at) = ?
  `).get(today) as { total: number };

    const totalRevenue = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM payments 
    WHERE status = 'successful'
  `).get() as { total: number };

    const totalPayments = db.prepare(`
    SELECT COUNT(*) as count 
    FROM payments 
    WHERE DATE(created_at) = ?
  `).get(today) as { count: number };

    const successfulPayments = db.prepare(`
    SELECT COUNT(*) as count 
    FROM payments 
    WHERE status = 'successful' AND DATE(paid_at) = ?
  `).get(today) as { count: number };

    const pendingPayments = db.prepare(`
    SELECT COUNT(*) as count 
    FROM payments 
    WHERE status = 'pending'
  `).get() as { count: number };

    const activeSessions = db.prepare(`
    SELECT COUNT(*) as count 
    FROM sessions 
    WHERE is_active = 1 AND expires_at > CURRENT_TIMESTAMP
  `).get() as { count: number };

    return {
        todayRevenue: revenue.total,
        totalRevenue: totalRevenue.total,
        totalPayments: totalPayments.count,
        successfulPayments: successfulPayments.count,
        pendingPayments: pendingPayments.count,
        activeSessions: activeSessions.count
    };
}

// Session operations
export function createSession(data: {
    payment_id: number;
    mac_address: string;
    ip_address?: string;
    username: string;
    expires_at: string;
}): number {
    const stmt = db.prepare(`
    INSERT INTO sessions (payment_id, mac_address, ip_address, username, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
    const result = stmt.run(data.payment_id, data.mac_address, data.ip_address || null, data.username, data.expires_at);
    return result.lastInsertRowid as number;
}

export function getActiveSessions(): Session[] {
    return db.prepare(`
    SELECT * FROM sessions 
    WHERE is_active = 1 AND expires_at > CURRENT_TIMESTAMP
    ORDER BY started_at DESC
  `).all() as Session[];
}

export function deactivateSession(id: number): void {
    db.prepare('UPDATE sessions SET is_active = 0 WHERE id = ?').run(id);
}

export function deactivateExpiredSessions(): number {
    const result = db.prepare(`
    UPDATE sessions SET is_active = 0 
    WHERE is_active = 1 AND expires_at <= CURRENT_TIMESTAMP
  `).run();
    return result.changes;
}

// Voucher operations
export function createVoucher(code: string, package_id: number): number {
    const stmt = db.prepare('INSERT INTO vouchers (code, package_id) VALUES (?, ?)');
    const result = stmt.run(code, package_id);
    return result.lastInsertRowid as number;
}

export function getVoucherByCode(code: string): (Voucher & { package_name?: string; duration_hours?: number }) | undefined {
    return db.prepare(`
    SELECT v.*, p.name as package_name, p.duration_hours 
    FROM vouchers v 
    LEFT JOIN packages p ON v.package_id = p.id
    WHERE v.code = ?
  `).get(code) as (Voucher & { package_name?: string; duration_hours?: number }) | undefined;
}

export function redeemVoucher(code: string, mac_address: string): boolean {
    const voucher = getVoucherByCode(code);
    if (!voucher || voucher.is_used) return false;

    db.prepare(`
    UPDATE vouchers SET is_used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?
  `).run(mac_address, code);

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
