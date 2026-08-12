import React from 'react';

const HeroThreeDViewer = () => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      boxSizing: 'border-box'
    }}>
      <img 
        src="/images/gown_tuxedo.png" 
        alt="Luxury Burgundy Evening Gown and Tailored Black Tuxedo" 
        style={{
          maxHeight: '95%',
          maxWidth: '95%',
          objectFit: 'contain',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 50px rgba(139,124,255,0.15)',
          border: '1px solid rgba(255,255,255,0.06)'
        }}
      />
    </div>
  );
};

export default HeroThreeDViewer;
