import React from 'react';

const Loading = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      color: 'var(--accent-color)',
      fontFamily: 'var(--font-sans)',
      gap: '1rem'
    }}>
      <div className="spinner" style={{
        width: '50px',
        height: '50px',
        border: '3px solid rgba(201, 162, 101, 0.1)',
        borderTop: '3px solid var(--accent-color)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
      <span style={{ fontSize: '1rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Loading Closet Share...</span>
    </div>
  );
};

export default Loading;
