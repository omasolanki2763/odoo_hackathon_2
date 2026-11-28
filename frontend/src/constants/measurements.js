/**
 * Shared item constants, upload limits, measurement bounds, and points rules.
 * Mirrors backend/src/utils/constants.js and backend/src/utils/helpers.js.
 */

export const UPLOAD_LIMITS = {
  MAX_FILES: 5,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
};

export const ITEM_CATEGORIES = [
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'tops', label: 'Tops' },
  { value: 'bottoms', label: 'Bottoms' },
  { value: 'dresses', label: 'Dresses' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessories', label: 'Accessories' },
];

export const ITEM_CONDITIONS = [
  { value: 'new', label: 'New / Unworn (10)', note: 'Tags attached or unworn, flawless.' },
  { value: 'like-new', label: 'Like New (9)', note: 'Unworn or washed once, spotless.' },
  { value: 'good', label: 'Good (7-8)', note: 'Gentle wear, clean seams, hardware intact.' },
  { value: 'fair', label: 'Fair / Patina (5-6)', note: 'Visible wear or clean mended repairs.' },
  { value: 'worn', label: 'Well Worn (3-4)', note: 'Heavily worn patina, structurally sound.' },
];

export const ITEM_FIT_OPTIONS = [
  { value: 'runs-small', label: 'Runs small' },
  { value: 'true', label: 'True to size' },
  { value: 'runs-large', label: 'Runs large' },
];

export const ITEM_GENDERS = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
];

export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];

export const MEASUREMENT_FIELD_BOUNDS = {
  chest: { min: 20, max: 250 },
  bust: { min: 20, max: 250 },
  waist: { min: 20, max: 250 },
  length: { min: 5, max: 300 },
  shoulder: { min: 15, max: 120 },
  sleeve: { min: 10, max: 150 },
  inseam: { min: 10, max: 150 },
  rise: { min: 5, max: 80 },
  legOpening: { min: 5, max: 100 },
  width: { min: 1, max: 250 },
  euSize: { min: 15, max: 55 },
  ukSize: { min: 1, max: 20 },
  insoleLength: { min: 10, max: 45 },
};

export const CATEGORY_MEASUREMENT_FIELDS = {
  tops: ['chest', 'length', 'shoulder', 'sleeve'],
  outerwear: ['chest', 'length', 'shoulder', 'sleeve'],
  bottoms: ['waist', 'inseam', 'rise', 'legOpening'],
  dresses: ['bust', 'waist', 'length'],
  shoes: ['euSize', 'ukSize', 'insoleLength'],
  accessories: ['length', 'width'],
};

export const MEASUREMENT_FIELD_META = {
  chest: { label: 'Chest, pit to pit', unit: 'cm', placeholder: '56' },
  bust: { label: 'Bust', unit: 'cm', placeholder: '46' },
  waist: { label: 'Waist, flat', unit: 'cm', placeholder: '40' },
  length: { label: 'Length', unit: 'cm', placeholder: '70' },
  shoulder: { label: 'Shoulder', unit: 'cm', placeholder: '48' },
  sleeve: { label: 'Sleeve', unit: 'cm', placeholder: '64' },
  inseam: { label: 'Inseam', unit: 'cm', placeholder: '78' },
  rise: { label: 'Front rise', unit: 'cm', placeholder: '29' },
  legOpening: { label: 'Leg opening', unit: 'cm', placeholder: '20' },
  width: { label: 'Width', unit: 'cm', placeholder: '32' },
  euSize: { label: 'EU size', unit: '', placeholder: '42' },
  ukSize: { label: 'UK size', unit: '', placeholder: '8' },
  insoleLength: { label: 'Insole length', unit: 'cm', placeholder: '27' },
};

export const CATEGORY_BASE_POINTS = {
  tops: 50,
  bottoms: 60,
  dresses: 80,
  outerwear: 100,
  shoes: 70,
  accessories: 30,
};

export const CONDITION_MULTIPLIERS = {
  new: 1.0,
  'like-new': 0.9,
  good: 0.7,
  fair: 0.5,
  worn: 0.3,
};

/**
 * Compute deterministic listing points matching backend/src/utils/helpers.js.
 */
export const calculateItemPoints = (condition, category) => {
  if (!category || !CATEGORY_BASE_POINTS[category] || !condition || !CONDITION_MULTIPLIERS[condition]) {
    return null;
  }
  const basePoints = CATEGORY_BASE_POINTS[category];
  const multiplier = CONDITION_MULTIPLIERS[condition];
  return Math.round(basePoints * multiplier);
};

export const getAllowedMeasurementKeys = (category) =>
  CATEGORY_MEASUREMENT_FIELDS[category] ? [...CATEGORY_MEASUREMENT_FIELDS[category]] : [];

export const filterMeasurementsForCategory = (category, measurements = {}) => {
  const allowedKeys = getAllowedMeasurementKeys(category);
  if (allowedKeys.length === 0) return undefined;

  const filtered = {};
  for (const key of allowedKeys) {
    const raw = measurements[key];
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    const num = Number(raw);
    if (Number.isFinite(num)) {
      filtered[key] = num;
    }
  }

  if (Object.keys(filtered).length === 0) {
    return undefined;
  }

  return {
    ...filtered,
    unit: 'cm',
  };
};
