/**
 * Catalogue Filter & Validation Tests (GET /api/items)
 * Covers whitelisted query filters, combined filters, sorting, regex escaping,
 * operator injection rejection (400), invalid param rejection (400), and pagination bounds.
 */

const request = require('supertest');
const Item = require('../src/models/Item');
const itemService = require('../src/services/itemService');
const app = require('../src/app');

const SAMPLE_ITEMS = [
  {
    _id: '65f000000000000000000001',
    title: 'Vintage Denim Chore Jacket',
    description: 'Sturdy brass tack buttons, daylight patina on cuffs.',
    category: 'outerwear',
    size: 'M',
    condition: 'like-new',
    gender: 'unisex',
    brand: "Levi's",
    colour: 'blue',
    material: 'denim',
    tags: ['denim', 'jacket'],
    pointsValue: 75,
    status: 'available',
    createdAt: new Date('2026-11-20T10:00:00Z')
  },
  {
    _id: '65f000000000000000000002',
    title: 'Fisherman Wool Ribbed Knit',
    description: 'Heavyweight Shetland wool sweater in deep navy stripes.',
    category: 'tops',
    size: 'L',
    condition: 'good',
    gender: 'men',
    brand: 'Donegal Mills',
    colour: 'navy',
    material: 'wool',
    tags: ['knit', 'wool'],
    pointsValue: 60,
    status: 'available',
    createdAt: new Date('2026-11-22T10:00:00Z')
  },
  {
    _id: '65f000000000000000000003',
    title: 'Long Leather Trench Coat',
    description: 'Full-length black leather coat with natural fade.',
    category: 'outerwear',
    size: 'XL',
    condition: 'fair',
    gender: 'unisex',
    brand: 'AllSaints',
    colour: 'black',
    material: 'leather',
    tags: ['coat', 'trench'],
    pointsValue: 110,
    status: 'available',
    createdAt: new Date('2026-11-18T10:00:00Z')
  },
  {
    _id: '65f000000000000000000004',
    title: 'Crisp Oxford Button-Down Shirt',
    description: 'Breathable organic cotton oxford, unworn condition.',
    category: 'tops',
    size: 'M',
    condition: 'new',
    gender: 'men',
    brand: 'Brooks Brothers',
    colour: 'white',
    material: 'cotton',
    tags: ['oxford', 'shirt'],
    pointsValue: 50,
    status: 'available',
    createdAt: new Date('2026-11-24T10:00:00Z')
  },
  {
    _id: '65f000000000000000000005',
    title: 'Pleated Scarf [Limited+Edition]',
    description: 'Hand-loomed olive linen wrap with raw selvedge edge.',
    category: 'accessories',
    size: 'One Size',
    condition: 'worn',
    gender: 'women',
    brand: 'Loom & Co.',
    colour: 'olive',
    material: 'linen',
    tags: ['scarf', 'linen'],
    pointsValue: 25,
    status: 'available',
    createdAt: new Date('2026-11-15T10:00:00Z')
  }
];

function matchesCondition(value, cond) {
  if (cond instanceof RegExp) {
    if (Array.isArray(value)) return value.some((v) => cond.test(String(v)));
    return value != null && cond.test(String(value));
  }
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    if (cond.$in) {
      return cond.$in.some((candidate) => matchesCondition(value, candidate));
    }
    if (cond.$gte !== undefined && !(value >= cond.$gte)) return false;
    if (cond.$lte !== undefined && !(value <= cond.$lte)) return false;
    return true;
  }
  return value === cond;
}

function evaluateQuery(items, query) {
  return items.filter((item) => {
    for (const [key, cond] of Object.entries(query)) {
      if (key === '$or') {
        const anyMatch = cond.some((branch) =>
          Object.entries(branch).every(([fKey, fCond]) => matchesCondition(item[fKey], fCond))
        );
        if (!anyMatch) return false;
      } else if (!matchesCondition(item[key], cond)) {
        return false;
      }
    }
    return true;
  });
}

describe('GET /api/items catalogue filters and validation', () => {
  let lastQuery;
  let lastSort;
  let lastLimit;

  beforeEach(() => {
    lastQuery = null;
    lastSort = null;
    lastLimit = null;

    jest.spyOn(Item, 'find').mockImplementation((query) => {
      lastQuery = query;
      let results = [...evaluateQuery(SAMPLE_ITEMS, query)];
      let skipVal = 0;
      let limitVal = results.length;

      const chain = {
        populate: jest.fn(() => chain),
        sort: jest.fn((sortObj) => {
          lastSort = sortObj;
          const entries = Object.entries(sortObj || {});
          results.sort((a, b) => {
            for (const [field, dir] of entries) {
              const av = a[field] instanceof Date ? a[field].getTime() : a[field];
              const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
              if (av < bv) return dir >= 0 ? -1 : 1;
              if (av > bv) return dir >= 0 ? 1 : -1;
            }
            return 0;
          });
          return chain;
        }),
        skip: jest.fn((n) => {
          skipVal = n;
          return chain;
        }),
        limit: jest.fn((n) => {
          lastLimit = n;
          limitVal = n;
          return chain;
        }),
        then: (resolve, reject) =>
          Promise.resolve(results.slice(skipVal, skipVal + limitVal)).then(resolve, reject)
      };

      return chain;
    });

    jest.spyOn(Item, 'countDocuments').mockImplementation(async (query) => {
      return evaluateQuery(SAMPLE_ITEMS, query).length;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Item schema extensions', () => {
    it('defines optional colour and material fields on the Item schema', () => {
      expect(Item.schema.path('colour')).toBeDefined();
      expect(Item.schema.path('material')).toBeDefined();
    });
  });

  describe('Individual and combined filters', () => {
    it('filters by category', async () => {
      const res = await request(app).get('/api/items?category=outerwear');
      expect(res.status).toBe(200);
      expect(res.body.data.map((i) => i.title)).toEqual([
        'Vintage Denim Chore Jacket',
        'Long Leather Trench Coat'
      ]);
    });

    it('filters by single and comma-separated size', async () => {
      const res = await request(app).get('/api/items?size=M,L');
      expect(res.status).toBe(200);
      expect(res.body.data.map((i) => i.size).sort()).toEqual(['L', 'M', 'M']);
    });

    it('filters by single and comma-separated condition', async () => {
      const res = await request(app).get('/api/items?condition=good,fair');
      expect(res.status).toBe(200);
      expect(res.body.data.map((i) => i.condition).sort()).toEqual(['fair', 'good']);
    });

    it('filters by minPoints and maxPoints inclusive', async () => {
      const res = await request(app).get('/api/items?minPoints=50&maxPoints=80');
      expect(res.status).toBe(200);
      expect(res.body.data.every((i) => i.pointsValue >= 50 && i.pointsValue <= 80)).toBe(true);
      expect(res.body.data).toHaveLength(3);
    });

    it('filters by colour (case-insensitive)', async () => {
      const res = await request(app).get('/api/items?colour=Olive');
      expect(res.status).toBe(200);
      expect(res.body.data.map((i) => i.title)).toEqual(['Pleated Scarf [Limited+Edition]']);
    });

    it('filters by material (case-insensitive)', async () => {
      const res = await request(app).get('/api/items?material=wool,denim');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('filters by brand', async () => {
      const res = await request(app).get('/api/items?brand=Donegal');
      expect(res.status).toBe(200);
      expect(res.body.data.map((i) => i.brand)).toEqual(['Donegal Mills']);
    });

    it('filters by text search and escapes regex metacharacters safely', async () => {
      const res = await request(app).get('/api/items?search=' + encodeURIComponent('[Limited+Edition]'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Pleated Scarf [Limited+Edition]');

      const trickyRes = await request(app).get('/api/items?search=' + encodeURIComponent('.*+?^${}()|[]\\'));
      expect(trickyRes.status).toBe(200);
      expect(trickyRes.body.data).toEqual([]);
    });

    it('combines multiple filters in one query', async () => {
      const res = await request(app).get(
        '/api/items?category=outerwear&size=M&minPoints=40&maxPoints=90&colour=blue&material=denim&brand=Levi'
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Vintage Denim Chore Jacket');
    });
  });

  describe('Sorting', () => {
    it('sorts by newest by default and when sort=newest', async () => {
      const res = await request(app).get('/api/items?sort=newest');
      expect(res.status).toBe(200);
      expect(lastSort).toEqual({ createdAt: -1 });
      expect(res.body.data[0].title).toBe('Crisp Oxford Button-Down Shirt');
    });

    it('sorts by points ascending when sort=points_asc', async () => {
      const res = await request(app).get('/api/items?sort=points_asc');
      expect(res.status).toBe(200);
      expect(lastSort).toEqual({ pointsValue: 1, createdAt: -1 });
      expect(res.body.data.map((i) => i.pointsValue)).toEqual([25, 50, 60, 75, 110]);
    });

    it('sorts by points descending when sort=points_desc', async () => {
      const res = await request(app).get('/api/items?sort=points_desc');
      expect(res.status).toBe(200);
      expect(lastSort).toEqual({ pointsValue: -1, createdAt: -1 });
      expect(res.body.data.map((i) => i.pointsValue)).toEqual([110, 75, 60, 50, 25]);
    });
  });

  describe('Boundary validation and injection rejection', () => {
    it('rejects NoSQL operator injection attempts with 400 and never calls Item.find', async () => {
      const payloads = [
        '/api/items?category[$ne]=outerwear',
        '/api/items?size[$gt]=A',
        '/api/items?condition[$in][]=good',
        '/api/items?brand[$regex]=.*',
        '/api/items?minPoints[$ne]=0',
        '/api/items?search[$ne]=foo',
        '/api/items?$where=true'
      ];

      for (const url of payloads) {
        const res = await request(app).get(url);
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(lastQuery).toBeNull();
      }
    });

    it('rejects unknown query params and invalid enum/range values with 400', async () => {
      const invalidUrls = [
        '/api/items?category=electronics',
        '/api/items?condition=broken',
        '/api/items?sort=price_up',
        '/api/items?minPoints=-10',
        '/api/items?minPoints=100&maxPoints=20',
        '/api/items?unknownField=test'
      ];

      for (const url of invalidUrls) {
        const res = await request(app).get(url);
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });

    it('enforces pagination bounds at API boundary and clamps in itemService', async () => {
      const badPage = await request(app).get('/api/items?page=0');
      expect(badPage.status).toBe(400);

      const badLimit = await request(app).get('/api/items?limit=100');
      expect(badLimit.status).toBe(400);

      const clamped = await itemService.getItems({}, 0, 500);
      expect(lastLimit).toBe(50);
      expect(clamped.pagination.currentPage).toBe(1);
      expect(clamped.pagination.itemsPerPage).toBe(50);
    });
  });

  describe('GET /api/items/search dedicated q validator', () => {
    it('returns 200 with matching items for /api/items/search?q=denim', async () => {
      const res = await request(app).get('/api/items/search?q=denim');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Vintage Denim Chore Jacket');
    });

    it('rejects missing q or operator injection on /api/items/search with 400', async () => {
      const missingRes = await request(app).get('/api/items/search');
      expect(missingRes.status).toBe(400);
      expect(missingRes.body.success).toBe(false);

      const injRes = await request(app).get('/api/items/search?q[$ne]=denim');
      expect(injRes.status).toBe(400);
      expect(injRes.body.success).toBe(false);
      expect(lastQuery).toBeNull();
    });
  });
});
