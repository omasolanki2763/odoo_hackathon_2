import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import performanceMonitor, { optimizeImages, preloadResources } from './utils/performance.js'

// Initialize performance monitoring
performanceMonitor.monitorPageLoad();

// Preload critical resources
preloadResources();

// Optimize images after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  optimizeImages();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
