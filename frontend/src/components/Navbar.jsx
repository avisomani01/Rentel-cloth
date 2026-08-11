import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    setIsOpen(false);
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="Go to Home">
          <img src="/logo.png" alt="3D Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.4))' }} />
        </Link>
      </div>

      <button 
        onClick={toggleMenu} 
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          fontSize: '1.8rem',
          color: 'var(--text)',
          cursor: 'pointer',
          outline: 'none'
        }}
        className="hamburger-btn"
      >
        ☰
      </button>

      <ul className={`nav-links ${isOpen ? 'open' : ''}`} style={{ alignItems: 'center' }}>
        <li><Link to="/" onClick={() => setIsOpen(false)}>Home</Link></li>
        <li><Link to="/collection" onClick={() => setIsOpen(false)}>Collection</Link></li>
        {currentUser && (
          <>
            <li><Link to="/lend" onClick={() => setIsOpen(false)}>Lend Clothes</Link></li>
            <li><Link to="/dashboard" onClick={() => setIsOpen(false)}>Dashboard</Link></li>
          </>
        )}
        <li><Link to="/faq" onClick={() => setIsOpen(false)}>FAQ</Link></li>
        <li>
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background-color 0.3s, transform 0.3s',
              color: 'var(--text)'
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </li>
        <li className="auth-btn">
          {currentUser ? (
            <a href="/logout" onClick={handleLogout} style={{ color: 'var(--secondary)', cursor: 'pointer' }}>Logout</a>
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }} className="mobile-auth-row">
              <Link to="/login" onClick={() => setIsOpen(false)} className="btn btn-outline btn-small" style={{ padding: '0.4rem 1.2rem', borderRadius: '20px' }}>Login</Link>
              <Link to="/register" onClick={() => setIsOpen(false)} className="btn btn-primary" style={{ padding: '0.4rem 1.2rem', borderRadius: '20px', color: 'white', fontSize: '0.8rem' }}>Register</Link>
            </div>
          )}
        </li>
      </ul>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .hamburger-btn {
            display: block !important;
          }
          .nav-links {
            display: none !important;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            background: var(--white);
            border-bottom: 1px solid var(--card-border);
            padding: 2rem 5%;
            gap: 1.5rem !important;
            box-shadow: 0 10px 20px rgba(0,0,0,0.25);
          }
          .nav-links.open {
            display: flex !important;
          }
          .mobile-auth-row {
            flex-direction: column;
            width: 100%;
            gap: 0.75rem !important;
          }
          .mobile-auth-row a {
            text-align: center;
            width: 100%;
          }
        }
      `}} />
    </nav>
  );
};

export default Navbar;
