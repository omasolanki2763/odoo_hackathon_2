import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="shell-footer">
      <div className="shell-inner">
        <div className="shell-footer-grid">
          <div className="shell-footer-brand-col">
            <h2 className="shell-footer-brand">RE:WEAR LOOKBOOK</h2>
            <p className="shell-footer-desc">
              A non-commercial community clothing exchange. Published to keep good garments in
              circulation and out of landfills.
            </p>
          </div>

          <div>
            <h3 className="shell-footer-col-title">Catalogue</h3>
            <ul className="shell-footer-links">
              <li>
                <Link to="/items" className="shell-footer-link">
                  Browse Catalogue
                </Link>
              </li>
              <li>
                <Link to="/add-item" className="shell-footer-link">
                  List an Item
                </Link>
              </li>
              <li>
                <Link to="/" className="shell-footer-link">
                  Autumn Lookbook
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="shell-footer-col-title">Exchange</h3>
            <ul className="shell-footer-links">
              <li>
                <Link to="/dashboard" className="shell-footer-link">
                  Member Dashboard
                </Link>
              </li>
              <li>
                <Link to="/swaps" className="shell-footer-link">
                  Active Swaps
                </Link>
              </li>
              <li>
                <Link to="/items" className="shell-footer-link">
                  Verified Garments
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="shell-footer-col-title">Account</h3>
            <ul className="shell-footer-links">
              <li>
                <Link to="/login" className="shell-footer-link">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/register" className="shell-footer-link">
                  Join Exchange
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="shell-footer-bottom">
          <p className="shell-footer-colophon">
            &copy; {new Date().getFullYear()} ReWear Community Exchange &bull; Designed with
            restraint, honesty, and care.
          </p>
          <p className="shell-footer-colophon">
            RE:WEAR &bull; ISSUE NO. 04 &bull; ZERO COMMERCE FEES
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
