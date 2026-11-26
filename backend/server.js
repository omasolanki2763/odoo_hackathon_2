require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/database');
const swapService = require('./src/services/swapService');

const PORT = process.env.PORT || 3001;

// Connect to MongoDB and sweep expired swaps at startup
connectDB()
  .then(() => swapService.expirePendingSwaps())
  .catch((err) => {
    console.error('Startup swap expiry sweep failed:', err.message);
  });

app.listen(PORT, () => {
  console.log(`ReWear server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});