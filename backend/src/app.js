const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const itemRoutes = require('./routes/items');
const swapRoutes = require('./routes/swaps');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust reverse proxy headers (e.g. Render, Cloudflare) in production
// Ensures req.ip and express-rate-limit track client IP from X-Forwarded-For rather than proxy IP
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet());

// Configure CORS allowed origins from defaults and FRONTEND_URL environment variable
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server, uptime monitoring)
    if (!origin) {
      return callback(null, true);
    }
    const cleanOrigin = origin.replace(/\/+$/, '');

    // Support comma-separated frontend URLs and strip trailing slashes for clean matching
    const configuredOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').flatMap(url => {
          const trimmed = url.trim();
          const withoutSlash = trimmed.replace(/\/+$/, '');
          return [trimmed, withoutSlash];
        }).filter(Boolean)
      : [];

    const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

    if (allowedOrigins.includes(origin) || allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }
    // Allow localhost variations in development
    if (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }
    // Disallow origin gracefully without throwing a 500 error or logging stack traces
    return callback(null, false);
  },
  credentials: true
}));

// Compression
app.use(compression());

// Rate limiting
app.use(apiLimiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'ReWear API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app; 