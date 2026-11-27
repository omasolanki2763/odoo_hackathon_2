/**
 * Ratings, Anti-Retaliation Visibility, Trust Score, Public Profile & Mismatch Report Tests.
 * Uses the shared mongodb-memory-server harness in tests/setup.js.
 */

const request = require('supertest');
const { connect, disconnect } = require('./setup');
const { generateToken } = require('../src/config/jwt');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Swap = require('../src/models/Swap');
const Rating = require('../src/models/Rating');
const MismatchReport = require('../src/models/MismatchReport');
const PointsTransaction = require('../src/models/PointsTransaction');
const AdminAction = require('../src/models/AdminAction');
const Notification = require('../src/models/Notification');
const app = require('../src/app');

jest.setTimeout(120000);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-ratings-trust';
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
    title: 'Merino Crewneck Knit',
    description: 'Fine merino knit sweater with intact ribbing.',
    category: 'tops',
    size: 'M',
    condition: 'like-new',
    gender: 'unisex',
    pointsValue: 60,
    status: 'available',
    ...overrides
  });
};

const createCompletedRedeemSwap = async ({ requester, owner, item, pointsOffered = 60, completedAt = new Date() }) => {
  return Swap.create({
    requesterId: requester._id,
    itemOwnerId: owner._id,
    itemId: item._id,
    type: 'redeem',
    status: 'completed',
    pointsOffered,
    completedAt
  });
};

describe('Ratings, trust summary, public profile, and mismatch reports', () => {
  afterEach(async () => {
    await Promise.all([
      MismatchReport.deleteMany({}),
      Rating.deleteMany({}),
      Swap.deleteMany({}),
      Item.deleteMany({}),
      User.deleteMany({}),
      PointsTransaction.deleteMany({}),
      AdminAction.deleteMany({}),
      Notification.deleteMany({})
    ]);
  });

  test('enforces rating permissions and validation rules', async () => {
    const requester = await createTestUser({ username: 'maya_req' });
    const owner = await createTestUser({ username: 'liam_own' });
    const outsider = await createTestUser({ username: 'eve_outsider' });

    const item = await createTestItem(owner.user._id);
    const pendingSwap = await Swap.create({
      requesterId: requester.user._id,
      itemOwnerId: owner.user._id,
      itemId: item._id,
      type: 'redeem',
      status: 'accepted',
      pointsOffered: 60
    });

    // Cannot rate before completion
    const beforeCompleteRes = await request(app)
      .post(`/api/swaps/${pendingSwap._id}/rate`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({ stars: 5, matchStatus: 'yes', comment: 'Too early' });
    expect(beforeCompleteRes.status).toBe(400);

    const completedSwap = await createCompletedRedeemSwap({
      requester: requester.user,
      owner: owner.user,
      item
    });

    // Non-participant gets 403
    const outsiderRes = await request(app)
      .post(`/api/swaps/${completedSwap._id}/rate`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ stars: 5, matchStatus: 'yes' });
    expect(outsiderRes.status).toBe(403);

    // Self-rating rejected (400)
    const selfRes = await request(app)
      .post(`/api/swaps/${completedSwap._id}/rate`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({ stars: 5, matchStatus: 'yes', rateeId: requester.user._id.toString() });
    expect(selfRes.status).toBe(400);

    // Invalid stars & overly long comment rejected (400)
    const badStarsRes = await request(app)
      .post(`/api/swaps/${completedSwap._id}/rate`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({ stars: 6, matchStatus: 'yes' });
    expect(badStarsRes.status).toBe(400);

    const longCommentRes = await request(app)
      .post(`/api/swaps/${completedSwap._id}/rate`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({ stars: 5, matchStatus: 'yes', comment: 'a'.repeat(501) });
    expect(longCommentRes.status).toBe(400);

    // Valid rating succeeds
    const validRes = await request(app)
      .post(`/api/swaps/${completedSwap._id}/rate`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({ stars: 5, matchStatus: 'yes', comment: 'Clean and accurate!' });
    expect(validRes.status).toBe(201);

    // Duplicate rating rejected (400)
    const dupRes = await request(app)
      .post(`/api/swaps/${completedSwap._id}/rate`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({ stars: 4, matchStatus: 'yes' });
    expect(dupRes.status).toBe(400);
  });

  test('hides single-sided ratings until both sides rate or 7 days pass', async () => {
    const requester = await createTestUser({ username: 'nora_req' });
    const owner = await createTestUser({ username: 'omar_own' });
    const item = await createTestItem(owner.user._id);

    const swap = await createCompletedRedeemSwap({
      requester: requester.user,
      owner: owner.user,
      item
    });

    // Requester rates owner 2 stars (< 7 days old, owner has not rated yet)
    const rate1 = await request(app)
      .post(`/api/swaps/${swap._id}/rate`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({ stars: 2, matchStatus: 'small differences', comment: 'Minor fading' });
    expect(rate1.status).toBe(201);

    // Owner checks swap ratings before rating: requester's rating is hidden to prevent retaliation
    const hiddenCheck = await request(app)
      .get(`/api/swaps/${swap._id}/ratings`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(hiddenCheck.status).toBe(200);
    expect(hiddenCheck.body.data.ratings).toHaveLength(0);

    // Public trust summary also hides unrevealed rating
    const pubBefore = await request(app).get('/api/users/omar_own/public');
    expect(pubBefore.status).toBe(200);
    expect(pubBefore.body.data.trust.ratingCount).toBe(0);
    expect(pubBefore.body.data.trust.averageStars).toBe(0);

    // Owner rates requester -> both immediately visible
    const rate2 = await request(app)
      .post(`/api/swaps/${swap._id}/rate`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ stars: 5, matchStatus: 'yes' });
    expect(rate2.status).toBe(201);

    const revealedCheck = await request(app)
      .get(`/api/swaps/${swap._id}/ratings`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(revealedCheck.status).toBe(200);
    expect(revealedCheck.body.data.ratings).toHaveLength(2);

    const pubAfterMutual = await request(app).get('/api/users/omar_own/public');
    expect(pubAfterMutual.body.data.trust.ratingCount).toBe(1);
    expect(pubAfterMutual.body.data.trust.averageStars).toBe(2);

    // Second swap: one-sided rating older than 7 days becomes visible
    const item2 = await createTestItem(owner.user._id, { title: 'Canvas Tote' });
    const swap2 = await createCompletedRedeemSwap({
      requester: requester.user,
      owner: owner.user,
      item: item2
    });

    await request(app)
      .post(`/api/swaps/${swap2._id}/rate`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({ stars: 5, matchStatus: 'yes', comment: 'Great tote' });

    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await Rating.collection.updateOne(
      { swapId: swap2._id, raterId: requester.user._id },
      { $set: { createdAt: eightDaysAgo } }
    );

    const revealedByAge = await request(app)
      .get(`/api/swaps/${swap2._id}/ratings`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(revealedByAge.status).toBe(200);
    expect(revealedByAge.body.data.ratings).toHaveLength(1);
    expect(revealedByAge.body.data.ratings[0].stars).toBe(5);
  });

  test('computes trust summary accurately, exposes safe public profile, and attaches owner trust on items', async () => {
    const owner = await createTestUser({
      username: 'hana_tailor',
      email: 'hana.private@example.com',
      points: 420,
      profile: { location: 'Ahmedabad', bio: 'Curated linen & wool.' }
    });
    const rater1 = await createTestUser({ username: 'rater_one' });
    const rater2 = await createTestUser({ username: 'rater_two' });
    const rater3 = await createTestUser({ username: 'rater_three' });

    const activeItem = await createTestItem(owner.user._id, { title: 'Raw Selvedge Jeans', status: 'available' });
    const hiddenPendingItem = await createTestItem(owner.user._id, { title: 'Pending Coat', status: 'pending' });
    const swappedItem = await createTestItem(owner.user._id, { title: 'Swapped Vest', status: 'swapped' });

    const nineDaysAgo = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);
    await Rating.create([
      {
        swapId: (await createCompletedRedeemSwap({ requester: rater1.user, owner: owner.user, item: activeItem }))._id,
        raterId: rater1.user._id,
        rateeId: owner.user._id,
        stars: 5,
        matchStatus: 'yes',
        createdAt: nineDaysAgo
      },
      {
        swapId: (await createCompletedRedeemSwap({ requester: rater2.user, owner: owner.user, item: hiddenPendingItem }))._id,
        raterId: rater2.user._id,
        rateeId: owner.user._id,
        stars: 4,
        matchStatus: 'small_differences',
        createdAt: nineDaysAgo
      },
      {
        swapId: (await createCompletedRedeemSwap({ requester: rater3.user, owner: owner.user, item: swappedItem }))._id,
        raterId: rater3.user._id,
        rateeId: owner.user._id,
        stars: 1,
        matchStatus: 'no',
        createdAt: nineDaysAgo
      }
    ]);

    // Public profile endpoint
    const pubRes = await request(app).get('/api/users/hana_tailor/public');
    expect(pubRes.status).toBe(200);
    const profile = pubRes.body.data;
    expect(profile.username).toBe('hana_tailor');
    expect(profile.city).toBe('Ahmedabad');
    expect(profile.memberSince).toBeDefined();
    expect(profile.email).toBeUndefined();
    expect(profile.points).toBeUndefined();
    expect(profile.password).toBeUndefined();
    expect(profile.trust).toMatchObject({
      averageStars: 3.3,
      ratingCount: 3,
      matchedCount: 1
    });
    expect(profile.listings).toHaveLength(1);
    expect(profile.listings[0].title).toBe('Raw Selvedge Jeans');
    expect(profile.stats).toMatchObject({ listed: 1, swapsDone: 0, redeemed: 0 });
    expect(profile.ratings).toHaveLength(3);
    expect(profile.ratings[0]).toMatchObject({
      stars: expect.any(Number),
      matchStatus: expect.any(String),
      rater: { username: expect.any(String) }
    });
    expect(profile.ratings[0].rater.email).toBeUndefined();

    const missingUserRes = await request(app).get('/api/users/does_not_exist/public');
    expect(missingUserRes.status).toBe(404);

    // Item detail + item list populate owner rating average + count without leaking private fields
    const listRes = await request(app).get('/api/items');
    expect(listRes.status).toBe(200);
    const listedOwner = listRes.body.data.find((i) => i._id === activeItem._id.toString()).userId;
    expect(listedOwner.trustSummary).toMatchObject({ averageStars: 3.3, ratingCount: 3 });
    expect(listedOwner.email).toBeUndefined();
    expect(listedOwner.points).toBeUndefined();

    const detailRes = await request(app).get(`/api/items/${activeItem._id}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.userId.trustSummary).toMatchObject({ averageStars: 3.3, ratingCount: 3 });
    expect(detailRes.body.data.userId.email).toBeUndefined();
    expect(detailRes.body.data.userId.points).toBeUndefined();
  });

  test('opens mismatch report on "no" within 7 days and resolves admin refund (exact + shortfall) or dismiss', async () => {
    const admin = await createTestUser({ username: 'admin_mod', isAdmin: true, points: 0 });
    const receiver = await createTestUser({ username: 'dev_receiver', points: 20 });
    const giver = await createTestUser({ username: 'tara_giver', points: 100 });
    const item = await createTestItem(giver.user._id, { title: 'Silk Scarf', pointsValue: 60 });

    const swap = await createCompletedRedeemSwap({
      requester: receiver.user,
      owner: giver.user,
      item,
      pointsOffered: 60
    });

    // Answering "no" within 7 days requires reason
    const missingReason = await request(app)
      .post(`/api/swaps/${swap._id}/rate`)
      .set('Authorization', `Bearer ${receiver.token}`)
      .send({ stars: 1, matchStatus: 'no' });
    expect(missingReason.status).toBe(400);

    // Answering "no" with valid reason opens mismatch report
    const reportRes = await request(app)
      .post(`/api/swaps/${swap._id}/rate`)
      .set('Authorization', `Bearer ${receiver.token}`)
      .send({
        stars: 1,
        matchStatus: 'no',
        reason: 'Large snag and stain on the front panel not shown in listing.'
      });
    expect(reportRes.status).toBe(201);
    expect(reportRes.body.data.mismatchReport).toBeDefined();
    expect(reportRes.body.data.mismatchReport.status).toBe('open');
    const reportId = reportRes.body.data.mismatchReport._id;

    // Non-admin cannot resolve
    const nonAdminResolve = await request(app)
      .put(`/api/admin/mismatch-reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${receiver.token}`)
      .send({ action: 'refund' });
    expect(nonAdminResolve.status).toBe(403);

    // Concurrent admin refund executes atomically ONLY ONCE
    const [resA, resB] = await Promise.all([
      request(app)
        .put(`/api/admin/mismatch-reports/${reportId}/resolve`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ action: 'refund', adminNotes: 'Verified photo evidence' }),
      request(app)
        .put(`/api/admin/mismatch-reports/${reportId}/resolve`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ action: 'refund', adminNotes: 'Verified photo evidence' })
    ]);
    const statuses = [resA.status, resB.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 400]);

    const okRefund = resA.status === 200 ? resA : resB;
    expect(okRefund.body.data.status).toBe('refunded');
    expect(okRefund.body.data.refundApplied).toBe(60);
    expect(okRefund.body.data.shortfall).toBe(0);

    const updatedGiver = await User.findById(giver.user._id);
    const updatedReceiver = await User.findById(receiver.user._id);
    expect(updatedGiver.points).toBe(40);
    expect(updatedReceiver.points).toBe(80);

    const txRows = await PointsTransaction.find({ relatedSwapId: swap._id });
    expect(txRows).toHaveLength(2);

    // Shortfall case: giver has 25 points for a 60-point swap -> giver goes to 0 (never negative), shortfall 35
    const lowGiver = await createTestUser({ username: 'low_giver', points: 25 });
    const rec2 = await createTestUser({ username: 'rec_shortfall', points: 10 });
    const item2 = await createTestItem(lowGiver.user._id, { title: 'Cashmere Scarf', pointsValue: 60 });
    const swap2 = await createCompletedRedeemSwap({
      requester: rec2.user,
      owner: lowGiver.user,
      item: item2,
      pointsOffered: 60
    });
    const r2 = await request(app)
      .post(`/api/swaps/${swap2._id}/rate`)
      .set('Authorization', `Bearer ${rec2.token}`)
      .send({ stars: 1, matchStatus: 'no', reason: 'Wrong size tag and shrinkage.' });
    expect(r2.status).toBe(201);

    const shortfallResolve = await request(app)
      .put(`/api/admin/mismatch-reports/${r2.body.data.mismatchReport._id}/resolve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ action: 'refund' });
    expect(shortfallResolve.status).toBe(200);
    expect(shortfallResolve.body.data.refundApplied).toBe(25);
    expect(shortfallResolve.body.data.shortfall).toBe(35);

    const lowGiverAfter = await User.findById(lowGiver.user._id);
    const rec2After = await User.findById(rec2.user._id);
    expect(lowGiverAfter.points).toBe(0);
    expect(rec2After.points).toBe(35);

    // Dismiss case: changes no points
    const giver3 = await createTestUser({ username: 'giver_dismiss', points: 90 });
    const rec3 = await createTestUser({ username: 'rec_dismiss', points: 30 });
    const item3 = await createTestItem(giver3.user._id, { title: 'Pleated Skirt', pointsValue: 50 });
    const swap3 = await createCompletedRedeemSwap({
      requester: rec3.user,
      owner: giver3.user,
      item: item3,
      pointsOffered: 50
    });
    const r3 = await request(app)
      .post(`/api/swaps/${swap3._id}/rate`)
      .set('Authorization', `Bearer ${rec3.token}`)
      .send({ stars: 2, matchStatus: 'no', reason: 'Colour felt slightly darker in indoor light.' });
    expect(r3.status).toBe(201);

    const dismissRes = await request(app)
      .put(`/api/admin/mismatch-reports/${r3.body.data.mismatchReport._id}/resolve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ action: 'dismiss', adminNotes: 'Matched photos under daylight' });
    expect(dismissRes.status).toBe(200);
    expect(dismissRes.body.data.status).toBe('dismissed');

    expect((await User.findById(giver3.user._id)).points).toBe(90);
    expect((await User.findById(rec3.user._id)).points).toBe(30);

    // Answering "no" after 7 days since completion does NOT create a mismatch report
    const giver4 = await createTestUser({ username: 'giver_old', points: 50 });
    const rec4 = await createTestUser({ username: 'rec_old', points: 50 });
    const item4 = await createTestItem(giver4.user._id, { title: 'Old Swap Jacket', pointsValue: 50 });
    const oldSwap = await createCompletedRedeemSwap({
      requester: rec4.user,
      owner: giver4.user,
      item: item4,
      pointsOffered: 50,
      completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    });
    const lateRate = await request(app)
      .post(`/api/swaps/${oldSwap._id}/rate`)
      .set('Authorization', `Bearer ${rec4.token}`)
      .send({ stars: 2, matchStatus: 'no', reason: 'Late wear noted.' });
    expect(lateRate.status).toBe(201);
    expect(lateRate.body.data.mismatchReport).toBeNull();
  });

  test('computes public profile swapsDone and redeemed accurately from Swap documents', async () => {
    const target = await createTestUser({ username: 'stats_member', stats: { swapsCompleted: 99, itemsReceived: 88 } });
    const peerA = await createTestUser({ username: 'stats_peer_a' });
    const peerB = await createTestUser({ username: 'stats_peer_b' });

    const targetItem = await createTestItem(target.user._id, { title: 'Target Jacket', status: 'available' });
    const peerItem = await createTestItem(peerA.user._id, { title: 'Peer Trousers', status: 'available' });

    await Swap.create([
      // Completed swap as owner -> counts toward swapsDone (1)
      {
        requesterId: peerA.user._id,
        itemOwnerId: target.user._id,
        itemId: targetItem._id,
        requestedItemId: peerItem._id,
        type: 'swap',
        status: 'completed',
        completedAt: new Date()
      },
      // Completed swap as requester -> counts toward swapsDone (2)
      {
        requesterId: target.user._id,
        itemOwnerId: peerA.user._id,
        itemId: peerItem._id,
        requestedItemId: targetItem._id,
        type: 'swap',
        status: 'completed',
        completedAt: new Date()
      },
      // Completed redeem as requester -> counts toward redeemed (1)
      {
        requesterId: target.user._id,
        itemOwnerId: peerB.user._id,
        itemId: peerItem._id,
        type: 'redeem',
        status: 'completed',
        pointsOffered: 40,
        completedAt: new Date()
      },
      // Completed redeem as owner -> must NOT count toward redeemed or swapsDone
      {
        requesterId: peerB.user._id,
        itemOwnerId: target.user._id,
        itemId: targetItem._id,
        type: 'redeem',
        status: 'completed',
        pointsOffered: 50,
        completedAt: new Date()
      },
      // Pending swap -> must NOT count
      {
        requesterId: peerA.user._id,
        itemOwnerId: target.user._id,
        itemId: targetItem._id,
        requestedItemId: peerItem._id,
        type: 'swap',
        status: 'pending'
      },
      // Accepted redeem -> must NOT count
      {
        requesterId: target.user._id,
        itemOwnerId: peerA.user._id,
        itemId: peerItem._id,
        type: 'redeem',
        status: 'accepted',
        pointsOffered: 30
      }
    ]);

    const res = await request(app).get('/api/users/stats_member/public');
    expect(res.status).toBe(200);
    expect(res.body.data.stats).toEqual({
      listed: 1,
      swapsDone: 2,
      redeemed: 1
    });
  });
});
