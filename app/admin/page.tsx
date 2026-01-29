'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
    todayRevenue: number;
    totalRevenue: number;
    totalPayments: number;
    successfulPayments: number;
    pendingPayments: number;
    activeSessions: number;
}

interface Payment {
    id: number;
    tx_ref: string;
    phone: string;
    amount: number;
    status: string;
    package_name?: string;
    created_at: string;
}

interface Session {
    id: number;
    username: string;
    mac_address: string;
    expires_at: string;
    is_active: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
                setPayments(data.recentPayments);
                setSessions(data.activeSessions);
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-UG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatFullDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-UG', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="admin-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="logo" style={{ fontSize: '1.5rem' }}>
                    <span className="fast">FAST</span>
                    <span className="net">NET</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                    WiFi Hotspot
                </p>

                <nav className="sidebar-nav">
                    <a
                        href="#"
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <span>📊</span>
                        Dashboard
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${activeTab === 'payments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payments')}
                    >
                        <span>💰</span>
                        Payments
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <span>👥</span>
                        Users
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${activeTab === 'packages' ? 'active' : ''}`}
                        onClick={() => setActiveTab('packages')}
                    >
                        <span>📦</span>
                        Packages
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <span>⚙️</span>
                        Settings
                    </a>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
                    <Link href="/" className="nav-item">
                        <span>🌐</span>
                        View Portal
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '32px'
                }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Admin Dashboard</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {new Date().toLocaleDateString('en-UG', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <button
                        className="btn"
                        style={{
                            width: 'auto',
                            background: 'var(--bg-glass)',
                            padding: '10px 16px',
                            fontSize: '0.9rem'
                        }}
                        onClick={fetchData}
                    >
                        🔄 Refresh
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Today's Revenue</div>
                        <div className="stat-value green">
                            UGX {stats?.todayRevenue.toLocaleString() || 0}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Active Users</div>
                        <div className="stat-value yellow">
                            {stats?.activeSessions || 0}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Total Revenue</div>
                        <div className="stat-value">
                            UGX {stats?.totalRevenue.toLocaleString() || 0}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Pending</div>
                        <div className="stat-value orange">
                            {stats?.pendingPayments || 0}
                        </div>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    {/* Recent Payments */}
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
                            Recent Payments
                        </h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Phone</th>
                                        <th>Package</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No payments yet
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td>{formatDate(payment.created_at)}</td>
                                                <td>{payment.phone}</td>
                                                <td>{payment.package_name || 'N/A'}</td>
                                                <td>UGX {payment.amount.toLocaleString()}</td>
                                                <td>
                                                    <span className={`badge badge-${payment.status === 'successful' ? 'success' : payment.status === 'pending' ? 'pending' : 'failed'}`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Active Users */}
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
                            Active Users
                        </h2>
                        <div className="session-card">
                            {sessions.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                                    No active users
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px',
                                                background: 'var(--bg-glass)',
                                                borderRadius: 'var(--radius-sm)'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                                    {session.username}
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                    {session.mac_address.slice(0, 11)}...
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="status-active" style={{ fontSize: '0.8rem' }}>
                                                    <span className="status-dot"></span>
                                                    Connected
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                    Exp: {formatFullDate(session.expires_at)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                className="btn btn-outline"
                                style={{ marginTop: '16px', fontSize: '0.85rem', padding: '10px' }}
                            >
                                View All Users
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
