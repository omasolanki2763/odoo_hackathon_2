import React from 'react';

const Footer = () => {
  return (
    <footer className="footer" style={{ padding: '1rem 0', textAlign: 'center' }}>
      <p style={{ margin: 0, color: '#bdbdbd', fontSize: '1rem' }}>
        ReWear &copy; {new Date().getFullYear()} - Community Clothing Exchange
      </p>
    </footer>
  );
};

export default Footer; 