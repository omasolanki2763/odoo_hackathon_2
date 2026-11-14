/**
 * Health check endpoint test suite.
 * Verifies that the API monitoring / health endpoint responds with HTTP 200
 * and expected status payload for uptime checks and orchestrators.
 */

const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('responds with 200 OK and health status payload', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      status: 'ok'
    });
  });
});
