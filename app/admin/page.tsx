'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    CreditCard,
    Users,
    Package as PackageIcon,
    Settings as SettingsIcon,
    Globe,
    RefreshCw,
    Plus,
    Edit,
    Trash2,
    X,
    Save,
    UserX,
    Clock,
    DollarSign,
    Wifi,
    TrendingUp,
    Ticket,
    Copy,
    Check
} from 'lucide-react';

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

interface PackageData {
    id: number;
    name: string;
    duration_hours: number;
    price: number;
    description: string;
    is_active: number;
}

interface Voucher {
    id: number;
    code: string;
    package_id: number;
    package_name: string;
    package_price: number;
    is_used: number;
    used_by: string | null;
    used_at: string | null;
    created_at: string;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [packages, setPackages] = useState<PackageData[]>([]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Modal states
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [voucherForm, setVoucherForm] = useState({ package_id: 0, quantity: 1 });
    const [generatedVouchers, setGeneratedVouchers] = useState<{ code: string; package_name: string; price: number }[]>([]);
    const [editingPackage, setEditingPackage] = useState<PackageData | null>(null);
    const [packageForm, setPackageForm] = useState({ name: '', duration_hours: 0, price: 0, description: '' });

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

    const fetchPackages = async () => {
        try {
            const res = await fetch('/api/packages');
            const data = await res.json();
            if (data.success) {
                setPackages(data.packages);
            }
        } catch (err) {
            console.error('Failed to fetch packages:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'packages') {
            fetchPackages();
        }
        if (activeTab === 'vouchers') {
            fetchVouchers();
            fetchPackages();
        }
    }, [activeTab]);

    const fetchVouchers = async () => {
        try {
            const res = await fetch('/api/admin/vouchers');
            const data = await res.json();
            if (data.success) {
                setVouchers(data.vouchers);
            }
        } catch (err) {
            console.error('Failed to fetch vouchers:', err);
        }
    };

    const generateVouchers = async () => {
        if (!voucherForm.package_id) {
            alert('Please select a package');
            return;
        }
        try {
            const res = await fetch('/api/admin/vouchers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(voucherForm)
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedVouchers(data.vouchers);
                fetchVouchers();
            }
        } catch (err) {
            console.error('Failed to generate vouchers:', err);
        }
    };

    const deleteVoucher = async (id: number) => {
        if (!confirm('Delete this voucher?')) return;
        try {
            const res = await fetch(`/api/admin/vouchers?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchVouchers();
            }
        } catch (err) {
            console.error('Failed to delete voucher:', err);
        }
    };

    const copyToClipboard = (code: string) => {
        // Fallback for non-HTTPS contexts
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code);
        } else {
            // Fallback using textarea
            const textArea = document.createElement('textarea');
            textArea.value = code;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
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

    const disconnectUser = async (sessionId: number) => {
        if (!confirm('Are you sure you want to disconnect this user?')) return;

        try {
            const res = await fetch('/api/admin/users/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });

            if (res.ok) {
                fetchData(); // Refresh data
            }
        } catch (err) {
            console.error('Failed to disconnect user:', err);
        }
    };

    const openPackageModal = (pkg?: PackageData) => {
        if (pkg) {
            setEditingPackage(pkg);
            setPackageForm({
                name: pkg.name,
                duration_hours: pkg.duration_hours,
                price: pkg.price,
                description: pkg.description
            });
        } else {
            setEditingPackage(null);
            setPackageForm({ name: '', duration_hours: 0, price: 0, description: '' });
        }
        setShowPackageModal(true);
    };

    const savePackage = async () => {
        try {
            const method = editingPackage ? 'PUT' : 'POST';
            const body = editingPackage
                ? { ...packageForm, id: editingPackage.id }
                : packageForm;

            const res = await fetch('/api/admin/packages', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowPackageModal(false);
                fetchPackages();
            }
        } catch (err) {
            console.error('Failed to save package:', err);
        }
    };

    const deletePackage = async (id: number) => {
        if (!confirm('Are you sure you want to delete this package?')) return;

        try {
            const res = await fetch(`/api/admin/packages?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchPackages();
            }
        } catch (err) {
            console.error('Failed to delete package:', err);
        }
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
                        <LayoutDashboard size={20} />
                        Dashboard
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${activeTab === 'payments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payments')}
                    >
                        <CreditCard size={20} />
                        Payments
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={20} />
                        Users
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${activeTab === 'packages' ? 'active' : ''}`}
                        onClick={() => setActiveTab('packages')}
                    >
                        <PackageIcon size={20} />
                        Packages
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${activeTab === 'vouchers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('vouchers')}
                    >
                        <Ticket size={20} />
                        Vouchers
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <SettingsIcon size={20} />
                        Settings
                    </a>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
                    <Link href="/" className="nav-item">
                        <Globe size={20} />
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
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {activeTab === 'dashboard' && 'Admin Dashboard'}
                            {activeTab === 'payments' && 'Payment History'}
                            {activeTab === 'users' && 'User Management'}
                            {activeTab === 'packages' && 'Package Management'}
                            {activeTab === 'vouchers' && 'Voucher Management'}
                            {activeTab === 'settings' && 'System Settings'}
                        </h1>
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
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                </div>

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <>
                        {/* Stats Grid */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <DollarSign size={24} className="green" style={{ color: 'var(--accent-green)' }} />
                                    <div className="stat-label">Today's Revenue</div>
                                </div>
                                <div className="stat-value green">
                                    UGX {stats?.todayRevenue.toLocaleString() || 0}
                                </div>
                            </div>
                            <div className="stat-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <Wifi size={24} style={{ color: 'var(--accent-yellow)' }} />
                                    <div className="stat-label">Active Users</div>
                                </div>
                                <div className="stat-value yellow">
                                    {stats?.activeSessions || 0}
                                </div>
                            </div>
                            <div className="stat-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <TrendingUp size={24} style={{ color: 'var(--text-white)' }} />
                                    <div className="stat-label">Total Revenue</div>
                                </div>
                                <div className="stat-value">
                                    UGX {stats?.totalRevenue.toLocaleString() || 0}
                                </div>
                            </div>
                            <div className="stat-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <Clock size={24} style={{ color: 'var(--accent-orange)' }} />
                                    <div className="stat-label">Pending</div>
                                </div>
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
                                                payments.slice(0, 10).map((payment) => (
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
                                                            {session.mac_address.slice(0, 17)}
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
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                    <div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date & Time</th>
                                        <th>Phone Number</th>
                                        <th>Package</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Tx Ref</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                                                No payment records found
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td>{formatFullDate(payment.created_at)}</td>
                                                <td>{payment.phone}</td>
                                                <td>{payment.package_name || 'N/A'}</td>
                                                <td>UGX {payment.amount.toLocaleString()}</td>
                                                <td>
                                                    <span className={`badge badge-${payment.status === 'successful' ? 'success' : payment.status === 'pending' ? 'pending' : 'failed'}`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {payment.tx_ref.slice(0, 12)}...
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>MAC Address</th>
                                        <th>Started At</th>
                                        <th>Expires At</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                                                No active sessions
                                            </td>
                                        </tr>
                                    ) : (
                                        sessions.map((session) => (
                                            <tr key={session.id}>
                                                <td>{session.username}</td>
                                                <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                                    {session.mac_address}
                                                </td>
                                                <td>{formatFullDate(session.expires_at)}</td>
                                                <td>{formatFullDate(session.expires_at)}</td>
                                                <td>
                                                    <span className="badge badge-success">
                                                        Active
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => disconnectUser(session.id)}
                                                        style={{
                                                            background: 'var(--accent-red)',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: 'var(--radius-sm)',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >
                                                        <UserX size={14} />
                                                        Disconnect
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Packages Tab */}
                {activeTab === 'packages' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => openPackageModal()}
                                style={{
                                    width: 'auto',
                                    padding: '12px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Plus size={18} />
                                Add Package
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {packages.map((pkg) => (
                                <div key={pkg.id} className="stat-card" style={{ position: 'relative' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>
                                            {pkg.name}
                                        </h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {pkg.description}
                                        </p>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-yellow)' }}>
                                            UGX {pkg.price.toLocaleString()}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {pkg.duration_hours} hours
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => openPackageModal(pkg)}
                                            style={{
                                                flex: 1,
                                                background: 'var(--bg-glass)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                padding: '8px',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            <Edit size={14} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deletePackage(pkg.id)}
                                            style={{
                                                flex: 1,
                                                background: 'var(--accent-red)',
                                                border: 'none',
                                                padding: '8px',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vouchers Tab */}
                {activeTab === 'vouchers' && (
                    <div>
                        {/* Generate Vouchers Section */}
                        <div className="stat-card" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                                    Generate Vouchers
                                </h2>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                                        Package
                                    </label>
                                    <select
                                        value={voucherForm.package_id}
                                        onChange={(e) => setVoucherForm({ ...voucherForm, package_id: parseInt(e.target.value) })}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            background: 'var(--bg-glass)',
                                            color: 'white',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        <option value={0}>Select Package</option>
                                        {packages.map(pkg => (
                                            <option key={pkg.id} value={pkg.id}>
                                                {pkg.name} - UGX {pkg.price.toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ width: '120px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                                        Quantity
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={voucherForm.quantity}
                                        onChange={(e) => setVoucherForm({ ...voucherForm, quantity: parseInt(e.target.value) || 1 })}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            background: 'var(--bg-glass)',
                                            color: 'white',
                                            fontSize: '0.95rem'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={generateVouchers}
                                    className="btn btn-primary"
                                    style={{ height: '46px' }}
                                >
                                    <Plus size={18} />
                                    Generate
                                </button>
                            </div>

                            {/* Generated Vouchers Display */}
                            {generatedVouchers.length > 0 && (
                                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-green)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--accent-green)' }}>
                                        ✓ Generated {generatedVouchers.length} Voucher(s)
                                    </h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {generatedVouchers.map((v, i) => (
                                            <div
                                                key={i}
                                                onClick={() => copyToClipboard(v.code)}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: 'var(--bg-glass)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontFamily: 'monospace',
                                                    fontSize: '1.1rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                {v.code}
                                                {copiedCode === v.code ? <Check size={16} color="var(--accent-green)" /> : <Copy size={16} />}
                                            </div>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                        Click to copy voucher code
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Vouchers List */}
                        <div className="stat-card">
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>
                                All Vouchers ({vouchers.length})
                            </h2>

                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Package</th>
                                            <th>Price</th>
                                            <th>Status</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vouchers.map(voucher => (
                                            <tr key={voucher.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <code style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600 }}>
                                                            {voucher.code}
                                                        </code>
                                                        <button
                                                            onClick={() => copyToClipboard(voucher.code)}
                                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                        >
                                                            {copiedCode === voucher.code ? <Check size={14} color="var(--accent-green)" /> : <Copy size={14} color="var(--text-muted)" />}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>{voucher.package_name}</td>
                                                <td>UGX {voucher.package_price?.toLocaleString()}</td>
                                                <td>
                                                    <span className={`status-badge ${voucher.is_used ? 'failed' : 'success'}`}>
                                                        {voucher.is_used ? 'Used' : 'Available'}
                                                    </span>
                                                </td>
                                                <td>{formatFullDate(voucher.created_at)}</td>
                                                <td>
                                                    {!voucher.is_used && (
                                                        <button
                                                            onClick={() => deleteVoucher(voucher.id)}
                                                            style={{
                                                                background: 'var(--accent-red)',
                                                                border: 'none',
                                                                padding: '6px 12px',
                                                                borderRadius: 'var(--radius-sm)',
                                                                color: 'white',
                                                                cursor: 'pointer',
                                                                fontSize: '0.8rem'
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {vouchers.length === 0 && (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                                    No vouchers generated yet. Create some above!
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="stat-card" style={{ maxWidth: '600px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '24px' }}>
                            System Configuration
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                    MikroTik Host
                                </label>
                                <input
                                    type="text"
                                    placeholder="192.168.88.1"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        background: 'var(--bg-glass)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                    MikroTik Username
                                </label>
                                <input
                                    type="text"
                                    placeholder="admin"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        background: 'var(--bg-glass)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                    Flutterwave Public Key
                                </label>
                                <input
                                    type="text"
                                    placeholder="FLWPUBK-xxxxx"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        background: 'var(--bg-glass)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px',
                                background: 'var(--bg-glass)',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Demo Mode</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Enable demo mode for testing
                                    </div>
                                </div>
                                <label style={{ cursor: 'pointer' }}>
                                    <input type="checkbox" defaultChecked />
                                </label>
                            </div>

                            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                                <button className="btn btn-primary" style={{ flex: 1 }}>
                                    <Save size={18} />
                                    Save Settings
                                </button>
                                <button className="btn btn-outline" style={{ flex: 1 }}>
                                    <X size={18} />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Package Modal */}
            {showPackageModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="stat-card" style={{ width: '100%', maxWidth: '500px', margin: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                {editingPackage ? 'Edit Package' : 'Add New Package'}
                            </h2>
                            <button
                                onClick={() => setShowPackageModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                                    Package Name
                                </label>
                                <input
                                    type="text"
                                    value={packageForm.name}
                                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                                    placeholder="e.g., DAILY"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        background: 'var(--bg-glass)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                                    Duration (hours)
                                </label>
                                <input
                                    type="number"
                                    value={packageForm.duration_hours}
                                    onChange={(e) => setPackageForm({ ...packageForm, duration_hours: parseInt(e.target.value) })}
                                    placeholder="24"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        background: 'var(--bg-glass)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                                    Price (UGX)
                                </label>
                                <input
                                    type="number"
                                    value={packageForm.price}
                                    onChange={(e) => setPackageForm({ ...packageForm, price: parseInt(e.target.value) })}
                                    placeholder="1000"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        background: 'var(--bg-glass)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                                    Description
                                </label>
                                <textarea
                                    value={packageForm.description}
                                    onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                                    placeholder="Package description"
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        background: 'var(--bg-glass)',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    onClick={savePackage}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                >
                                    <Save size={18} />
                                    {editingPackage ? 'Update' : 'Create'}
                                </button>
                                <button
                                    onClick={() => setShowPackageModal(false)}
                                    className="btn btn-outline"
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
