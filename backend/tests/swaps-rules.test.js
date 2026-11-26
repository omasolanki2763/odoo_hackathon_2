/**
 * Swap Rules, Points Hold/Transfer/Refund, Reservation, Expiry, Handover & Concurrency Tests.
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
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-swap-rules';
  await connect();
});

afterAll(disconnect);

const createTestUser = async (overrides = {}) => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const user = await User.create({
    username: `user_${suffix}`,
    email: `user_${suffix}@rewear.community`,
    password: 'Password1',
    points: 100,
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
    title: 'Vintage Denim Chore Jacket',
    description: 'Clean heavy denim chore jacket with mild fading.',
    category: 'outerwear',
    type: 'jacket',
    size: 'M',
    condition: 'good',
    gender: 'unisex',
    pointsValue: 75,
    status: 'available',
    ...overrides
  });
};

describe('Swap rules, holds, reservations, expiry & concurrency', () => {
  afterEach(async () => {
    await Promise.all([
      Swap.deleteMany({}),
      Item.deleteMany({}),
      User.deleteMany({}),
      PointsTransaction.deleteMany({}),
      Notification.deleteMany({})
    ]);
  });

  test('removes the 4-point swap request fee even when requester has 0 points', async () => {
    const alice = await createTestUser({ username: 'alice_req', points: 0 });
    const bob = await createTestUser({ username: 'bob_owner', points: 50 });

    const wanted = await createTestItem(bob.user._id, { title: 'Wool Knit', pointsValue: 60 });
    const offered = await createTestItem(alice.user._id, { title: 'Linen Shirt', pointsValue: 60 });

    const res = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: offered._id.toString(),
        type: 'swap',
        handoverMethod: 'in_person',
        handoverNote: 'Meet near Indiranagar metro on Saturday',
        message: 'Happy to swap!'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.pointsOffered).toBe(0);
    expect(res.body.data.handoverMethod).toBe('in_person');
    expect(res.body.data.handoverNote).toBe('Meet near Indiranagar metro on Saturday');
    expect(res.body.data.expiresAt).toBeDefined();

    const updatedAlice = await User.findById(alice.user._id);
    expect(updatedAlice.points).toBe(0);
    expect(await PointsTransaction.countDocuments({ userId: alice.user._id })).toBe(0);
  });

  test('enforces top-up bounds, item ownership/status, handoverMethod, and single pending request', async () => {
    const alice = await createTestUser({ username: 'alice_bounds', points: 300 });
    const bob = await createTestUser({ username: 'bob_bounds', points: 50 });
    const carol = await createTestUser({ username: 'carol_bounds', points: 50 });

    const wanted = await createTestItem(bob.user._id, { pointsValue: 75 });
    const lowerOffer = await createTestItem(alice.user._id, { pointsValue: 60 });
    const equalOffer = await createTestItem(alice.user._id, { pointsValue: 75 });
    const pendingOffer = await createTestItem(alice.user._id, { pointsValue: 50, status: 'pending' });
    const carolItem = await createTestItem(carol.user._id, { pointsValue: 60 });

    // Missing handoverMethod for swap -> 400
    const missingHandover = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: lowerOffer._id.toString(),
        type: 'swap'
      });
    expect(missingHandover.status).toBe(400);

    // Offering another user's item -> 400
    const notOwner = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: carolItem._id.toString(),
        type: 'swap',
        handoverMethod: 'post'
      });
    expect(notOwner.status).toBe(400);

    // Offering unapproved/pending item -> 400
    const notApproved = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: pendingOffer._id.toString(),
        type: 'swap',
        handoverMethod: 'post'
      });
    expect(notApproved.status).toBe(400);

    // Top-up exceeding difference (75 - 60 = 15 max, offering 20 -> 400)
    const tooHighTopUp = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: lowerOffer._id.toString(),
        type: 'swap',
        pointsOffered: 20,
        handoverMethod: 'post'
      });
    expect(tooHighTopUp.status).toBe(400);

    // Top-up when offered >= wanted -> 400
    const disallowedTopUp = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: equalOffer._id.toString(),
        type: 'swap',
        pointsOffered: 5,
        handoverMethod: 'post'
      });
    expect(disallowedTopUp.status).toBe(400);

    // Requesting own item -> 400
    const ownItemRes = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: wanted._id.toString(),
        type: 'swap',
        handoverMethod: 'in_person'
      });
    expect(ownItemRes.status).toBe(400);

    // Valid swap request reserves both items, second request rejected
    const okRes = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: lowerOffer._id.toString(),
        type: 'swap',
        pointsOffered: 15,
        handoverMethod: 'in_person'
      });
    expect(okRes.status).toBe(201);

    const dupRes = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: equalOffer._id.toString(),
        type: 'swap',
        handoverMethod: 'in_person'
      });
    expect(dupRes.status).toBe(400);
  });

  test('holds top-up on create, hides reserved items from GET /api/items, and transfers points to owner on accept', async () => {
    const alice = await createTestUser({ username: 'alice_hold', points: 340 });
    const bob = await createTestUser({ username: 'bob_hold', points: 100 });

    const wanted = await createTestItem(bob.user._id, { title: 'Chore Jacket', pointsValue: 75 });
    const offered = await createTestItem(alice.user._id, { title: 'Ribbed Knit', pointsValue: 60 });

    const createRes = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: offered._id.toString(),
        type: 'swap',
        pointsOffered: 15,
        handoverMethod: 'in_person'
      });

    expect(createRes.status).toBe(201);
    const swapId = createRes.body.data._id;

    // Requester balance debited immediately; hold transaction recorded
    expect((await User.findById(alice.user._id)).points).toBe(325);
    expect((await User.findById(bob.user._id)).points).toBe(100);
    const aliceHoldTxs = await PointsTransaction.find({ userId: alice.user._id });
    expect(aliceHoldTxs).toHaveLength(1);
    expect(aliceHoldTxs[0]).toMatchObject({ type: 'hold', amount: 15, balance: 325 });

    // Both items are reserved and hidden from GET /api/items
    expect((await Item.findById(wanted._id)).status).toBe('reserved');
    expect((await Item.findById(offered._id)).status).toBe('reserved');
    const browseRes = await request(app).get('/api/items');
    expect(browseRes.status).toBe(200);
    expect(browseRes.body.data).toHaveLength(0);

    // Owner accepts -> held points go to owner; both items become swapped
    const acceptRes = await request(app)
      .put(`/api/swaps/${swapId}/accept`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(acceptRes.status).toBe(200);
    expect((await User.findById(alice.user._id)).points).toBe(325);
    expect((await User.findById(bob.user._id)).points).toBe(115);
    expect((await Item.findById(wanted._id)).status).toBe('swapped');
    expect((await Item.findById(offered._id)).status).toBe('swapped');

    const bobTxs = await PointsTransaction.find({ userId: bob.user._id });
    expect(bobTxs).toHaveLength(1);
    expect(bobTxs[0]).toMatchObject({ type: 'received', amount: 15, balance: 115 });
  });

  test('refunds held points and unreserves items on decline and cancel', async () => {
    const alice = await createTestUser({ username: 'alice_ref', points: 200 });
    const bob = await createTestUser({ username: 'bob_ref', points: 50 });

    const wanted1 = await createTestItem(bob.user._id, { title: 'Coat 1', pointsValue: 75 });
    const offered1 = await createTestItem(alice.user._id, { title: 'Shirt 1', pointsValue: 60 });

    // Create + Decline
    const res1 = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted1._id.toString(),
        requestedItemId: offered1._id.toString(),
        type: 'swap',
        pointsOffered: 15,
        handoverMethod: 'post'
      });
    expect(res1.status).toBe(201);
    expect((await User.findById(alice.user._id)).points).toBe(185);

    const rejectRes = await request(app)
      .put(`/api/swaps/${res1.body.data._id}/reject`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ reason: 'Wrong size for me' });
    expect(rejectRes.status).toBe(200);
    expect((await User.findById(alice.user._id)).points).toBe(200);
    expect((await Item.findById(wanted1._id)).status).toBe('available');
    expect((await Item.findById(offered1._id)).status).toBe('available');

    // Redeem hold + Cancel
    const redeemRes = await request(app)
      .post('/api/swaps/redeem')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ itemId: wanted1._id.toString(), pointsOffered: 75 });
    expect(redeemRes.status).toBe(201);
    expect((await User.findById(alice.user._id)).points).toBe(125);
    expect((await Item.findById(wanted1._id)).status).toBe('reserved');

    const cancelRes = await request(app)
      .put(`/api/swaps/${redeemRes.body.data._id}/cancel`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(cancelRes.status).toBe(200);
    expect((await User.findById(alice.user._id)).points).toBe(200);
    expect((await Item.findById(wanted1._id)).status).toBe('available');

    const refundTxs = await PointsTransaction.find({ userId: alice.user._id, type: 'refund' });
    expect(refundTxs).toHaveLength(2);
  });

  test('lazily expires stale pending requests on read, restoring items and refunding held points', async () => {
    const alice = await createTestUser({ username: 'alice_exp', points: 200 });
    const bob = await createTestUser({ username: 'bob_exp', points: 50 });

    const wanted = await createTestItem(bob.user._id, { title: 'Leather Coat', pointsValue: 80 });
    const offered = await createTestItem(alice.user._id, { title: 'Cotton Knit', pointsValue: 60 });

    const createRes = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        itemId: wanted._id.toString(),
        requestedItemId: offered._id.toString(),
        type: 'swap',
        pointsOffered: 20,
        handoverMethod: 'in_person'
      });
    expect(createRes.status).toBe(201);
    const swapId = createRes.body.data._id;

    // Backdate expiresAt so the swap is already past the 3-day window
    await Swap.updateOne({ _id: swapId }, { $set: { expiresAt: new Date(Date.now() - 60000) } });

    // Reading GET /api/items triggers lazy expiry sweep
    const itemsRes = await request(app).get('/api/items');
    expect(itemsRes.status).toBe(200);
    expect(itemsRes.body.data).toHaveLength(2);

    const expiredSwap = await Swap.findById(swapId);
    expect(expiredSwap.status).toBe('expired');
    expect((await User.findById(alice.user._id)).points).toBe(200);
    expect((await PointsTransaction.find({ userId: alice.user._id, type: 'refund' })).length).toBe(1);
  });

  test('GET /api/swaps/quote returns swap and redeem balance breakdowns', async () => {
    const alice = await createTestUser({ username: 'alice_quote', points: 340 });
    const bob = await createTestUser({ username: 'bob_quote', points: 50 });

    const wanted = await createTestItem(bob.user._id, { title: 'Chore Jacket', pointsValue: 75 });
    const offered = await createTestItem(alice.user._id, { title: 'Wool Knit', pointsValue: 60 });

    const swapQuoteRes = await request(app)
      .get(`/api/swaps/quote?item=${wanted._id}&offer=${offered._id}`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(swapQuoteRes.status).toBe(200);
    expect(swapQuoteRes.body.data).toMatchObject({
      mode: 'swap',
      wantedPoints: 75,
      offeredPoints: 60,
      difference: 15,
      allowedTopUp: 15,
      balanceBefore: 340,
      balanceAfter: 325
    });

    const redeemQuoteRes = await request(app)
      .get(`/api/swaps/quote?item=${wanted._id}`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(redeemQuoteRes.status).toBe(200);
    expect(redeemQuoteRes.body.data).toMatchObject({
      mode: 'redeem',
      cost: 75,
      balanceBefore: 340,
      balanceAfter: 265
    });
  });

  test('prevents concurrent double-spend when two 80-point redeems race on 100 balance', async () => {
    const alice = await createTestUser({ username: 'alice_race', points: 100 });
    const bob = await createTestUser({ username: 'bob_race', points: 0 });

    const itemA = await createTestItem(bob.user._id, { title: 'Jacket A', pointsValue: 80 });
    const itemB = await createTestItem(bob.user._id, { title: 'Jacket B', pointsValue: 80 });

    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/swaps/redeem/direct')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ itemId: itemA._id.toString(), pointsOffered: 80 }),
      request(app)
        .post('/api/swaps/redeem/direct')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ itemId: itemB._id.toString(), pointsOffered: 80 })
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 400]);

    const aliceAfter = await User.findById(alice.user._id);
    expect(aliceAfter.points).toBe(20);
    expect(aliceAfter.points).toBeGreaterThanOrEqual(0);
  });
});
