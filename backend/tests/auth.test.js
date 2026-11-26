/**
 * Auth & Welcome Points Tests (POST /api/auth/register, POST /api/auth/login)
 * Uses mocked Mongoose models since tests run without an active MongoDB daemon.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const PointsTransaction = require('../src/models/PointsTransaction');
const Notification = require('../src/models/Notification');
const app = require('../src/app');

describe('Auth routes & starter points', () => {
  let savedUsers;
  let createdTransactions;
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    savedUsers = [];
    createdTransactions = [];

    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-auth-suite';

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    jest.spyOn(Notification, 'createNotification').mockResolvedValue({ _id: 'notif-1' });
    jest.spyOn(User, 'findByIdAndDelete').mockImplementation(async (id) => {
      savedUsers = savedUsers.filter((u) => String(u._id) !== String(id));
      return null;
    });
    jest.spyOn(PointsTransaction, 'deleteOne').mockImplementation(async (query) => {
      createdTransactions = createdTransactions.filter((t) => String(t._id) !== String(query._id));
      return { deletedCount: 1 };
    });

    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      let matched = null;
      if (query.$or) {
        const emailCond = query.$or.find((c) => c.email)?.email;
        const usernameCond = query.$or.find((c) => c.username)?.username;
        matched = savedUsers.find(
          (u) => (emailCond && u.email === emailCond) || (usernameCond && u.username === usernameCond)
        ) || null;
      } else if (query.email) {
        matched = savedUsers.find((u) => u.email === query.email) || null;
      }

      const queryObj = {
        select: jest.fn().mockResolvedValue(matched),
        then: (resolve, reject) => Promise.resolve(matched).then(resolve, reject)
      };
      return queryObj;
    });

    jest.spyOn(User.prototype, 'save').mockImplementation(async function mockSave() {
      const existingIdx = savedUsers.findIndex((u) => String(u._id) === String(this._id));
      if (existingIdx === -1) {
        // Simulate hashed password like UserSchema pre-save hook
        this._hashedPassword = await bcrypt.hash(this.password, 4);
        const storedRecord = this;
        storedRecord.comparePassword = (candidate) => bcrypt.compare(candidate, storedRecord._hashedPassword);
        savedUsers.push(storedRecord);
      } else {
        savedUsers[existingIdx] = this;
      }
      return this;
    });

    jest.spyOn(PointsTransaction, 'createTransaction').mockImplementation(
      async (userId, type, amount, description, options = {}) => {
        const tx = {
          _id: `tx-${createdTransactions.length + 1}`,
          userId,
          type,
          amount,
          description,
          balance: options.balance,
          metadata: options.metadata
        };
        createdTransactions.push(tx);
        return tx;
      }
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

      expect(PointsTransaction.createTransaction).toHaveBeenCalledTimes(1);
      expect(createdTransactions).toHaveLength(1);
      expect(createdTransactions[0]).toMatchObject({
        userId: savedUsers[0]._id,
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
      PointsTransaction.createTransaction.mockRejectedValueOnce(new Error('Transaction write failed'));

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      // Either rolled back completely or left at 0 points — never 100 unexplained points
      expect(savedUsers.every((u) => u.points === 0)).toBe(true);
      expect(savedUsers).toHaveLength(0);
    });

    test('returns 400 on duplicate email without crediting a second time', async () => {
      await request(app).post('/api/auth/register').send(validPayload);
      expect(createdTransactions).toHaveLength(1);

      const dupRes = await request(app)
        .post('/api/auth/register')
        .send({
          ...validPayload,
          username: 'clara_two'
        });

      expect(dupRes.status).toBe(400);
      expect(dupRes.body.success).toBe(false);
      expect(savedUsers).toHaveLength(1);
      expect(createdTransactions).toHaveLength(1);
    });

    test('returns 400 on duplicate username without crediting a second time', async () => {
      await request(app).post('/api/auth/register').send(validPayload);
      expect(createdTransactions).toHaveLength(1);

      const dupRes = await request(app)
        .post('/api/auth/register')
        .send({
          ...validPayload,
          email: 'other@rewear.community'
        });

      expect(dupRes.status).toBe(400);
      expect(dupRes.body.success).toBe(false);
      expect(savedUsers).toHaveLength(1);
      expect(createdTransactions).toHaveLength(1);
    });
  });

  describe('POST /api/auth/login', () => {
    test('returns 200 with token and user excluding password on valid login, and never logs secrets', async () => {
      const registerPayload = {
        username: 'clara_mends',
        email: 'clara@rewear.community',
        password: 'Password1',
        confirmPassword: 'Password1'
      };
      await request(app).post('/api/auth/register').send(registerPayload);
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
      await request(app)
        .post('/api/auth/register')
        .send({
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
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'clara_mends',
          email: 'clara@rewear.community',
          password: 'Password1',
          confirmPassword: 'Password1'
        });
      savedUsers[0].status = 'suspended';

      const wrongPassSuspendedRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'clara@rewear.community', password: 'WrongPassword9' });

      expect(wrongPassSuspendedRes.status).toBe(401);
      expect(wrongPassSuspendedRes.body.message).toBe('Invalid email or password');
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
