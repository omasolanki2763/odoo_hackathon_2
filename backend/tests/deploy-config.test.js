/**
 * Deployment Configuration Tests
 * Verifies reverse proxy trust behavior, rate-limiting per client IP,
 * and CORS origin filtering.
 */

// Configure environment for production proxy testing before importing app
process.env.NODE_ENV = 'production';
process.env.FRONTEND_URL = 'https://rewear.pages.dev';

jest.setTimeout(25000);

const request = require('supertest');
const app = require('../src/app');

describe('Deployment Configuration', () => {
  describe('CORS policy', () => {
    it('allows requests from configured FRONTEND_URL and returns CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://rewear.pages.dev');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://rewear.pages.dev');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('rejects unauthorized origins without returning 500 error or CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil.example');

      // Unauthorized origin must not produce a 500 internal server error
      expect(response.status).not.toBe(500);
      // Access-Control-Allow-Origin header must not be set for disallowed origin
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Reverse proxy trust and client rate limiting', () => {
    it('isolates rate limits for distinct X-Forwarded-For client IPs in production', async () => {
      // First request from client IP 198.51.100.1
      const resIp1First = await request(app)
        .get('/api/health')
        .set('X-Forwarded-For', '198.51.100.1');

      // Second request from client IP 198.51.100.1
      const resIp1Second = await request(app)
        .get('/api/health')
        .set('X-Forwarded-For', '198.51.100.1');

      // First request from separate client IP 198.51.100.2
      const resIp2First = await request(app)
        .get('/api/health')
        .set('X-Forwarded-For', '198.51.100.2');

      const remainingIp1First = parseInt(resIp1First.headers['ratelimit-remaining'], 10);
      const remainingIp1Second = parseInt(resIp1Second.headers['ratelimit-remaining'], 10);
      const remainingIp2First = parseInt(resIp2First.headers['ratelimit-remaining'], 10);

      // Verify header presence
      expect(isNaN(remainingIp1First)).toBe(false);
      // Subsequent request from IP 1 decrements its bucket
      expect(remainingIp1Second).toBe(remainingIp1First - 1);
      // Separate IP 2 starts with independent bucket equal to initial level
      expect(remainingIp2First).toBe(remainingIp1First);
    });
  });
});
