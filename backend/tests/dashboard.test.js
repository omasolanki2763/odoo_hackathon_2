/**
 * Caller-Scoped Dashboard Integration Tests (GET /api/auth/dashboard)
 * Uses mongodb-memory-server harness in tests/setup.js.
 */

const request = require('supertest');
const { connect, disconnect } = require('./setup');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Swap = require('../src/models/Swap');
const Rating = require('../src/models/Rating');
const PointsTransaction = require('../src/models/PointsTransaction');
const app = require('../src/app');

jest.setTimeout(120000);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-dashboard';
  await connect();
});

afterAll(disconnect);

const registerMember = async (username, email) => {
  const res = await request(app).post('/api/auth/register').send({
    username,
    email,
    password: 'Password1',
    confirmPassword: 'Password1'
  });
  return {
    token: res.body.data.token,
    user: res.body.data.user
  };
};

const createItemDoc = (userId, overrides = {}) =>
  Item.create({
    userId,
    title: 'Editorial Jacket',
    description: 'Clean heavy twill outerwear piece.',
    category: 'outerwear',
    size: 'M',
    condition: 'like-new',
    gender: 'unisex',
    pointsValue: 65,
    status: 'available',
    ...overrides
  });

describe('GET /api/auth/dashboard', () => {
  afterEach(async () => {
    await Rating.deleteMany({});
    await Swap.deleteMany({});
    await Item.deleteMany({});
    await PointsTransaction.deleteMany({});
    await User.deleteMany({});
  });

  test('rejects unauthenticated callers with 401', async () => {
    const res = await request(app).get('/api/auth/dashboard');
    expect(res.status).toBe(401);
  });

  test('returns clean welcome state data for a newly registered member', async () => {
    const clara = await registerMember('clara_new', 'clara_new@rewear.community');

    const res = await request(app)
      .get('/api/auth/dashboard')
      .set('Authorization', `Bearer ${clara.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.user.username).toBe('clara_new');
    expect(data.user.points).toBe(100);
    expect(data.myItems).toEqual([]);
    expect(data.swapsNeedingAction).toEqual([]);
    expect(data.openRequests).toEqual([]);
    expect(data.completedSwaps).toEqual([]);
    expect(data.stats.itemsCount).toBe(0);
    expect(data.stats.totalSwapsCount).toBe(0);
    expect(data.stats.earnedPoints).toBe(100);
    expect(data.stats.spentPoints).toBe(0);
    expect(data.trust).toEqual({
      averageStars: 0,
      ratingCount: 0,
      matchedCount: 0
    });
  });

  test('returns caller rack items across statuses, action lists, open requests with expiresAt, and rating status without third-party leaks', async () => {
    const clara = await registerMember('clara_mends', 'clara@rewear.community');
    const mia = await registerMember('mia_rewears', 'mia@rewear.community');
    const noor = await registerMember('noor_vintage', 'noor@rewear.community');

    const claraPending = await createItemDoc(clara.user._id, { title: 'Chore Coat', status: 'pending' });
    const claraAvailable = await createItemDoc(clara.user._id, { title: 'Wool Knit', status: 'available' });
    const claraRejected = await createItemDoc(clara.user._id, { title: 'Damaged Tee', status: 'rejected' });
    const miaShirt = await createItemDoc(mia.user._id, { title: 'Oxford Shirt', status: 'reserved', pointsValue: 50 });
    const noorCoat = await createItemDoc(noor.user._id, { title: 'Trench Coat', status: 'available', pointsValue: 80 });
    const noorPrivatePending = await createItemDoc(noor.user._id, { title: 'Secret Private Piece', status: 'pending' });

    // Incoming swap needing Clara's action (owner = clara)
    const futureExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await Swap.create({
      requesterId: mia.user._id,
      itemOwnerId: clara.user._id,
      itemId: claraAvailable._id,
      type: 'redeem',
      pointsOffered: 65,
      status: 'pending',
      expiresAt: futureExpiry
    });

    // Outgoing open request by Clara (requester = clara)
    await Swap.create({
      requesterId: clara.user._id,
      itemOwnerId: noor.user._id,
      itemId: noorCoat._id,
      requestedItemId: claraPending._id,
      type: 'swap',
      handoverMethod: 'in_person',
      status: 'pending',
      expiresAt: futureExpiry
    });

    // Completed swap awaiting Clara's rating
    const completedSwap = await Swap.create({
      requesterId: clara.user._id,
      itemOwnerId: mia.user._id,
      itemId: miaShirt._id,
      type: 'redeem',
      pointsOffered: 50,
      status: 'completed',
      completedAt: new Date()
    });

    // Unrelated swap between Mia and Noor that must NOT appear for Clara
    await Swap.create({
      requesterId: mia.user._id,
      itemOwnerId: noor.user._id,
      itemId: noorPrivatePending._id,
      type: 'redeem',
      pointsOffered: 65,
      status: 'pending',
      expiresAt: futureExpiry
    });

    const firstRes = await request(app)
      .get('/api/auth/dashboard')
      .set('Authorization', `Bearer ${clara.token}`);

    expect(firstRes.status).toBe(200);
    const d1 = firstRes.body.data;
    expect(d1.myItems.map((i) => i.title)).toEqual(
      expect.arrayContaining(['Chore Coat', 'Wool Knit', 'Damaged Tee'])
    );
    expect(d1.myItems.map((i) => i.title)).not.toContain('Secret Private Piece');
    expect(d1.myItems.find((i) => i._id === String(claraRejected._id)).status).toBe('rejected');

    expect(d1.swapsNeedingAction).toHaveLength(1);
    expect(d1.swapsNeedingAction[0].requesterId.username).toBe('mia_rewears');

    expect(d1.openRequests).toHaveLength(1);
    expect(d1.openRequests[0].itemOwnerId.username).toBe('noor_vintage');
    expect(d1.openRequests[0].expiresAt).toBeTruthy();

    expect(d1.completedSwaps).toHaveLength(1);
    expect(d1.completedSwaps[0].hasRated).toBe(false);

    // Rate completedSwap as Clara -> hasRated flips to true
    await request(app)
      .post(`/api/swaps/${completedSwap._id}/rate`)
      .set('Authorization', `Bearer ${clara.token}`)
      .send({ stars: 5, matchStatus: 'yes', comment: 'Smooth handover' });

    const secondRes = await request(app)
      .get('/api/auth/dashboard')
      .set('Authorization', `Bearer ${clara.token}`);

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.completedSwaps[0].hasRated).toBe(true);
  });
});
