import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="app-shell-main" tabIndex={-1}>
        <div className="app-shell-main-inner">{children}</div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
