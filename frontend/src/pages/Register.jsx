import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/register', { username, email, password });
      if (response.data.success) {
        const pendingUserId = response.data.pending_user_id;
        navigate('/verify-otp', { state: { pendingUserId, email } });
      } else {
        setError(response.data.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during registration.');
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
        <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.5rem', color: 'var(--primary)', fontFamily: 'var(--font-serif)' }}>Register</h2>
        <p style={{ textAlign: 'center', color: '#606070', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Create an account to access our wardrobe
        </p>

        {error && (
          <div style={{
            background: 'rgba(255, 77, 77, 0.1)',
            border: '1px solid rgba(255, 77, 77, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem',
            color: '#ff4d4d',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            lineHeight: '1.4',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--card-border)',
                background: 'var(--background)',
                color: 'var(--text)',
                outline: 'none'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: '1.3', marginTop: '0.2rem' }}>
              Must be at least 8 characters, with 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special symbol (@$!%*?&).
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, color: 'white' }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#606070' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
