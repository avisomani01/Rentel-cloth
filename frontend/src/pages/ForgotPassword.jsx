import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.data.success) {
        setMessage(response.data.message || 'OTP sent successfully!');
        const pendingUserId = response.data.pending_user_id;
        setTimeout(() => {
          navigate('/reset-password', { state: { pendingUserId, email } });
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to request reset.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred. Please try again.');
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
        <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.5rem', color: 'var(--primary)', fontFamily: 'var(--font-serif)' }}>Forgot Password</h2>
        <p style={{ textAlign: 'center', color: '#606070', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Enter your registered email to receive an OTP code.
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
            <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
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
            {loading ? 'Sending OTP...' : 'Send Reset OTP'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#606070' }}>
          Remember your password? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
