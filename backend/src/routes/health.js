const express = require('express');
const router = express.Router();

/**
 * Health check router for system uptime monitors and orchestration probes.
 * Responds with standard operational status.
 */
router.get('/', (req, res) => {
  // Return standard health check payload indicating the API service is operational
  res.status(200).json({
    success: true,
    status: 'ok'
  });
});

module.exports = router;
