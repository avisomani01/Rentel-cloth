import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{ paddingTop: '150px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', padding: '20px' }}>
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '4rem 2rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3rem', color: 'var(--accent-color)', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>404</h2>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Page Not Found</h3>
        <p style={{ color: '#a0a0a0', marginBottom: '2.5rem' }}>The page or collection you are looking for does not exist.</p>
        <Link to="/" className="btn btn-primary" style={{ borderRadius: '12px' }}>Return Home</Link>
      </div>
    </div>
  );
};

export default NotFound;
