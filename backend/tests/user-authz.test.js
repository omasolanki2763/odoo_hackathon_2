/**
 * Authorisation tests for the /api/users/:id routes.
 *
 * Proves two things: a member can only read their own private data (profile,
 * items, swaps, points, notifications), and the profile update endpoint only
 * changes the public profile fields, so nobody can grant themselves admin
 * rights, points, a new email or an unhashed password through it.
 * Runs against the in-memory Mongo harness in tests/setup.js.
 */
const request = require('supertest');
const { connect, disconnect } = require('./setup');
const { generateToken } = require('../src/config/jwt');
const User = require('../src/models/User');
const app = require('../src/app');

jest.setTimeout(120000);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-user-authz';
  await connect();
});

afterAll(disconnect);

let userCounter = 0;

/**
 * Creates a member and a JWT that acts as them.
 * @param {object} overrides User fields to override (isAdmin, points...)
 * @returns {Promise<{user: object, token: string}>} the stored user and its token
 */
const createMember = async (overrides = {}) => {
  userCounter += 1;
  const user = await User.create({
    username: `authz_member_${userCounter}`,
    email: `authz_member_${userCounter}@rewear.community`,
    password: 'Password1',
    points: 100,
    ...overrides
  });
  return { user, token: generateToken(user._id) };
};

// Every private per-member route; each must answer only its owner or an admin.
const PRIVATE_PATHS = ['', '/items', '/swaps', '/points', '/notifications'];

describe('private member routes', () => {
  test.each(PRIVATE_PATHS)('another member cannot read /api/users/:id%s', async (suffix) => {
    const owner = await createMember();
    const stranger = await createMember();

    const res = await request(app)
      .get(`/api/users/${owner.user._id}${suffix}`)
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(res.status).toBe(403);
  });

  test.each(PRIVATE_PATHS)('the owner can read /api/users/:id%s', async (suffix) => {
    const owner = await createMember();

    const res = await request(app)
      .get(`/api/users/${owner.user._id}${suffix}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
  });

  test('an admin can read another member profile', async () => {
    const owner = await createMember();
    const adminUser = await createMember({ isAdmin: true });

    const res = await request(app)
      .get(`/api/users/${owner.user._id}`)
      .set('Authorization', `Bearer ${adminUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.password).toBeUndefined();
  });
});

describe('PUT /api/users/:id', () => {
  test('ignores privileged fields and only saves the public profile', async () => {
    const member = await createMember();

    const res = await request(app)
      .put(`/api/users/${member.user._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        firstName: 'Clara',
        profile: { bio: 'Knits and denim.', location: 'Bengaluru' },
        isAdmin: true,
        points: 99999,
        status: 'active',
        email: 'taken-over@rewear.community',
        password: 'plain-text-password'
      });

    expect(res.status).toBe(200);

    const stored = await User.findById(member.user._id).select('+password');
    expect(stored.firstName).toBe('Clara');
    expect(stored.profile.bio).toBe('Knits and denim.');
    expect(stored.profile.location).toBe('Bengaluru');
    // The fields below are the escalation attempt; none may change.
    expect(stored.isAdmin).toBe(false);
    expect(stored.points).toBe(100);
    expect(stored.email).toBe(member.user.email);
    expect(stored.password).not.toBe('plain-text-password');
    expect(await stored.comparePassword('Password1')).toBe(true);
  });

  test('keeps the join date when the profile is updated', async () => {
    const member = await createMember();
    const before = await User.findById(member.user._id);

    await request(app)
      .put(`/api/users/${member.user._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ profile: { bio: 'Updated bio' } });

    const after = await User.findById(member.user._id);
    expect(after.profile.joinDate.getTime()).toBe(before.profile.joinDate.getTime());
  });

  test('another member cannot update the profile', async () => {
    const owner = await createMember();
    const stranger = await createMember();

    const res = await request(app)
      .put(`/api/users/${owner.user._id}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ firstName: 'Hijacked' });

    expect(res.status).toBe(403);
  });
});
