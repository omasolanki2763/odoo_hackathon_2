/**
 * Auth & Welcome Points Integration Tests (POST /api/auth/register, POST /api/auth/login)
 * Runs against the shared mongodb-memory-server harness in tests/setup.js.
 */

const request = require('supertest');
const { connect, disconnect } = require('./setup');
const User = require('../src/models/User');
const PointsTransaction = require('../src/models/PointsTransaction');
const Notification = require('../src/models/Notification');
const app = require('../src/app');

jest.setTimeout(120000);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-auth-suite';
  await connect();
});

afterAll(disconnect);

describe('Auth routes & starter points', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await PointsTransaction.deleteMany({});
    await Notification.deleteMany({});
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    const validPayload = {
      username: 'clara_mends',
      email: 'clara@rewear.community',
      password: 'Password1',
      confirmPassword: 'Password1'
    };

    test('creates user with 100 starter points and exactly one "Welcome points" transaction, and never returns password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toEqual(expect.any(String));

      const returnedUser = res.body.data.user;
      expect(returnedUser.username).toBe('clara_mends');
      expect(returnedUser.email).toBe('clara@rewear.community');
      expect(returnedUser.points).toBe(100);
      expect(returnedUser.password).toBeUndefined();

      const savedUser = await User.findById(returnedUser._id);
      expect(savedUser).not.toBeNull();
      expect(savedUser.points).toBe(100);

      const transactions = await PointsTransaction.find({ userId: savedUser._id });
      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({
        type: 'bonus',
        amount: 100,
        balance: 100,
        description: 'Welcome points'
      });

      const loggedOutput = [...logSpy.mock.calls, ...errorSpy.mock.calls]
        .flat()
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');
      expect(loggedOutput).not.toContain(validPayload.password);
      expect(loggedOutput).not.toContain(res.body.data.token);
    });

    test('does not leave user with unexplained points if PointsTransaction write fails', async () => {
      jest
        .spyOn(PointsTransaction, 'createTransaction')
        .mockRejectedValueOnce(new Error('Transaction write failed'));

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');

      const users = await User.find({ email: validPayload.email });
      expect(users.every((u) => u.points === 0)).toBe(true);
      expect(users).toHaveLength(0);
      expect(await PointsTransaction.countDocuments({})).toBe(0);
    });

    test('rolls back transaction and user if crediting starter balance fails', async () => {
      const origSave = User.prototype.save;
      let saveCallCount = 0;
      jest.spyOn(User.prototype, 'save').mockImplementation(function mockCreditFailure(...args) {
        saveCallCount += 1;
        if (saveCallCount === 2) {
          return Promise.reject(new Error('Balance update failed'));
        }
        return origSave.apply(this, args);
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');
      expect(await User.countDocuments({ email: validPayload.email })).toBe(0);
      expect(await PointsTransaction.countDocuments({})).toBe(0);
    });

    test('returns 400 on duplicate email without crediting a second time', async () => {
      const firstRes = await request(app).post('/api/auth/register').send(validPayload);
      expect(firstRes.status).toBe(201);
      expect(await PointsTransaction.countDocuments({})).toBe(1);

      const dupRes = await request(app)
        .post('/api/auth/register')
        .send({
          ...validPayload,
          username: 'clara_two'
        });

      expect(dupRes.status).toBe(400);
      expect(dupRes.body.success).toBe(false);
      expect(await User.countDocuments({})).toBe(1);
      expect(await PointsTransaction.countDocuments({})).toBe(1);
    });

    test('returns 400 on duplicate username without crediting a second time', async () => {
      const firstRes = await request(app).post('/api/auth/register').send(validPayload);
      expect(firstRes.status).toBe(201);
      expect(await PointsTransaction.countDocuments({})).toBe(1);

      const dupRes = await request(app)
        .post('/api/auth/register')
        .send({
          ...validPayload,
          email: 'other@rewear.community'
        });

      expect(dupRes.status).toBe(400);
      expect(dupRes.body.success).toBe(false);
      expect(await User.countDocuments({})).toBe(1);
      expect(await PointsTransaction.countDocuments({})).toBe(1);
    });
  });

  describe('POST /api/auth/login', () => {
    test('returns 200 with token and user excluding password on valid login, and never logs secrets', async () => {
      await request(app).post('/api/auth/register').send({
        username: 'clara_mends',
        email: 'clara@rewear.community',
        password: 'Password1',
        confirmPassword: 'Password1'
      });
      logSpy.mockClear();
      errorSpy.mockClear();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'clara@rewear.community', password: 'Password1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.points).toBe(100);

      const loggedOutput = [...logSpy.mock.calls, ...errorSpy.mock.calls]
        .flat()
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');
      expect(loggedOutput).not.toContain('Password1');
      expect(loggedOutput).not.toContain(res.body.data.token);
    });

    test('returns identical generic error message for unknown email and wrong password (no user enumeration)', async () => {
      await request(app).post('/api/auth/register').send({
        username: 'clara_mends',
        email: 'clara@rewear.community',
        password: 'Password1',
        confirmPassword: 'Password1'
      });

      const unknownEmailRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@rewear.community', password: 'Password1' });

      const wrongPassRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'clara@rewear.community', password: 'WrongPassword9' });

      expect(unknownEmailRes.status).toBe(401);
      expect(wrongPassRes.status).toBe(401);
      expect(unknownEmailRes.body.message).toBe('Invalid email or password');
      expect(wrongPassRes.body.message).toBe(unknownEmailRes.body.message);
    });

    test('does not enumerate suspended account status when password is wrong', async () => {
      await request(app).post('/api/auth/register').send({
        username: 'clara_mends',
        email: 'clara@rewear.community',
        password: 'Password1',
        confirmPassword: 'Password1'
      });
      await User.updateOne({ email: 'clara@rewear.community' }, { status: 'suspended' });

      const wrongPassSuspendedRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'clara@rewear.community', password: 'WrongPassword9' });

      expect(wrongPassSuspendedRes.status).toBe(401);
      expect(wrongPassSuspendedRes.body.message).toBe('Invalid email or password');
    });

    test('returns generic 500 rather than 401 when login hits a database error', async () => {
      jest.spyOn(User, 'findOne').mockReturnValueOnce({
        select: jest.fn().mockRejectedValueOnce(new Error('Mongo connection lost'))
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'clara@rewear.community', password: 'Password1' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');
    });

    test('returns 403 when an inactive account supplies the correct password', async () => {
      await request(app).post('/api/auth/register').send({
        username: 'clara_mends',
        email: 'clara@rewear.community',
        password: 'Password1',
        confirmPassword: 'Password1'
      });
      await User.updateOne({ email: 'clara@rewear.community' }, { status: 'suspended' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'clara@rewear.community', password: 'Password1' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Account is not active');
    });

    test('rate limiter middleware is attached to auth routes', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'missing@rewear.community', password: 'Password1' });

      expect(loginRes.headers['ratelimit-limit']).toBeDefined();
      expect(loginRes.headers['ratelimit-remaining']).toBeDefined();

      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ username: 'bad', email: 'not-an-email', password: 'x', confirmPassword: 'y' });

      expect(registerRes.headers['ratelimit-limit']).toBeDefined();
      expect(registerRes.headers['ratelimit-remaining']).toBeDefined();
    });
  });
});
