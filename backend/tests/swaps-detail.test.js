/**
 * Swap Detail & List API Tests (GET /api/swaps, GET /api/swaps/:id, PUT /api/swaps/:id/complete)
 * Uses the shared mongodb-memory-server harness in tests/setup.js.
 */

const request = require('supertest');
const { connect, disconnect } = require('./setup');
const { generateToken } = require('../src/config/jwt');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Swap = require('../src/models/Swap');
const PointsTransaction = require('../src/models/PointsTransaction');
const Notification = require('../src/models/Notification');
const app = require('../src/app');

jest.setTimeout(120000);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-swap-detail';
  await connect();
});

afterAll(disconnect);

const createTestUser = async (overrides = {}) => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const user = await User.create({
    username: `member_${suffix}`,
    email: `member_${suffix}@rewear.community`,
    password: 'Password1',
    points: 200,
    ...overrides
  });
  return {
    user,
    token: generateToken(user._id)
  };
};

const createTestItem = async (userId, overrides = {}) => {
  return Item.create({
    userId,
    title: 'Wool Fisherman Sweater',
    description: 'Warm cable-knit sweater in navy blue.',
    category: 'tops',
    type: 'sweater',
    size: 'M',
    condition: 'good',
    gender: 'unisex',
    pointsValue: 75,
    status: 'available',
    images: [{ url: 'https://cdn.example.com/knit.jpg', isPrimary: true }],
    ...overrides
  });
};

describe('Swap detail ledger, timeline, authorisation & direction filter', () => {
  afterEach(async () => {
    await Promise.all([
      Swap.deleteMany({}),
      Item.deleteMany({}),
      User.deleteMany({}),
      PointsTransaction.deleteMany({}),
      Notification.deleteMany({})
    ]);
  });

  test('GET /api/swaps/:id returns populated items, related transactions (scoped balance), and blocks outsiders', async () => {
    const alice = await createTestUser({ username: 'alice_detail', points: 250 });
    const bob = await createTestUser({ username: 'bob_detail', points: 100 });
    const eve = await createTestUser({ username: 'eve_outsider', points: 100 });

    const bobItem = await createTestItem(bob.user._id, { title: 'Chore Jacket', pointsValue: 75 });
    const aliceItem = await createTestItem(alice.user._id, { title: 'Ribbed Knit', pointsValue: 60 });

    const createRes = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: bobItem._id.toString(),
        requestedItemId: aliceItem._id.toString(),
        type: 'swap',
        pointsOffered: 15,
        handoverMethod: 'in_person',
        handoverNote: 'Meet outside Indiranagar metro',
        message: 'Saturday works for me'
      });

    expect(createRes.status).toBe(201);
    const swapId = createRes.body.data._id;

    // Owner accepts -> creates received tx for bob
    const acceptRes = await request(app)
      .put(`/api/swaps/${swapId}/accept`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(acceptRes.status).toBe(200);

    // Owner completes -> adds timeline entry
    const completeRes = await request(app)
      .put(`/api/swaps/${swapId}/complete`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(completeRes.status).toBe(200);

    // Non-participant must get 403
    const outsiderRes = await request(app)
      .get(`/api/swaps/${swapId}`)
      .set('Authorization', `Bearer ${eve.token}`);
    expect(outsiderRes.status).toBe(403);

    // Requester reads detail -> sees item photos, timeline including completed, both txs, own balance only
    const aliceDetail = await request(app)
      .get(`/api/swaps/${swapId}`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(aliceDetail.status).toBe(200);
    const detail = aliceDetail.body.data;
    expect(detail.itemId.images[0].url).toBe('https://cdn.example.com/knit.jpg');
    expect(detail.requestedItemId.images[0].url).toBe('https://cdn.example.com/knit.jpg');
    expect(detail.itemOwnerId.createdAt).toBeDefined();
    expect(detail.timeline.some((entry) => entry.action === 'Status changed to completed')).toBe(true);
    expect(detail.transactions).toHaveLength(2);

    const holdTx = detail.transactions.find((t) => t.type === 'hold');
    const receivedTx = detail.transactions.find((t) => t.type === 'received');
    expect(holdTx.amount).toBe(15);
    expect(holdTx.balance).toBe(235);
    expect(receivedTx.amount).toBe(15);
    expect(receivedTx.balance).toBeUndefined();
  });

  test('GET /api/swaps filters by direction (sent vs received) newest first', async () => {
    const alice = await createTestUser({ username: 'alice_list', points: 200 });
    const bob = await createTestUser({ username: 'bob_list', points: 200 });

    const bobItem = await createTestItem(bob.user._id, { title: 'Wanted From Bob', pointsValue: 60 });
    const aliceOffered = await createTestItem(alice.user._id, { title: 'Sent By Alice', pointsValue: 60 });
    const aliceItem = await createTestItem(alice.user._id, { title: 'Wanted From Alice', pointsValue: 60 });
    const bobOffered = await createTestItem(bob.user._id, { title: 'Sent By Bob', pointsValue: 60 });

    await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: bobItem._id.toString(),
        requestedItemId: aliceOffered._id.toString(),
        type: 'swap',
        handoverMethod: 'in_person'
      });

    await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({
        itemId: aliceItem._id.toString(),
        requestedItemId: bobOffered._id.toString(),
        type: 'swap',
        handoverMethod: 'post'
      });

    const sentRes = await request(app)
      .get('/api/swaps?direction=sent')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(sentRes.status).toBe(200);
    expect(sentRes.body.data.swaps).toHaveLength(1);
    expect(sentRes.body.data.swaps[0].itemId.title).toBe('Wanted From Bob');

    const receivedRes = await request(app)
      .get('/api/swaps?direction=received')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(receivedRes.status).toBe(200);
    expect(receivedRes.body.data.swaps).toHaveLength(1);
    expect(receivedRes.body.data.swaps[0].itemId.title).toBe('Wanted From Alice');
  });
});
