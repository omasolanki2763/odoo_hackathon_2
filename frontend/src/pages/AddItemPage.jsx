import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import {
  CATEGORY_BASE_POINTS,
  CONDITION_MULTIPLIERS,
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_FIT_OPTIONS,
  ITEM_GENDERS,
  MEASUREMENT_FIELD_BOUNDS,
  MEASUREMENT_FIELD_META,
  STANDARD_SIZES,
  UPLOAD_LIMITS,
  calculateItemPoints,
  filterMeasurementsForCategory,
  getAllowedMeasurementKeys,
} from '../constants/measurements';
import '../styles/AddItemPage.css';

const INITIAL_FORM_DATA = {
  title: '',
  description: '',
  category: '',
  subcategory: '',
  size: '',
  fit: '',
  condition: 'good',
  gender: '',
  brand: '',
  colour: '',
  material: '',
  tags: '',
  measurements: {},
};

const PHOTO_CHECKLIST = [
  'Full garment laid flat or on a hanger in natural light',
  'Fabric / care label clearly legible',
  'Any visible wear, stains, or mended seams honestly pictured',
];

const hasValidImageFile = (file) => {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const mimeOk = UPLOAD_LIMITS.ALLOWED_TYPES.includes(mime);
  const extOk = UPLOAD_LIMITS.ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  return mimeOk && extOk;
};

const buildPhotoAlt = (title, index) => {
  const cleanTitle = title ? title.trim() : '';
  return cleanTitle ? `${cleanTitle} — photo ${index + 1}` : `Garment photo ${index + 1}`;
};

const AddItemPage = () => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [photos, setPhotos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedItem, setSubmittedItem] = useState(null);

  const fileInputRef = useRef(null);
  const nextPhotoIdRef = useRef(1);
  const photosRef = useRef([]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        if (photo.previewUrl && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(photo.previewUrl);
        }
      }
    };
  }, []);

  const allowedMeasurementKeys = useMemo(
    () => getAllowedMeasurementKeys(formData.category),
    [formData.category]
  );

  const computedPoints = useMemo(
    () => calculateItemPoints(formData.condition, formData.category),
    [formData.condition, formData.category]
  );

  const selectedCategoryLabel = useMemo(
    () => ITEM_CATEGORIES.find((cat) => cat.value === formData.category)?.label || '',
    [formData.category]
  );

  const selectedConditionLabel = useMemo(
    () => ITEM_CONDITIONS.find((cond) => cond.value === formData.condition)?.label || '',
    [formData.condition]
  );

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    clearFieldError(name);
    if (serverError) setServerError('');
  };

  const handleCategorySelect = (categoryValue) => {
    const allowedForNext = new Set(getAllowedMeasurementKeys(categoryValue));
    setFormData((prev) => {
      const prunedMeasurements = {};
      for (const [key, val] of Object.entries(prev.measurements || {})) {
        if (allowedForNext.has(key)) {
          prunedMeasurements[key] = val;
        }
      }
      return {
        ...prev,
        category: categoryValue,
        measurements: prunedMeasurements,
      };
    });

    setFieldErrors((prev) => {
      const next = {};
      for (const [key, msg] of Object.entries(prev)) {
        if (key === 'category') continue;
        if (key.startsWith('measurements.')) {
          const measureKey = key.slice('measurements.'.length);
          if (!allowedForNext.has(measureKey)) continue;
        }
        next[key] = msg;
      }
      return next;
    });
    if (serverError) setServerError('');
  };

  const handleMeasurementChange = (measureKey, value) => {
    setFormData((prev) => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [measureKey]: value,
      },
    }));
    clearFieldError(`measurements.${measureKey}`);
    if (serverError) setServerError('');
  };

  const addFiles = (incomingList) => {
    const incoming = Array.from(incomingList || []);
    if (incoming.length === 0) return;

    if (photos.length >= UPLOAD_LIMITS.MAX_FILES) {
      setFieldErrors((prev) => ({
        ...prev,
        photos: `Maximum ${UPLOAD_LIMITS.MAX_FILES} photos allowed per listing.`,
      }));
      return;
    }

    const accepted = [];
    let photoErr = '';

    for (const file of incoming) {
      if (!hasValidImageFile(file)) {
        photoErr = `"${file.name}" must be a JPEG, PNG, or WebP image.`;
        continue;
      }
      if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE) {
        photoErr = `"${file.name}" exceeds the 5 MB per-photo limit.`;
        continue;
      }
      if (photos.length + accepted.length >= UPLOAD_LIMITS.MAX_FILES) {
        photoErr = `Maximum ${UPLOAD_LIMITS.MAX_FILES} photos allowed per listing.`;
        break;
      }

      const previewUrl =
        typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
      accepted.push({
        id: `photo-${nextPhotoIdRef.current++}`,
        file,
        previewUrl,
      });
    }

    if (accepted.length > 0) {
      setPhotos((prev) => [...prev, ...accepted]);
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (photoErr) {
        next.photos = photoErr;
      } else {
        delete next.photos;
      }
      return next;
    });
    if (serverError) setServerError('');
  };

  const handleFileInputChange = (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer?.files);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const target = prev[index];
      if (target?.previewUrl && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
    clearFieldError('photos');
  };

  const movePhoto = (index, direction) => {
    const targetIndex = index + direction;
    setPhotos((prev) => {
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  const validateForm = () => {
    const errors = {};

    if (photos.length === 0) {
      errors.photos = 'Add at least 1 garment photo (JPEG, PNG, or WebP, max 5 MB).';
    }

    const trimmedTitle = formData.title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 100) {
      errors.title = 'Title must be between 3 and 100 characters.';
    }

    if (!formData.category || !ITEM_CATEGORIES.some((c) => c.value === formData.category)) {
      errors.category = 'Choose a garment category.';
    }

    if (!formData.size.trim()) {
      errors.size = 'Enter or select a size.';
    }

    if (!formData.gender || !ITEM_GENDERS.some((g) => g.value === formData.gender)) {
      errors.gender = 'Choose a fit category (Women, Men, or Unisex).';
    }

    if (!formData.condition || !ITEM_CONDITIONS.some((c) => c.value === formData.condition)) {
      errors.condition = 'Select a garment condition.';
    }

    if (formData.subcategory.trim().length > 50) {
      errors.subcategory = 'Type must be 50 characters or fewer.';
    }
    if (formData.brand.trim().length > 50) {
      errors.brand = 'Brand must be 50 characters or fewer.';
    }
    if (formData.colour.trim().length > 40) {
      errors.colour = 'Colour must be 40 characters or fewer.';
    }
    if (formData.material.trim().length > 60) {
      errors.material = 'Material must be 60 characters or fewer.';
    }

    const parsedTags = formData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (parsedTags.some((tag) => tag.length > 20)) {
      errors.tags = 'Each tag must be 20 characters or fewer.';
    }

    const trimmedDesc = formData.description.trim();
    if (trimmedDesc.length < 10 || trimmedDesc.length > 1000) {
      errors.description = 'Description must be between 10 and 1000 characters.';
    }

    for (const key of getAllowedMeasurementKeys(formData.category)) {
      const rawVal = formData.measurements[key];
      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
        continue;
      }
      const bounds = MEASUREMENT_FIELD_BOUNDS[key];
      const num = Number(rawVal);
      if (!Number.isFinite(num) || num < bounds.min || num > bounds.max) {
        const meta = MEASUREMENT_FIELD_META[key];
        const unitSuffix = meta.unit ? ` ${meta.unit}` : '';
        errors[`measurements.${key}`] =
          `${meta.label} must be between ${bounds.min} and ${bounds.max}${unitSuffix}.`;
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setServerError('Please review the highlighted fields before publishing.');
      return;
    }

    setSubmitting(true);

    try {
      const uploadPayload = new FormData();
      for (const photo of photos) {
        uploadPayload.append('images', photo.file);
      }

      const uploadRes = await api.post('/upload/multiple', uploadPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedList = Array.isArray(uploadRes.data?.data)
        ? uploadRes.data.data
        : uploadRes.data?.data?.url
          ? [uploadRes.data.data]
          : [];

      if (uploadedList.length === 0) {
        throw new Error('Photo upload did not return an image URL. Please try again.');
      }

      const images = uploadedList.map((entry, idx) => ({
        url: entry.url,
        ...(entry.publicId ? { publicId: entry.publicId } : {}),
        isPrimary: idx === 0,
      }));

      const tags = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const measurements = filterMeasurementsForCategory(
        formData.category,
        formData.measurements
      );

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        size: formData.size.trim(),
        condition: formData.condition,
        gender: formData.gender,
        images,
        pointsValue: calculateItemPoints(formData.condition, formData.category),
      };

      if (formData.subcategory.trim()) payload.subcategory = formData.subcategory.trim();
      if (formData.brand.trim()) payload.brand = formData.brand.trim();
      if (formData.colour.trim()) payload.colour = formData.colour.trim();
      if (formData.material.trim()) payload.material = formData.material.trim();
      if (formData.fit) payload.fit = formData.fit;
      if (tags.length > 0) payload.tags = tags;
      if (measurements) payload.measurements = measurements;

      const createRes = await api.post('/items', payload);
      const created = createRes.data?.data || createRes.data || {};
      setSubmittedItem({
        _id: created._id || created.id || null,
        title: created.title || payload.title,
        pointsValue: created.pointsValue || payload.pointsValue,
      });
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        const mapped = {};
        const messages = [];
        for (const itemErr of apiErrors) {
          if (itemErr.field && itemErr.message) {
            mapped[itemErr.field] = itemErr.message;
          }
          if (itemErr.message) {
            messages.push(itemErr.message);
          }
        }
        if (Object.keys(mapped).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...mapped }));
        }
        setServerError(messages.join(' ') || 'Unable to publish item. Please check your entries.');
      } else {
        setServerError(
          err.response?.data?.message || err.message || 'Failed to publish listing. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForAnother = () => {
    for (const photo of photos) {
      if (photo.previewUrl && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(photo.previewUrl);
      }
    }
    setPhotos([]);
    setFormData(INITIAL_FORM_DATA);
    setFieldErrors({});
    setServerError('');
    setSubmittedItem(null);
  };

  if (submittedItem) {
    return (
      <div className="add-item-page">
        <nav className="add-item-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/dashboard">Dashboard</Link>
          <span aria-hidden="true">/</span>
          <span>List an item</span>
        </nav>

        <section className="add-item-success-card" role="status" aria-live="polite">
          <span className="add-item-success-badge">Awaiting admin approval</span>
          <h1 className="add-item-success-title">Listing submitted for review</h1>
          <p className="add-item-success-copy">
            <strong>{submittedItem.title}</strong> is saved and waits for an admin review before it
            appears in the public catalogue
            {submittedItem.pointsValue
              ? ` at ${submittedItem.pointsValue} points.`
              : '.'}
          </p>
          <div className="add-item-success-actions">
            {submittedItem._id && (
              <Link to={`/items/${submittedItem._id}`} className="add-item-btn-primary">
                View listing
              </Link>
            )}
            <Link to="/dashboard" className="add-item-btn-secondary">
              Go to dashboard
            </Link>
            <button type="button" className="add-item-btn-secondary" onClick={resetForAnother}>
              List another item
            </button>
          </div>
        </section>
      </div>
    );
  }

  const coverPhoto = photos[0] || null;

  return (
    <div className="add-item-page">
      <nav className="add-item-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/dashboard">Dashboard</Link>
        <span aria-hidden="true">/</span>
        <span>List an item</span>
      </nav>

      <header className="add-item-header">
        <h1 className="add-item-title">List an item</h1>
        <p className="add-item-subtitle">
          Describe it honestly. Members see exactly what you write, and an admin reviews every
          listing before it goes live.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div className="add-item-studio-grid">
          <section className="add-item-photo-column" aria-labelledby="garment-photography-heading">
            <div className="add-item-photo-card">
              <span id="garment-photography-heading" className="add-item-section-label">
                1. Garment photography
              </span>

              <div
                className={`add-item-dropzone${isDragging ? ' is-dragging' : ''}${fieldErrors.photos ? ' is-invalid' : ''}`}
                data-testid="photo-dropzone"
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
              >
                <div className="add-item-hero-frame">
                  {coverPhoto ? (
                    <img
                      src={coverPhoto.previewUrl}
                      alt={buildPhotoAlt(formData.title, 0)}
                      className="add-item-hero-img"
                    />
                  ) : (
                    <div className="add-item-hero-empty">
                      <p className="add-item-hero-empty-title">Drop garment photos here</p>
                      <p className="add-item-hero-empty-note">
                        JPEG, PNG, or WebP up to 5 MB each. Up to {UPLOAD_LIMITS.MAX_FILES} photos.
                      </p>
                    </div>
                  )}
                </div>

                <div className="add-item-photo-controls">
                  <input
                    ref={fileInputRef}
                    id="add-item-photos"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileInputChange}
                    aria-describedby={fieldErrors.photos ? 'photos-error' : undefined}
                    className="add-item-file-input"
                  />
                  <button
                    type="button"
                    className="add-item-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photos.length >= UPLOAD_LIMITS.MAX_FILES || submitting}
                  >
                    {photos.length === 0 ? 'Choose photos' : 'Add more photos'}
                  </button>
                  <span className="add-item-photo-count font-number">
                    {photos.length} / {UPLOAD_LIMITS.MAX_FILES}
                  </span>
                </div>
              </div>

              {fieldErrors.photos && (
                <p id="photos-error" className="add-item-field-error" role="alert">
                  {fieldErrors.photos}
                </p>
              )}

              <p className="add-item-photo-caption">
                {coverPhoto
                  ? `Main Photo: ${formData.title.trim() || 'Untitled garment'}`
                  : 'Photo 1 becomes your cover image across catalogue cards.'}
              </p>

              {photos.length > 0 && (
                <div className="add-item-thumb-grid" aria-label="Selected photos">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className={`add-item-thumb-card${index === 0 ? ' is-cover' : ''}`}
                    >
                      <div className="add-item-thumb-media">
                        <img
                          src={photo.previewUrl}
                          alt={buildPhotoAlt(formData.title, index)}
                          className="add-item-thumb-img"
                        />
                        {index === 0 && <span className="add-item-thumb-badge">Cover</span>}
                      </div>
                      <div className="add-item-thumb-actions">
                        <button
                          type="button"
                          className="add-item-thumb-btn"
                          aria-label={`Move photo ${index + 1} earlier`}
                          onClick={() => movePhoto(index, -1)}
                          disabled={index === 0 || submitting}
                        >
                          &larr;
                        </button>
                        <button
                          type="button"
                          className="add-item-thumb-btn"
                          aria-label={`Move photo ${index + 1} later`}
                          onClick={() => movePhoto(index, 1)}
                          disabled={index === photos.length - 1 || submitting}
                        >
                          &rarr;
                        </button>
                        <button
                          type="button"
                          className="add-item-thumb-btn add-item-thumb-remove"
                          aria-label={`Remove photo ${index + 1}`}
                          onClick={() => removePhoto(index)}
                          disabled={submitting}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ul className="add-item-checklist">
                {PHOTO_CHECKLIST.map((line) => (
                  <li key={line}>
                    <span className="add-item-check-mark" aria-hidden="true">
                      &#10003;
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="add-item-form-column" aria-labelledby="garment-details-heading">
            <div className="add-item-form-card">
              <span id="garment-details-heading" className="add-item-section-label">
                2. Garment details
              </span>

              <div className="add-item-form-stack">
                <div className="add-item-field">
                  <div className="add-item-field-header">
                    <label htmlFor="item-title" className="add-item-field-label">
                      Title *
                    </label>
                    <span className="add-item-field-hint font-number">
                      {formData.title.length} / 100
                    </span>
                  </div>
                  <input
                    id="item-title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="e.g. 1980s Stonewash Denim Chore Jacket"
                    maxLength={100}
                    required
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? 'title-error' : undefined}
                    className={`add-item-input add-item-input-title${fieldErrors.title ? ' is-invalid' : ''}`}
                  />
                  {fieldErrors.title && (
                    <p id="title-error" className="add-item-field-error">
                      {fieldErrors.title}
                    </p>
                  )}
                </div>

                <div className="add-item-field">
                  <span id="category-label" className="add-item-field-label">
                    Category *
                  </span>
                  <div
                    className="add-item-pill-row"
                    role="group"
                    aria-labelledby="category-label"
                    aria-describedby={fieldErrors.category ? 'category-error' : undefined}
                  >
                    {ITEM_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        aria-pressed={formData.category === cat.value}
                        onClick={() => handleCategorySelect(cat.value)}
                        className={`add-item-pill${formData.category === cat.value ? ' is-active' : ''}`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.category && (
                    <p id="category-error" className="add-item-field-error">
                      {fieldErrors.category}
                    </p>
                  )}
                </div>

                <div className="add-item-two-col">
                  <div className="add-item-field">
                    <label htmlFor="item-subcategory" className="add-item-field-label">
                      Type
                    </label>
                    <input
                      id="item-subcategory"
                      name="subcategory"
                      type="text"
                      value={formData.subcategory}
                      onChange={(e) => handleFieldChange('subcategory', e.target.value)}
                      placeholder="e.g. Chore jacket, Cardigan, Midi dress"
                      maxLength={50}
                      aria-invalid={Boolean(fieldErrors.subcategory)}
                      aria-describedby={fieldErrors.subcategory ? 'subcategory-error' : undefined}
                      className={`add-item-input${fieldErrors.subcategory ? ' is-invalid' : ''}`}
                    />
                    {fieldErrors.subcategory && (
                      <p id="subcategory-error" className="add-item-field-error">
                        {fieldErrors.subcategory}
                      </p>
                    )}
                  </div>

                  <div className="add-item-field">
                    <span id="gender-label" className="add-item-field-label">
                      Fit category *
                    </span>
                    <div
                      className="add-item-pill-row"
                      role="group"
                      aria-labelledby="gender-label"
                      aria-describedby={fieldErrors.gender ? 'gender-error' : undefined}
                    >
                      {ITEM_GENDERS.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          aria-pressed={formData.gender === g.value}
                          onClick={() => handleFieldChange('gender', g.value)}
                          className={`add-item-pill${formData.gender === g.value ? ' is-active' : ''}`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                    {fieldErrors.gender && (
                      <p id="gender-error" className="add-item-field-error">
                        {fieldErrors.gender}
                      </p>
                    )}
                  </div>
                </div>

                <div className="add-item-field">
                  <label htmlFor="item-size" className="add-item-field-label">
                    Size *
                  </label>
                  <div className="add-item-size-row">
                    {STANDARD_SIZES.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        aria-pressed={formData.size === sz}
                        onClick={() => handleFieldChange('size', sz)}
                        className={`add-item-pill${formData.size === sz ? ' is-active' : ''}`}
                      >
                        {sz}
                      </button>
                    ))}
                    <input
                      id="item-size"
                      name="size"
                      type="text"
                      value={formData.size}
                      onChange={(e) => handleFieldChange('size', e.target.value)}
                      placeholder="Label or shoe size (e.g. EU 42)"
                      required
                      aria-invalid={Boolean(fieldErrors.size)}
                      aria-describedby={fieldErrors.size ? 'size-error' : undefined}
                      className={`add-item-input add-item-size-custom${fieldErrors.size ? ' is-invalid' : ''}`}
                    />
                  </div>
                  {fieldErrors.size && (
                    <p id="size-error" className="add-item-field-error">
                      {fieldErrors.size}
                    </p>
                  )}
                </div>

                <div className="add-item-field">
                  <span id="fit-label" className="add-item-field-label">
                    Fit note (optional)
                  </span>
                  <div className="add-item-pill-row" role="group" aria-labelledby="fit-label">
                    {ITEM_FIT_OPTIONS.map((option) => {
                      const active = formData.fit === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleFieldChange('fit', active ? '' : option.value)}
                          className={`add-item-pill${active ? ' is-active' : ''}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="add-item-field">
                  <span className="add-item-field-label">
                    Measurements
                    {selectedCategoryLabel
                      ? ` — ${selectedCategoryLabel}, laid flat`
                      : ' — select a category'}
                  </span>

                  {allowedMeasurementKeys.length === 0 ? (
                    <div className="add-item-measurements-empty">
                      Choose a category above to show only the allowed measurement fields in cm.
                    </div>
                  ) : (
                    <>
                      <div className="add-item-measurements-grid">
                        {allowedMeasurementKeys.map((key) => {
                          const meta = MEASUREMENT_FIELD_META[key];
                          const bounds = MEASUREMENT_FIELD_BOUNDS[key];
                          const errKey = `measurements.${key}`;
                          const errMsg = fieldErrors[errKey];
                          const errId = `measure-${key}-error`;
                          const inputId = `measure-${key}`;

                          return (
                            <div
                              key={key}
                              className={`add-item-measure-box${errMsg ? ' is-invalid' : ''}`}
                            >
                              <label htmlFor={inputId} className="add-item-measure-label">
                                {meta.label}
                              </label>
                              <div className="add-item-measure-input-row">
                                <input
                                  id={inputId}
                                  name={`measurements.${key}`}
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  min={bounds.min}
                                  max={bounds.max}
                                  placeholder={meta.placeholder}
                                  value={formData.measurements[key] ?? ''}
                                  onChange={(e) => handleMeasurementChange(key, e.target.value)}
                                  aria-invalid={Boolean(errMsg)}
                                  aria-describedby={errMsg ? errId : undefined}
                                  className="add-item-measure-input"
                                />
                                {meta.unit && (
                                  <span className="add-item-measure-unit">{meta.unit}</span>
                                )}
                              </div>
                              <p className="add-item-measure-bounds font-number">
                                {bounds.min}–{bounds.max}
                                {meta.unit ? ` ${meta.unit}` : ''}
                              </p>
                              {errMsg && (
                                <p id={errId} className="add-item-field-error">
                                  {errMsg}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="add-item-measurements-note">
                        These fields follow the category; only measurements allowed for{' '}
                        {selectedCategoryLabel.toLowerCase()} are included.
                      </p>
                    </>
                  )}
                </div>

                <div className="add-item-field">
                  <span id="condition-label" className="add-item-field-label">
                    Condition *
                  </span>
                  <div
                    className="add-item-condition-list"
                    role="radiogroup"
                    aria-labelledby="condition-label"
                    aria-describedby={fieldErrors.condition ? 'condition-error' : undefined}
                  >
                    {ITEM_CONDITIONS.map((cond) => {
                      const selected = formData.condition === cond.value;
                      return (
                        <label
                          key={cond.value}
                          className={`add-item-condition-option${selected ? ' is-selected' : ''}`}
                        >
                          <span className="add-item-condition-main">
                            <input
                              type="radio"
                              name="condition"
                              value={cond.value}
                              checked={selected}
                              onChange={() => handleFieldChange('condition', cond.value)}
                            />
                            <span>{cond.label}</span>
                          </span>
                          <span className="add-item-condition-note">{cond.note}</span>
                        </label>
                      );
                    })}
                  </div>
                  {fieldErrors.condition && (
                    <p id="condition-error" className="add-item-field-error">
                      {fieldErrors.condition}
                    </p>
                  )}

                  <div className="add-item-condition-callout">
                    <span className="add-item-condition-callout-label">
                      How condition is checked
                    </span>
                    <p>
                      The receiver confirms the condition on arrival. Honest wear notes protect your
                      points and trust rating.
                    </p>
                  </div>
                </div>

                <div className="add-item-two-col">
                  <div className="add-item-field">
                    <label htmlFor="item-brand" className="add-item-field-label">
                      Brand
                    </label>
                    <input
                      id="item-brand"
                      name="brand"
                      type="text"
                      value={formData.brand}
                      onChange={(e) => handleFieldChange('brand', e.target.value)}
                      placeholder="e.g. Le Mont St Michel"
                      maxLength={50}
                      aria-invalid={Boolean(fieldErrors.brand)}
                      aria-describedby={fieldErrors.brand ? 'brand-error' : undefined}
                      className={`add-item-input${fieldErrors.brand ? ' is-invalid' : ''}`}
                    />
                    {fieldErrors.brand && (
                      <p id="brand-error" className="add-item-field-error">
                        {fieldErrors.brand}
                      </p>
                    )}
                  </div>

                  <div className="add-item-field">
                    <label htmlFor="item-colour" className="add-item-field-label">
                      Colour
                    </label>
                    <input
                      id="item-colour"
                      name="colour"
                      type="text"
                      value={formData.colour}
                      onChange={(e) => handleFieldChange('colour', e.target.value)}
                      placeholder="e.g. Indigo"
                      maxLength={40}
                      aria-invalid={Boolean(fieldErrors.colour)}
                      aria-describedby={fieldErrors.colour ? 'colour-error' : undefined}
                      className={`add-item-input${fieldErrors.colour ? ' is-invalid' : ''}`}
                    />
                    {fieldErrors.colour && (
                      <p id="colour-error" className="add-item-field-error">
                        {fieldErrors.colour}
                      </p>
                    )}
                  </div>
                </div>

                <div className="add-item-two-col">
                  <div className="add-item-field">
                    <label htmlFor="item-material" className="add-item-field-label">
                      Material
                    </label>
                    <input
                      id="item-material"
                      name="material"
                      type="text"
                      value={formData.material}
                      onChange={(e) => handleFieldChange('material', e.target.value)}
                      placeholder="e.g. 100% cotton twill"
                      maxLength={60}
                      aria-invalid={Boolean(fieldErrors.material)}
                      aria-describedby={fieldErrors.material ? 'material-error' : undefined}
                      className={`add-item-input${fieldErrors.material ? ' is-invalid' : ''}`}
                    />
                    {fieldErrors.material && (
                      <p id="material-error" className="add-item-field-error">
                        {fieldErrors.material}
                      </p>
                    )}
                  </div>

                  <div className="add-item-field">
                    <label htmlFor="item-tags" className="add-item-field-label">
                      Tags
                    </label>
                    <input
                      id="item-tags"
                      name="tags"
                      type="text"
                      value={formData.tags}
                      onChange={(e) => handleFieldChange('tags', e.target.value)}
                      placeholder="denim, workwear, vintage"
                      aria-invalid={Boolean(fieldErrors.tags)}
                      aria-describedby={fieldErrors.tags ? 'tags-error' : undefined}
                      className={`add-item-input${fieldErrors.tags ? ' is-invalid' : ''}`}
                    />
                    {fieldErrors.tags && (
                      <p id="tags-error" className="add-item-field-error">
                        {fieldErrors.tags}
                      </p>
                    )}
                  </div>
                </div>

                <div className="add-item-field">
                  <div className="add-item-field-header">
                    <label htmlFor="item-description" className="add-item-field-label">
                      Description *
                    </label>
                    <span className="add-item-field-hint font-number">
                      {formData.description.trim().length} / 1000 (min 10)
                    </span>
                  </div>
                  <textarea
                    id="item-description"
                    name="description"
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Fabric weight, wear history, alterations, or quirks worth knowing."
                    maxLength={1000}
                    required
                    aria-invalid={Boolean(fieldErrors.description)}
                    aria-describedby={fieldErrors.description ? 'description-error' : undefined}
                    className={`add-item-textarea${fieldErrors.description ? ' is-invalid' : ''}`}
                  />
                  {fieldErrors.description && (
                    <p id="description-error" className="add-item-field-error">
                      {fieldErrors.description}
                    </p>
                  )}
                </div>

                <div className="add-item-points-panel" aria-live="polite">
                  <div>
                    <span className="add-item-field-label">Estimated points</span>
                    <div className="add-item-points-value-row">
                      <span className="add-item-points-num font-number">
                        {computedPoints ?? '—'}
                      </span>
                      {computedPoints !== null && (
                        <span className="add-item-points-unit">points</span>
                      )}
                    </div>
                    <p className="add-item-points-caption">
                      {computedPoints !== null
                        ? 'Calculated from your category and condition. Points unlock once a moderator approves the listing.'
                        : 'Points are set when a moderator approves the listing.'}
                    </p>
                  </div>

                  <div className="add-item-points-breakdown">
                    <span className="add-item-field-label">How it is worked out</span>
                    {computedPoints !== null ? (
                      <>
                        <div className="add-item-points-row">
                          <span>{selectedCategoryLabel} base</span>
                          <span className="font-number">
                            {CATEGORY_BASE_POINTS[formData.category]}
                          </span>
                        </div>
                        <div className="add-item-points-row">
                          <span>{selectedConditionLabel}</span>
                          <span className="font-number">
                            &times; {CONDITION_MULTIPLIERS[formData.condition]}
                          </span>
                        </div>
                        <div className="add-item-points-row is-total">
                          <span>Total</span>
                          <span className="font-number">{computedPoints} pts</span>
                        </div>
                      </>
                    ) : (
                      <div className="add-item-points-row">
                        <span>Choose a category to preview the backend points calculation.</span>
                      </div>
                    )}
                  </div>
                </div>

                {serverError && (
                  <div className="add-item-server-alert" role="alert">
                    {serverError}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    className="add-item-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? 'Publishing listing...' : 'Publish listing'}
                  </button>
                  <p className="add-item-submit-footnote">
                    An admin reviews every listing before it goes live.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
};

export default AddItemPage;
