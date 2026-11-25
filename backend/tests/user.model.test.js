/**
 * User model tests.
 *
 * These cover what the model itself enforces - normalisation, password
 * hashing, defaults and JSON output - because route or controller bugs would
 * otherwise hide a broken model behind a 500.
 */
const mongoose = require('mongoose');
const { connect, disconnect } = require('./setup');
const User = require('../src/models/User');

// Starting mongod and the first bcrypt hash can exceed Jest's 5s default.
jest.setTimeout(120000);

beforeAll(connect);

afterAll(disconnect);

afterEach(async () => {
  await User.deleteMany({});
});

/**
 * Build a valid user payload; tests override only the field they care about.
 * @param {object} overrides fields to replace
 * @returns {object} plain user document data
 */
const validUser = (overrides = {}) => ({
  email: 'clara@example.com',
  password: 'secret123',
  username: 'clara_mends',
  ...overrides
});

describe('User model', () => {
  it('lowercases and trims the email before saving', async () => {
    const user = await User.create(validUser({ email: '  Clara@Example.COM ' }));

    expect(user.email).toBe('clara@example.com');
  });

  it('stores a bcrypt hash instead of the plain password', async () => {
    const user = await User.create(validUser({ password: 'secret123' }));

    expect(user.password).not.toBe('secret123');
    expect(user.password).toMatch(/^\$2[aby]\$/);
    await expect(user.comparePassword('secret123')).resolves.toBe(true);
    await expect(user.comparePassword('wrong-password')).resolves.toBe(false);
  });

  it('applies defaults for a new account', async () => {
    const user = await User.create(validUser());

    expect(user.points).toBe(0);
    expect(user.status).toBe('active');
    expect(user.isAdmin).toBe(false);
    expect(user.isVerified).toBe(false);
    expect(user.stats.itemsUploaded).toBe(0);
    expect(user.profile.joinDate).toBeInstanceOf(Date);
  });

  it('derives firstName and lastName from the username', async () => {
    const user = await User.create(validUser());

    expect(user.firstName).toBe('Clara_mends');
    expect(user.lastName).toBe('User');
  });

  it('omits the password from JSON output', async () => {
    const user = await User.create(validUser());

    const json = user.toJSON();

    expect(json.password).toBeUndefined();
    expect(json.email).toBe('clara@example.com');
    expect(json._id).toBeInstanceOf(mongoose.Types.ObjectId);
  });
});
