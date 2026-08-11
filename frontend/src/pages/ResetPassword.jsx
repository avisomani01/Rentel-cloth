import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const pendingUserId = location.state?.pendingUserId;
  const email = location.state?.email || 'your email';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!pendingUserId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '100px 20px' }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '3rem 2rem', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: 'var(--card-shadow)' }}>
          <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>No Active Session</h2>
          <p style={{ color: '#606070', marginBottom: '2rem' }}>Please start the forgot password recovery flow first.</p>
          <Link to="/forgot-password" className="btn btn-primary" style={{ display: 'inline-block', borderRadius: '30px', color: 'white' }}>Forgot Password</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        otp,
        new_password: newPassword,
        pending_user_id: pendingUserId
      });

      if (response.data.success) {
        setMessage(response.data.message || 'Password reset successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '100px 20px',
      background: 'var(--background)'
    }} className="page-fade-in">
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--card-border)',
        borderRadius: '24px',
        padding: '3rem 2rem',
        maxWidth: '450px',
        width: '100%',
        boxShadow: 'var(--card-shadow)',
        backdropFilter: 'blur(12px)'
      }}>
        <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.5rem', color: 'var(--primary)', fontFamily: 'var(--font-serif)' }}>Reset Password</h2>
        <p style={{ textAlign: 'center', color: '#606070', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Enter the OTP code sent to <strong>{email}</strong> and configure your new password.
        </p>

        {error && (
          <div style={{ background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)', borderRadius: '8px', padding: '0.75rem', color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ background: 'rgba(0, 194, 168, 0.08)', border: '1px solid rgba(0, 194, 168, 0.2)', borderRadius: '8px', padding: '0.75rem', color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>6-Digit OTP Code</label>
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
                textAlign: 'center',
                letterSpacing: '3px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--card-border)',
                background: 'var(--background)',
                color: 'var(--text)',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, color: 'white' }}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#606070' }}>
          Back to <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
