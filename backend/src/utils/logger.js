const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    return JSON.stringify(logEntry);
  }

  writeToFile(level, message, data = null) {
    const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
    const logEntry = this.formatMessage(level, message, data) + '\n';
    
    fs.appendFileSync(logFile, logEntry);
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    
    // Console output with colors
    let color = colors.reset;
    switch (level) {
      case LOG_LEVELS.ERROR:
        color = colors.red;
        break;
      case LOG_LEVELS.WARN:
        color = colors.yellow;
        break;
      case LOG_LEVELS.INFO:
        color = colors.green;
        break;
      case LOG_LEVELS.DEBUG:
        color = colors.blue;
        break;
    }

    console.log(`${color}[${timestamp}] ${level}: ${message}${colors.reset}`);
    
    if (data) {
      console.log(`${color}Data: ${JSON.stringify(data, null, 2)}${colors.reset}`);
    }

    // Write to file in production
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(level, message, data);
    }
  }

  error(message, data = null) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data = null) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message, data = null) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      this.log(LOG_LEVELS.DEBUG, message, data);
    }
  }

  // Log API requests
  logRequest(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logMessage = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;
      
      if (res.statusCode >= 400) {
        this.error(logMessage);
      } else {
        this.info(logMessage);
      }
    });

    next();
  }
}

const logger = new Logger();

module.exports = logger; 