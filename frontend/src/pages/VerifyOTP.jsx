import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  
  const pendingUserId = location.state?.pendingUserId;
  const email = location.state?.email || 'your email';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (!pendingUserId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '100px 20px' }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '3rem 2rem', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: 'var(--card-shadow)' }}>
          <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>No Active Session</h2>
          <p style={{ color: '#606070', marginBottom: '2rem' }}>Please register or login to request an OTP code.</p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block', borderRadius: '30px', color: 'white' }}>Go to Login</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await api.post('/auth/verify-otp', { otp, pending_user_id: pendingUserId });
      if (response.data.success) {
        setSuccessMsg(response.data.message);
        setCurrentUser(response.data.user);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setSuccessMsg('');
    setResendLoading(true);

    try {
      const response = await api.post('/auth/resend-otp', { pending_user_id: pendingUserId });
      if (response.data.success) {
        setSuccessMsg(response.data.message || 'A new OTP has been sent to your email.');
        setCooldown(60);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '100px 20px' }} className="page-fade-in">
      <div style={{ background: 'var(--white)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '3rem 2rem', maxWidth: '450px', width: '100%', boxShadow: 'var(--card-shadow)', backdropFilter: 'blur(12px)' }}>
        <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.5rem', color: 'var(--primary)', fontFamily: 'var(--font-serif)' }}>Verify OTP</h2>
        <p style={{ textAlign: 'center', color: '#606070', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Enter the 6-digit OTP code sent to <strong>{email}</strong>. It is valid for 5 minutes.
        </p>

        {error && (
          <div style={{ background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)', borderRadius: '8px', padding: '0.75rem', color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(0, 194, 168, 0.08)', border: '1px solid rgba(0, 194, 168, 0.2)', borderRadius: '8px', padding: '0.75rem', color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', fontWeight: 600 }}>6-Digit Code</label>
            <input
              type="text"
              maxLength="6"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--card-border)',
                background: 'var(--background)',
                color: 'var(--text)',
                outline: 'none',
                fontSize: '1.5rem',
                textAlign: 'center',
                letterSpacing: '5px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, color: 'white' }}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resendLoading}
            style={{
              background: 'transparent',
              border: 'none',
              color: cooldown > 0 ? '#888' : 'var(--primary)',
              cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {resendLoading ? 'Resending...' : cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
