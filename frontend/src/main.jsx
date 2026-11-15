import React from 'react';
import ReactDOM from 'react-dom/client';

// Self-hosted fonts via Fontsource (no external Google requests)
import '@fontsource-variable/playfair-display';
import '@fontsource-variable/inter';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/ibm-plex-mono/400.css';

// Design tokens and base stylesheet
import './styles/tokens.css';
import './index.css';

import App from './App.jsx';
import performanceMonitor, { optimizeImages } from './utils/performance.js';

// Initialize performance monitoring
performanceMonitor.monitorPageLoad();

// Optimize images after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  optimizeImages();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
