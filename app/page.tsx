'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CalendarDays,
  CalendarRange,
  Phone,
  Ticket,
  Wifi,
  Check,
  Loader2,
  X,
  Smartphone,
  ArrowRight,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

interface Package {
  id: number;
  name: string;
  duration_hours: number;
  price: number;
  description: string;
}

const packageIcons: Record<string, React.ReactNode> = {
  '1 DAY': <Clock size={20} />,
  '3 DAYS': <Calendar size={20} />,
  'WEEKLY': <CalendarDays size={20} />,
  'MONTHLY': <CalendarRange size={20} />
};

const formatDuration = (hours: number): string => {
  if (hours >= 720) return '30 DAYS';
  if (hours >= 168) return '7 DAYS';
  if (hours >= 72) return '72 HRS';
  return `${hours} HRS`;
};

export default function HomePage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [step, setStep] = useState<'select' | 'payment' | 'pending' | 'success'>('select');
  const [phone, setPhone] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [error, setError] = useState('');
  const [txRef, setTxRef] = useState('');
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'pending' && txRef) {
      interval = setInterval(checkPaymentStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [step, txRef]);

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

  const handleSelectPackage = (pkgId: number) => {
    setSelectedPackage(pkgId);
    setStep('payment');
    setError('');
  };

  const handlePayment = async () => {
    if (!selectedPackage || !phone) {
      setError('Please enter your phone number');
      return;
    }

    const phoneRegex = /^(0)?[7][0-8][0-9]{7}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      setError('Please enter a valid Uganda phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/\s/g, ''),
          package_id: selectedPackage
        })
      });

      const data = await res.json();

      if (data.success) {
        setTxRef(data.tx_ref);
        setStep('pending');
      } else {
        setError(data.error || 'Payment initiation failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const res = await fetch(`/api/payment/status?tx_ref=${txRef}`);
      const data = await res.json();

      if (data.status === 'successful') {
        setStep('success');
        setSessionInfo(data.payment);
      } else if (data.status === 'failed') {
        setStep('payment');
        setError('Payment failed. Please try again.');
      }
    } catch (err) {
      console.error('Status check failed:', err);
    }
  };

  const handleVoucher = async () => {
    if (!voucherCode) {
      setError('Please enter a voucher code');
      return;
    }

    setVoucherLoading(true);
    setError('');

    try {
      const res = await fetch('/api/voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode })
      });

      const data = await res.json();

      if (data.success) {
        setStep('success');
        setSessionInfo({
          package_name: data.package_name,
          expires_at: data.expires_at
        });
      } else {
        setError(data.error || 'Invalid voucher code');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setVoucherLoading(false);
    }
  };

  const selectedPkg = packages.find(p => p.id === selectedPackage);

  // Success Screen
  if (step === 'success') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div className="success-icon">
            <Check size={50} color="white" strokeWidth={3} />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>
            Payment Successful!
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
            You are now connected to FASTNET
          </p>

          <div className="session-card" style={{ marginBottom: '24px' }}>
            <div className="session-row">
              <span className="session-label">Package</span>
              <span className="session-value">{sessionInfo?.package_name || 'N/A'}</span>
            </div>
            <div className="session-row">
              <span className="session-label">Expires</span>
              <span className="session-value">
                {sessionInfo?.expires_at ? new Date(sessionInfo.expires_at).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className="session-row">
              <span className="session-label">Status</span>
              <span className="session-value status-active">
                <span className="status-dot"></span>
                Active
              </span>
            </div>
          </div>

          <button
            className="btn btn-success"
            onClick={() => window.location.href = 'https://www.google.com'}
          >
            <Wifi size={20} />
            Start Browsing
          </button>

          <div className="footer" style={{ marginTop: '32px' }}>
            <div className="logo" style={{ justifyContent: 'center', marginBottom: '8px' }}>
              <span className="fast">FAST</span>
              <span className="net">NET</span>
            </div>
            <span>WiFi</span>
          </div>
        </div>
      </main>
    );
  }

  // Pending Payment Screen
  if (step === 'pending') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <Loader2 size={60} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-yellow)' }} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '12px' }}>
            Waiting for Payment
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Please check your phone and enter your PIN to complete the payment
          </p>

          <div className="session-card">
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Transaction Reference
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '4px' }}>
              {txRef}
            </p>
          </div>

          <button
            className="btn btn-outline"
            style={{ marginTop: '24px' }}
            onClick={() => {
              setStep('payment');
              setTxRef('');
            }}
          >
            <X size={18} />
            Cancel
          </button>
        </div>
      </main>
    );
  }

  // Payment Page (Step 2)
  if (step === 'payment' && selectedPkg) {
    return (
      <main style={{ minHeight: '100vh', padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
        {/* Header with Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', paddingTop: '16px' }}>
          <button
            onClick={() => {
              setStep('select');
              setError('');
            }}
            style={{
              background: 'var(--bg-glass)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div className="logo" style={{ justifyContent: 'center', fontSize: '1.5rem' }}>
              <span className="fast">FAST</span>
              <span className="net">NET</span>
            </div>
          </div>
          <div style={{ width: '40px' }}></div>
        </div>

        {/* Selected Package Card */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid var(--accent-yellow)'
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
            Selected Plan
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="package-icon" style={{ background: 'rgba(244, 196, 48, 0.2)' }}>
                {packageIcons[selectedPkg.name] || <Clock size={20} />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedPkg.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {formatDuration(selectedPkg.duration_hours)}
                </div>
              </div>
            </div>
            <div style={{
              background: 'var(--accent-yellow)',
              color: 'var(--text-dark)',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              {selectedPkg.price.toLocaleString()} UGX
            </div>
          </div>
        </div>

        {/* Payment Options Card */}
        <div className="payment-options">
          <h3 className="payment-title">ONLINE PAYMENT OPTIONS</h3>

          {/* Payment Logos */}
          <div className="payment-logos">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#fff',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #e5e5e5'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#e60000',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>A</span>
              </div>
              <span style={{ color: '#333', fontWeight: 600, fontSize: '0.9rem' }}>Airtel</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#fff',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #e5e5e5'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#ffcc00',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: '#000', fontSize: '10px', fontWeight: 'bold' }}>MTN</span>
              </div>
              <span style={{ color: '#333', fontWeight: 600, fontSize: '0.9rem' }}>MoMo</span>
            </div>
          </div>

          {/* Phone Input */}
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <span className="input-icon">
              <Smartphone size={20} color="#666" />
            </span>
            <input
              type="tel"
              placeholder="Enter Phone Number (e.g., 07XX XXX XXX)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Pay Button */}
          <button
            className="btn btn-primary"
            onClick={handlePayment}
            disabled={loading}
            style={{ marginBottom: '20px' }}
          >
            {loading ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Processing...
              </>
            ) : (
              <>
                PAY {selectedPkg.price.toLocaleString()} UGX
                <ArrowRight size={20} />
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '16px 0',
            color: 'var(--text-muted)'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
            <span style={{ fontSize: '0.8rem' }}>OR USE VOUCHER</span>
            <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
          </div>

          {/* Voucher Input */}
          <div className="input-group" style={{ marginBottom: '12px' }}>
            <span className="input-icon">
              <Ticket size={20} color="#666" />
            </span>
            <input
              type="text"
              placeholder="Voucher Code (e.g., 12345678)"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              disabled={voucherLoading}
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <button
            className="btn btn-outline"
            onClick={handleVoucher}
            disabled={voucherLoading || !voucherCode}
            style={{ background: 'white', color: 'var(--text-dark)', border: '2px solid #ddd' }}
          >
            {voucherLoading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Redeeming...
              </>
            ) : (
              'REDEEM VOUCHER'
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--accent-red)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginTop: '16px',
            color: 'var(--accent-red)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <X size={18} />
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="footer" style={{ marginTop: '32px' }}>
          <p>Need Help? Contact Us:</p>
          <div className="contact-info">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={14} /> 0781856006
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={14} /> 0746762393
            </span>
          </div>
        </div>
      </main>
    );
  }

  // Package Selection Page (Step 1)
  return (
    <main style={{ minHeight: '100vh', padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '24px', paddingTop: '16px' }}>
        <div className="logo" style={{ justifyContent: 'center' }}>
          <span className="fast">F</span>
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <span className="fast">A</span>
            <Wifi
              size={16}
              color="var(--accent-yellow)"
              style={{ position: 'absolute', top: '-10px', right: '-8px' }}
            />
          </span>
          <span className="fast">ST</span>
          <span className="net">NET</span>
        </div>
      </div>

      {/* Welcome Text */}
      <h1 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>
        Welcome! Choose Your Internet Plan.
      </h1>

      {/* Package Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="package-card"
            onClick={() => handleSelectPackage(pkg.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="package-info">
              <div className="package-icon">
                {packageIcons[pkg.name] || <Clock size={20} />}
              </div>
              <div>
                <div className="package-name">{pkg.name}</div>
                <div className="package-duration">{formatDuration(pkg.duration_hours)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="package-price">{pkg.price.toLocaleString()} UGX</div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="footer" style={{ marginTop: '48px' }}>
        <p>Need Help? Contact Us:</p>
        <div className="contact-info">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Phone size={14} /> 0781856006
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Phone size={14} /> 0746762393
          </span>
        </div>
      </div>
    </main>
  );
}
