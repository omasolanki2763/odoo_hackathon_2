/**
 * Points history API tests (GET /api/users/me/points).
 *
 * Covers ownership scoping, newest-first ordering, pagination clamping and
 * bounds, lifetime earned/spent/held totals, the type filter, and query
 * validation. Runs against the in-memory Mongo harness in tests/setup.js.
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
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-points-history';
  await connect();
});

afterAll(disconnect);

let emailCounter = 0;

/**
 * Creates a member with a JWT so endpoint calls act as that member.
 * @param {object} overrides User fields to override (points, username...)
 * @returns {Promise<{user: object, token: string}>}
 */
const createTestUser = async (overrides = {}) => {
  emailCounter += 1;
  const suffix = `${Date.now()}_${emailCounter}`;
  const user = await User.create({
    username: `points_user_${emailCounter}`,
    email: `points_user_${suffix}@rewear.community`,
    password: 'Password1',
    points: 0,
    ...overrides
  });
  return { user, token: generateToken(user._id) };
};

/**
 * Inserts a ledger row and pins its createdAt so ordering is deterministic.
 * @param {object} data Transaction fields
 * @param {Date} createdAt Timestamp to store
 * @returns {Promise<object>} Created transaction
 */
const seedTransaction = async (data, createdAt) => {
  const transaction = await PointsTransaction.create(data);
  await PointsTransaction.collection.updateOne(
    { _id: transaction._id },
    { $set: { createdAt } }
  );
  return transaction;
};

/**
 * Creates a swap used only to prove the held total ignores settled rows.
 * @param {object} requester User document owning the request
 * @param {object} owner Counterparty user document
 * @param {string} status Swap status
 * @param {number} pointsOffered Points reserved by the requester
 */
const seedSwap = async (requester, owner, status, pointsOffered) => {
  const [wanted, offered] = await Promise.all([
    Item.create({
      userId: owner._id,
      title: 'Fisherman Wool Knit',
      description: 'Chunky knit with visible mending at the cuff.',
      category: 'tops',
      type: 'sweater',
      size: 'M',
      condition: 'good',
      gender: 'unisex',
      pointsValue: 75,
      status: status === 'pending' ? 'reserved' : 'available'
    }),
    Item.create({
      userId: requester._id,
      title: 'Linen Camp Shirt',
      description: 'Relaxed linen shirt in oatmeal with shell buttons.',
      category: 'tops',
      type: 'shirt',
      size: 'L',
      condition: 'good',
      gender: 'unisex',
      pointsValue: 60,
      status: status === 'pending' ? 'reserved' : 'available'
    })
  ]);

  return Swap.create({
    requesterId: requester._id,
    itemOwnerId: owner._id,
    itemId: wanted._id,
    requestedItemId: offered._id,
    type: 'swap',
    status,
    pointsOffered,
    handoverMethod: 'in_person',
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  });
};

afterEach(async () => {
  await Promise.all([
    Swap.deleteMany({}),
    Item.deleteMany({}),
    User.deleteMany({}),
    PointsTransaction.deleteMany({}),
    Notification.deleteMany({})
  ]);
});

describe('GET /api/users/me/points', () => {
  test('rejects unauthenticated callers', async () => {
    const res = await request(app).get('/api/users/me/points');
    expect(res.status).toBe(401);
  });

  test('returns only the caller rows, newest first, with related links', async () => {
    const member = await createTestUser({ points: 145 });
    const stranger = await createTestUser({ points: 999 });

    const base = Date.now();
    const welcome = await seedTransaction(
      {
        userId: member.user._id,
        type: 'bonus',
        amount: 100,
        balance: 100,
        description: 'Welcome points'
      },
      new Date(base)
    );
    const receivedSwap = await seedSwap(member.user, stranger.user, 'accepted', 60);
    const received = await seedTransaction(
      {
        userId: member.user._id,
        type: 'received',
        amount: 60,
        balance: 160,
        description: 'Swap top-up received: Fisherman Wool Knit',
        relatedSwapId: receivedSwap._id
      },
      new Date(base + 1000)
    );
    await seedTransaction(
      {
        userId: stranger.user._id,
        type: 'bonus',
        amount: 999,
        balance: 999,
        description: 'Someone else\'s bonus'
      },
      new Date(base + 2000)
    );
    const fee = await seedTransaction(
      {
        userId: member.user._id,
        type: 'spent',
        amount: 15,
        balance: 145,
        description: 'Swap request fee for item: Fisherman Wool Knit',
        relatedItemId: receivedSwap.itemId
      },
      new Date(base + 3000)
    );

    const res = await request(app)
      .get('/api/users/me/points')
      .set('Authorization', `Bearer ${member.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { entries, totals } = res.body.data;
    const ids = entries.map((entry) => entry.id);
    expect(ids).toEqual([fee._id.toString(), received._id.toString(), welcome._id.toString()]);
    expect(ids).not.toContain(stranger.user._id.toString());

    const receivedEntry = entries.find((entry) => entry.id === received._id.toString());
    expect(receivedEntry).toMatchObject({
      type: 'received',
      amount: 60,
      balance: 160,
      relatedItem: null
    });
    expect(receivedEntry.relatedSwap?.id).toBe(receivedSwap._id.toString());
    expect(receivedEntry.relatedSwap?.status).toBe('accepted');

    const feeEntry = entries.find((entry) => entry.id === fee._id.toString());
    expect(feeEntry.relatedItem?.title).toBe('Fisherman Wool Knit');
    expect(totals.balance).toBe(145);
  });

  test('clamps the limit to MAX_LIMIT and pages through every row exactly once', async () => {
    const member = await createTestUser({ points: 50 });
    const base = Date.now();
    for (let index = 0; index < 5; index += 1) {
      await seedTransaction(
        {
          userId: member.user._id,
          type: 'spent',
          amount: index + 1,
          balance: 50 - index,
          description: `Rows ${index + 1}`
        },
        new Date(base + index * 1000)
      );
    }

    const clamped = await request(app)
      .get('/api/users/me/points?limit=500')
      .set('Authorization', `Bearer ${member.token}`);

    expect(clamped.status).toBe(200);
    expect(clamped.body.pagination.itemsPerPage).toBe(50);
    expect(clamped.body.data.entries).toHaveLength(5);

    const firstPage = await request(app)
      .get('/api/users/me/points?page=1&limit=2')
      .set('Authorization', `Bearer ${member.token}`);
    const secondPage = await request(app)
      .get('/api/users/me/points?page=2&limit=2')
      .set('Authorization', `Bearer ${member.token}`);
    const beyond = await request(app)
      .get('/api/users/me/points?page=99&limit=2')
      .set('Authorization', `Bearer ${member.token}`);

    expect(firstPage.body.data.entries).toHaveLength(2);
    expect(secondPage.body.data.entries).toHaveLength(2);
    expect(secondPage.body.pagination).toMatchObject({
      currentPage: 2,
      totalPages: 3,
      totalItems: 5,
      hasNextPage: true,
      hasPrevPage: true
    });
    expect(beyond.status).toBe(200);
    expect(beyond.body.data.entries).toHaveLength(0);
    expect(beyond.body.pagination.hasNextPage).toBe(false);

    const seen = new Set([
      ...firstPage.body.data.entries.map((entry) => entry.id),
      ...secondPage.body.data.entries.map((entry) => entry.id)
    ]);
    expect(seen.size).toBe(4);
  });

  test('computes lifetime totals and counts only pending holds', async () => {
    const member = await createTestUser({ points: 145 });
    const owner = await createTestUser({ points: 0 });

    const base = Date.now();
    await seedTransaction(
      { userId: member.user._id, type: 'bonus', amount: 100, balance: 100, description: 'Welcome points' },
      new Date(base)
    );
    await seedTransaction(
      { userId: member.user._id, type: 'received', amount: 60, balance: 160, description: 'Item redeemed' },
      new Date(base + 1000)
    );
    await seedTransaction(
      { userId: member.user._id, type: 'hold', amount: 50, balance: 110, description: 'Points held for redemption' },
      new Date(base + 2000)
    );
    await seedTransaction(
      { userId: member.user._id, type: 'refund', amount: 20, balance: 130, description: 'Refund for declined swap request' },
      new Date(base + 3000)
    );
    await seedTransaction(
      { userId: member.user._id, type: 'spent', amount: 15, balance: 115, description: 'Swap request fee' },
      new Date(base + 4000)
    );

    await seedSwap(member.user, owner.user, 'pending', 50);
    await seedSwap(member.user, owner.user, 'accepted', 30);
    await seedSwap(member.user, owner.user, 'rejected', 25);

    const res = await request(app)
      .get('/api/users/me/points')
      .set('Authorization', `Bearer ${member.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totals).toEqual({
      balance: 145,
      earned: 180,
      spent: 15,
      heldNow: 50
    });
  });

  test('filters by comma-separated transaction types while keeping lifetime totals', async () => {
    const member = await createTestUser({ points: 145 });
    const base = Date.now();
    await seedTransaction(
      { userId: member.user._id, type: 'bonus', amount: 100, balance: 100, description: 'Welcome points' },
      new Date(base)
    );
    await seedTransaction(
      { userId: member.user._id, type: 'hold', amount: 50, balance: 50, description: 'Points held for redemption' },
      new Date(base + 1000)
    );
    await seedTransaction(
      { userId: member.user._id, type: 'spent', amount: 15, balance: 35, description: 'Swap request fee' },
      new Date(base + 2000)
    );

    const res = await request(app)
      .get('/api/users/me/points?type=hold,spent')
      .set('Authorization', `Bearer ${member.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.entries.map((entry) => entry.type)).toEqual(['spent', 'hold']);
    expect(res.body.data.totals).toEqual({
      balance: 145,
      earned: 100,
      spent: 15,
      heldNow: 0
    });
  });

  test('rejects unknown keys and malformed query values', async () => {
    const member = await createTestUser();

    const unknownKey = await request(app)
      .get('/api/users/me/points?sort=amount')
      .set('Authorization', `Bearer ${member.token}`);
    expect(unknownKey.status).toBe(400);
    expect(unknownKey.body.errors?.[0]?.field).toBe('sort');

    const badLimit = await request(app)
      .get('/api/users/me/points?limit=abc')
      .set('Authorization', `Bearer ${member.token}`);
    expect(badLimit.status).toBe(400);

    const badType = await request(app)
      .get('/api/users/me/points?type=banana')
      .set('Authorization', `Bearer ${member.token}`);
    expect(badType.status).toBe(400);
  });
});
