import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer>
      <div className="footer-content">
        <div className="footer-col">
          <div className="footer-logo" style={{ color: 'var(--primary)', fontStyle: 'italic', fontWeight: 900 }}>
            CLOSET SHARE
          </div>
          <p style={{ color: '#606070', fontSize: '0.95rem', lineHeight: '1.7' }}>
            Peer-to-peer premium wardrobe lending marketplace. Rent designer gowns, suits, and sherwanis at a fraction of their retail price.
          </p>
        </div>
        <div className="footer-col">
          <h3>Explore</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.8rem' }}><Link to="/collection" style={{ color: '#606070', textDecoration: 'none' }}>Our Collection</Link></li>
            <li style={{ marginBottom: '0.8rem' }}><Link to="/lend" style={{ color: '#606070', textDecoration: 'none' }}>Lend Wardrobe</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h3>Company</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.8rem' }}><a href="#" style={{ color: '#606070', textDecoration: 'none' }}>About Us</a></li>
            <li style={{ marginBottom: '0.8rem' }}><Link to="/faq" style={{ color: '#606070', textDecoration: 'none' }}>FAQ</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Closet Share. Created with premium peer-to-peer fashion values.</p>
      </div>
    </footer>
  );
};

export default Footer;
