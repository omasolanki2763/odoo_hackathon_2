/**
 * Item Measurements & Fit Label Tests (POST/PUT /api/items, GET /api/items/:id)
 * Covers category-specific measurement schemas/validation, bounds checking,
 * cross-category field rejection (400), optional fit labels, and legacy compatibility.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

const request = require('supertest');
const mongoose = require('mongoose');
const Item = require('../src/models/Item');
const User = require('../src/models/User');
const { generateToken } = require('../src/config/jwt');
const app = require('../src/app');

const TEST_USER_ID = '65f000000000000000000099';
const TEST_ITEM_ID = '65f000000000000000000101';

describe('Item measurements per category and fit label', () => {
  let authToken;
  let savedItems;

  beforeEach(() => {
    savedItems = new Map();
    authToken = generateToken(TEST_USER_ID);

    jest.spyOn(User, 'findById').mockImplementation((id) => ({
      select: jest.fn().mockResolvedValue(
        String(id) === TEST_USER_ID
          ? { _id: TEST_USER_ID, username: 'marcus_b', status: 'active' }
          : null
      )
    }));

    jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(null);

    jest.spyOn(Item.prototype, 'save').mockImplementation(async function mockSave() {
      if (!this._id) {
        this._id = new mongoose.Types.ObjectId(TEST_ITEM_ID);
      }
      const err = this.validateSync();
      if (err) throw err;
      const plain = this.toObject();
      savedItems.set(String(this._id), {
        ...plain,
        _id: String(this._id),
        userId: {
          _id: TEST_USER_ID,
          username: 'marcus_b',
          firstName: 'Marcus',
          lastName: 'B',
          createdAt: new Date('2024-03-15T00:00:00Z')
        }
      });
      return this;
    });

    jest.spyOn(Item, 'findById').mockImplementation((id) => {
      const stored = savedItems.get(String(id)) || null;
      return {
        populate: jest.fn().mockResolvedValue(stored)
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Mongoose schema validation', () => {
    it('supports category measurement paths and fit note while keeping legacy items valid', () => {
      const legacyItem = new Item({
        userId: TEST_USER_ID,
        title: 'Legacy Jacket',
        description: 'Existing listing with no measurements or fit field.',
        category: 'outerwear',
        size: 'M',
        condition: 'good',
        gender: 'unisex',
        pointsValue: 50
      });
      expect(legacyItem.validateSync()).toBeUndefined();

      expect(Item.schema.path('fit')).toBeDefined();
      expect(Item.schema.path('measurements.shoulder')).toBeDefined();
      expect(Item.schema.path('measurements.sleeve')).toBeDefined();
      expect(Item.schema.path('measurements.inseam')).toBeDefined();
      expect(Item.schema.path('measurements.rise')).toBeDefined();
      expect(Item.schema.path('measurements.legOpening')).toBeDefined();
      expect(Item.schema.path('measurements.bust')).toBeDefined();
      expect(Item.schema.path('measurements.euSize')).toBeDefined();
      expect(Item.schema.path('measurements.ukSize')).toBeDefined();
      expect(Item.schema.path('measurements.insoleLength')).toBeDefined();
    });

    it('enforces Mongoose min/max and category rules directly on schema validateSync', () => {
      const negativeChest = new Item({
        userId: TEST_USER_ID,
        title: 'Bad Measurement Shirt',
        description: 'Contains impossible negative measurement value.',
        category: 'tops',
        size: 'M',
        condition: 'good',
        gender: 'unisex',
        pointsValue: 40,
        measurements: { chest: -5 }
      });
      expect(negativeChest.validateSync()).toBeDefined();

      const hugeChest = new Item({
        userId: TEST_USER_ID,
        title: 'Huge Measurement Shirt',
        description: 'Contains out-of-range huge measurement value.',
        category: 'tops',
        size: 'M',
        condition: 'good',
        gender: 'unisex',
        pointsValue: 40,
        measurements: { chest: 999 }
      });
      expect(hugeChest.validateSync()).toBeDefined();
    });
  });

  describe('POST /api/items and GET /api/items/:id per-category measurements', () => {
    const validByCategory = [
      {
        category: 'outerwear',
        size: 'L',
        fit: 'runs-large',
        measurements: { chest: 56, length: 70, shoulder: 49, sleeve: 63, unit: 'cm' }
      },
      {
        category: 'tops',
        size: 'M',
        fit: 'true',
        measurements: { chest: 52, length: 68, shoulder: 45, sleeve: 61, unit: 'cm' }
      },
      {
        category: 'bottoms',
        size: '32',
        fit: 'runs-small',
        measurements: { waist: 82, inseam: 78, rise: 28, legOpening: 19, unit: 'cm' }
      },
      {
        category: 'dresses',
        size: 'S',
        fit: 'true',
        measurements: { bust: 88, waist: 70, length: 108, unit: 'cm' }
      },
      {
        category: 'shoes',
        size: '9',
        fit: 'true',
        measurements: { euSize: 42, ukSize: 8, insoleLength: 27, unit: 'cm' }
      }
    ];

    it.each(validByCategory)(
      'saves valid $category measurements and returns them via GET /api/items/:id',
      async ({ category, size, fit, measurements }) => {
        const createRes = await request(app)
          .post('/api/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Test ${category} garment`,
            description: 'Well-cared community piece with full flat measurements.',
            category,
            size,
            fit,
            condition: 'like-new',
            gender: 'unisex',
            pointsValue: 65,
            measurements
          });

        expect(createRes.status).toBe(201);
        expect(createRes.body.data.fit).toBe(fit);
        expect(createRes.body.data.measurements).toMatchObject(measurements);

        const createdId = createRes.body.data._id;
        const getRes = await request(app).get(`/api/items/${createdId}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body.data.fit).toBe(fit);
        expect(getRes.body.data.measurements).toMatchObject(measurements);
      }
    );

    it('rejects measurement fields belonging to a wrong category with 400', async () => {
      const wrongCases = [
        { category: 'tops', measurements: { inseam: 80 } },
        { category: 'bottoms', measurements: { chest: 54 } },
        { category: 'dresses', measurements: { euSize: 40 } },
        { category: 'shoes', measurements: { bust: 90 } }
      ];

      for (const { category, measurements } of wrongCases) {
        const res = await request(app)
          .post('/api/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Invalid ${category} item`,
            description: 'Testing category mismatch measurement validation.',
            category,
            size: 'M',
            condition: 'good',
            gender: 'unisex',
            pointsValue: 50,
            measurements
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });

    it('rejects negative, zero, huge measurements, and invalid fit values with 400', async () => {
      const badPayloads = [
        { category: 'tops', measurements: { chest: -10 } },
        { category: 'tops', measurements: { length: 0 } },
        { category: 'bottoms', measurements: { waist: 900 } },
        { category: 'shoes', measurements: { insoleLength: 100 } },
        { category: 'tops', fit: 'oversized-unknown', measurements: { chest: 54 } }
      ];

      for (const payload of badPayloads) {
        const res = await request(app)
          .post('/api/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Invalid Bounds Item',
            description: 'Testing negative and oversized measurement validation.',
            size: 'M',
            condition: 'good',
            gender: 'unisex',
            pointsValue: 50,
            ...payload
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });

    it('validates measurements on PUT /api/items/:id when category and measurements are updated', async () => {
      const res = await request(app)
        .put(`/api/items/${TEST_ITEM_ID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'bottoms',
          measurements: { sleeve: 60 }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
