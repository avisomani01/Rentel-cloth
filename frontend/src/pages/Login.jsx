import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      if (result.needsVerification && result.pendingUserId) {
        navigate('/verify-otp', { state: { pendingUserId: result.pendingUserId, email: username } });
        return;
      }
      setError(result.message);
    }
    setLoading(false);
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
        <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.5rem', color: 'var(--primary)', fontFamily: 'var(--font-serif)' }}>Login</h2>
        <p style={{ textAlign: 'center', color: '#606070', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Access your Closet Share wardrobe
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
            <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Username or Email</label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', marginLeft: 'auto', fontWeight: 600 }}>Forgot Password?</Link>
            </div>
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, color: 'white' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#606070' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
