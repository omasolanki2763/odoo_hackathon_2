// Performance monitoring utility
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: 0,
      apiCalls: 0,
      renderTime: 0,
      errors: 0
    };
    
    this.startTime = Date.now();
  }

  // Monitor API call performance
  monitorApiCall(url, startTime) {
    const duration = Date.now() - startTime;
    this.metrics.apiCalls++;
    
    if (duration > 1000) {
      console.warn(`Slow API call to ${url}: ${duration}ms`);
    }
    
    return duration;
  }

  // Monitor component render time
  monitorRender(componentName, startTime) {
    const duration = Date.now() - startTime;
    this.metrics.renderTime += duration;
    
    if (duration > 100) {
      console.warn(`Slow render for ${componentName}: ${duration}ms`);
    }
    
    return duration;
  }

  // Monitor page load time
  monitorPageLoad() {
    this.metrics.pageLoads++;
    const loadTime = Date.now() - this.startTime;
    
    if (loadTime > 3000) {
      console.warn(`Slow page load: ${loadTime}ms`);
    }
    
    return loadTime;
  }

  // Log errors
  logError(error, context) {
    this.metrics.errors++;
    console.error(`Error in ${context}:`, error);
  }

  // Get performance summary
  getSummary() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      avgRenderTime: this.metrics.renderTime / this.metrics.pageLoads || 0,
      avgApiCallTime: this.metrics.apiCalls > 0 ? this.metrics.renderTime / this.metrics.apiCalls : 0
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      pageLoads: 0,
      apiCalls: 0,
      renderTime: 0,
      errors: 0
    };
    this.startTime = Date.now();
  }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Performance optimization utilities
export const optimizeImages = () => {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (!img.complete) {
      img.style.opacity = '0';
      img.onload = () => {
        img.style.transition = 'opacity 0.3s ease';
        img.style.opacity = '1';
      };
    }
  });
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Preload critical resources
export const preloadResources = () => {
  const criticalPaths = [
    '/api/auth/profile',
    '/api/items'
  ];
  
  criticalPaths.forEach(path => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;
    document.head.appendChild(link);
  });
};

export default performanceMonitor; 