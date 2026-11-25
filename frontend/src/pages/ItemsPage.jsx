import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import '../styles/ItemsPage.css';

const PAGE_LIMIT = 9;

const CATEGORY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'tops', label: 'Tops' },
  { value: 'bottoms', label: 'Bottoms' },
  { value: 'dresses', label: 'Dresses' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessories', label: 'Accessories' },
];

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];

const CONDITION_OPTIONS = [
  { value: 'new', label: 'Unworn / New' },
  { value: 'like-new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair / repaired' },
  { value: 'worn', label: 'Worn' },
];

const COLOUR_OPTIONS = [
  { value: 'black', label: 'Ink / Black', swatchClass: 'browse-swatch-black' },
  { value: 'white', label: 'Ivory / White', swatchClass: 'browse-swatch-white' },
  { value: 'navy', label: 'Deep Navy', swatchClass: 'browse-swatch-navy' },
  { value: 'blue', label: 'Slate Blue', swatchClass: 'browse-swatch-blue' },
  { value: 'olive', label: 'Olive', swatchClass: 'browse-swatch-olive' },
  { value: 'brown', label: 'Earth Brown', swatchClass: 'browse-swatch-brown' },
  { value: 'beige', label: 'Warm Sand', swatchClass: 'browse-swatch-beige' },
  { value: 'clay', label: 'Terracotta', swatchClass: 'browse-swatch-clay' },
];

const MATERIAL_OPTIONS = [
  { value: 'cotton', label: 'Cotton' },
  { value: 'wool', label: 'Wool' },
  { value: 'linen', label: 'Linen' },
  { value: 'denim', label: 'Denim' },
  { value: 'leather', label: 'Leather' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Sort: Newest' },
  { value: 'points_asc', label: 'Sort: Points (Low to High)' },
  { value: 'points_desc', label: 'Sort: Points (High to Low)' },
];

const parseCsv = (raw) => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
};

const formatConditionLabel = (condition) => {
  const match = CONDITION_OPTIONS.find((opt) => opt.value === condition);
  if (match) return match.label.toUpperCase();
  if (!condition) return 'GOOD CONDITION';
  return condition.replace(/-/g, ' ').toUpperCase();
};

const getItemImageUrl = (item) => {
  if (!item?.images || item.images.length === 0) return null;
  const primary = item.images.find((img) => img && img.isPrimary && img.url);
  if (primary?.url) return primary.url;
  const first = item.images[0];
  if (typeof first === 'string') return first;
  return first?.url || null;
};

const truncateNote = (text, maxLen = 58) => {
  if (!text) return 'Verified measurements included';
  const cleaned = text.trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1).trim()}…`;
};

const GarmentCardImage = ({ item }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const src = getItemImageUrl(item);

  return (
    <div className="browse-photo-frame">
      {src && !imgFailed ? (
        <img
          src={src}
          alt={item.title || 'Community garment listing'}
          className="browse-photo-img"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="browse-photo-placeholder">
          <span className="browse-photo-placeholder-tag">
            {(item?.category || 'garment').toUpperCase()}
          </span>
          <span className="browse-photo-placeholder-text">
            Daylight photo pending
          </span>
        </div>
      )}
    </div>
  );
};

const ItemsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: PAGE_LIMIT,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  );

  // URL-derived filter state (source of truth for shareability + browser Back/Forward)
  const category = searchParams.get('category') || '';
  const selectedSizes = useMemo(() => parseCsv(searchParams.get('size')), [searchParams]);
  const selectedConditions = useMemo(() => parseCsv(searchParams.get('condition')), [searchParams]);
  const selectedColours = useMemo(() => parseCsv(searchParams.get('colour')), [searchParams]);
  const selectedMaterials = useMemo(() => parseCsv(searchParams.get('material')), [searchParams]);
  const gender = searchParams.get('gender') || '';
  const minPoints = searchParams.get('minPoints') || '';
  const maxPoints = searchParams.get('maxPoints') || '';
  const urlSearch = searchParams.get('search') || '';
  const urlBrand = searchParams.get('brand') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  // Local text drafts synced bidirectionally with URL so Back/Forward updates input values
  const [searchDraft, setSearchDraft] = useState(urlSearch);
  const [brandDraft, setBrandDraft] = useState(urlBrand);
  const [minPointsDraft, setMinPointsDraft] = useState(minPoints);
  const [maxPointsDraft, setMaxPointsDraft] = useState(maxPoints);

  useEffect(() => {
    setSearchDraft(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    setBrandDraft(urlBrand);
  }, [urlBrand]);

  useEffect(() => {
    setMinPointsDraft(minPoints);
  }, [minPoints]);

  useEffect(() => {
    setMaxPointsDraft(maxPoints);
  }, [maxPoints]);

  const updateParams = useCallback(
    (mutator, { resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams);
      mutator(next);
      if (resetPage) {
        next.delete('page');
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  // Debounce text inputs -> URL query params
  useEffect(() => {
    const trimmed = searchDraft.trim();
    if (trimmed === urlSearch) return undefined;
    const timer = setTimeout(() => {
      updateParams((next) => {
        if (trimmed) next.set('search', trimmed);
        else next.delete('search');
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [searchDraft, urlSearch, updateParams]);

  useEffect(() => {
    const trimmed = brandDraft.trim();
    if (trimmed === urlBrand) return undefined;
    const timer = setTimeout(() => {
      updateParams((next) => {
        if (trimmed) next.set('brand', trimmed);
        else next.delete('brand');
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [brandDraft, urlBrand, updateParams]);

  const applyPointsDraft = useCallback(
    (nextMin, nextMax) => {
      const cleanMin = nextMin.trim();
      const cleanMax = nextMax.trim();
      if (cleanMin && cleanMax && parseInt(cleanMin, 10) > parseInt(cleanMax, 10)) {
        return;
      }
      updateParams((next) => {
        if (cleanMin !== '') next.set('minPoints', cleanMin);
        else next.delete('minPoints');
        if (cleanMax !== '') next.set('maxPoints', cleanMax);
        else next.delete('maxPoints');
      });
    },
    [updateParams]
  );

  useEffect(() => {
    const cleanMin = minPointsDraft.trim();
    const cleanMax = maxPointsDraft.trim();
    if (cleanMin === minPoints && cleanMax === maxPoints) return undefined;
    const timer = setTimeout(() => {
      applyPointsDraft(cleanMin, cleanMax);
    }, 350);
    return () => clearTimeout(timer);
  }, [minPointsDraft, maxPointsDraft, minPoints, maxPoints, applyPointsDraft]);

  const toggleCsvParam = useCallback(
    (key, value) => {
      updateParams((next) => {
        const current = parseCsv(next.get(key));
        const exists = current.includes(value);
        const updated = exists ? current.filter((v) => v !== value) : [...current, value];
        if (updated.length > 0) {
          next.set(key, updated.join(','));
        } else {
          next.delete(key);
        }
      });
    },
    [updateParams]
  );

  const clearAllFilters = useCallback(() => {
    setSearchDraft('');
    setBrandDraft('');
    setMinPointsDraft('');
    setMaxPointsDraft('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && window.innerWidth <= 768) {
        setFiltersOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtersOpen]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const apiParams = {
        page,
        limit: PAGE_LIMIT,
      };
      if (category) apiParams.category = category;
      if (selectedSizes.length > 0) apiParams.size = selectedSizes.join(',');
      if (selectedConditions.length > 0) apiParams.condition = selectedConditions.join(',');
      if (selectedColours.length > 0) apiParams.colour = selectedColours.join(',');
      if (selectedMaterials.length > 0) apiParams.material = selectedMaterials.join(',');
      if (gender) apiParams.gender = gender;
      if (minPoints !== '') apiParams.minPoints = minPoints;
      if (maxPoints !== '') apiParams.maxPoints = maxPoints;
      if (urlBrand) apiParams.brand = urlBrand;
      if (urlSearch) apiParams.search = urlSearch;
      if (sort && sort !== 'newest') apiParams.sort = sort;

      const res = await api.get('/items', { params: apiParams });
      const fetched = Array.isArray(res.data?.data) ? res.data.data : [];
      const fetchedPagination = res.data?.pagination || {
        currentPage: page,
        totalPages: fetched.length > 0 ? 1 : 0,
        totalItems: fetched.length,
        itemsPerPage: PAGE_LIMIT,
        hasNextPage: false,
        hasPrevPage: false,
      };
      setItems(fetched);
      setPagination(fetchedPagination);
    } catch (err) {
      const serverMsg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message;
      setError(serverMsg || 'Could not load garments from the archive right now.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    category,
    selectedSizes,
    selectedConditions,
    selectedColours,
    selectedMaterials,
    gender,
    minPoints,
    maxPoints,
    urlBrand,
    urlSearch,
    sort,
  ]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Build active removable chips for the filter footer
  const activeChips = useMemo(() => {
    const chips = [];
    if (category) {
      const catLabel = CATEGORY_OPTIONS.find((c) => c.value === category)?.label || category;
      chips.push({
        id: `category-${category}`,
        label: `Category: ${catLabel}`,
        onRemove: () => updateParams((next) => next.delete('category')),
      });
    }
    selectedSizes.forEach((sizeVal) => {
      chips.push({
        id: `size-${sizeVal}`,
        label: `Size ${sizeVal}`,
        onRemove: () => toggleCsvParam('size', sizeVal),
      });
    });
    selectedConditions.forEach((condVal) => {
      const label = CONDITION_OPTIONS.find((c) => c.value === condVal)?.label || condVal;
      chips.push({
        id: `cond-${condVal}`,
        label,
        onRemove: () => toggleCsvParam('condition', condVal),
      });
    });
    if (minPoints !== '' || maxPoints !== '') {
      const label =
        minPoints !== '' && maxPoints !== ''
          ? `${minPoints}–${maxPoints} pts`
          : minPoints !== ''
            ? `${minPoints}+ pts`
            : `Up to ${maxPoints} pts`;
      chips.push({
        id: 'points-range',
        label,
        onRemove: () => {
          setMinPointsDraft('');
          setMaxPointsDraft('');
          updateParams((next) => {
            next.delete('minPoints');
            next.delete('maxPoints');
          });
        },
      });
    }
    selectedColours.forEach((colourVal) => {
      chips.push({
        id: `colour-${colourVal}`,
        label: `Colour: ${colourVal}`,
        onRemove: () => toggleCsvParam('colour', colourVal),
      });
    });
    selectedMaterials.forEach((matVal) => {
      const label = MATERIAL_OPTIONS.find((m) => m.value === matVal)?.label || matVal;
      chips.push({
        id: `material-${matVal}`,
        label,
        onRemove: () => toggleCsvParam('material', matVal),
      });
    });
    if (gender) {
      chips.push({
        id: `gender-${gender}`,
        label: `Fit: ${gender}`,
        onRemove: () => updateParams((next) => next.delete('gender')),
      });
    }
    if (urlBrand) {
      chips.push({
        id: 'brand',
        label: `Brand: ${urlBrand}`,
        onRemove: () => {
          setBrandDraft('');
          updateParams((next) => next.delete('brand'));
        },
      });
    }
    if (urlSearch) {
      chips.push({
        id: 'search',
        label: `Search: “${urlSearch}”`,
        onRemove: () => {
          setSearchDraft('');
          updateParams((next) => next.delete('search'));
        },
      });
    }
    return chips;
  }, [
    category,
    selectedSizes,
    selectedConditions,
    minPoints,
    maxPoints,
    selectedColours,
    selectedMaterials,
    gender,
    urlBrand,
    urlSearch,
    toggleCsvParam,
    updateParams,
  ]);

  const pointsSummary =
    minPointsDraft !== '' && maxPointsDraft !== ''
      ? `${minPointsDraft} to ${maxPointsDraft} points`
      : minPointsDraft !== ''
        ? `${minPointsDraft}+ points`
        : maxPointsDraft !== ''
          ? `Up to ${maxPointsDraft} points`
          : 'Any point range';

  const countPrefix = loading ? 'Loading' : `${pagination.totalItems}`;
  const showingEnd = Math.min(page * PAGE_LIMIT, pagination.totalItems || items.length);
  const showingStart = pagination.totalItems > 0 ? (page - 1) * PAGE_LIMIT + 1 : 0;

  return (
    <div className="browse-page">
      <div className="browse-container">
        <nav aria-label="Breadcrumb" className="browse-breadcrumb">
          <Link to="/" className="browse-breadcrumb-link">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span>Browse</span>
        </nav>

        <header className="browse-header">
          <h1 className="browse-title">The Community Garment Archive</h1>
          <p className="browse-subtitle">
            {countPrefix} verified {pagination.totalItems === 1 ? 'piece' : 'pieces'} in active
            circulation across community wardrobes. Honest condition rubrics, zero markup.
          </p>
        </header>

        {/* Search, Filter Toggle & Sort Bar */}
        <div className="browse-toolbar">
          <form
            className="browse-search-wrap"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = searchDraft.trim();
              updateParams((next) => {
                if (trimmed) next.set('search', trimmed);
                else next.delete('search');
              });
            }}
          >
            <input
              type="search"
              className="browse-search-input"
              aria-label="Search garments"
              placeholder="Search denim, wool knits, trench coats, linen, sizing..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </form>

          <button
            type="button"
            className={`browse-filter-toggle${filtersOpen ? ' browse-filter-toggle-active' : ''}`}
            aria-expanded={filtersOpen}
            aria-controls="browse-filter-panel"
            onClick={() => setFiltersOpen((prev) => !prev)}
          >
            <span>All filters ({activeChips.length})</span>
            <span aria-hidden="true">{filtersOpen ? '▲' : '▼'}</span>
          </button>

          <div className="browse-sort-wrap">
            <select
              className="browse-sort-select"
              aria-label="Sort garments"
              value={sort}
              onChange={(e) => {
                const nextSort = e.target.value;
                updateParams((next) => {
                  if (nextSort && nextSort !== 'newest') next.set('sort', nextSort);
                  else next.delete('sort');
                });
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Panel (Inline on desktop, Slide-out drawer on <= 768px) */}
        {filtersOpen && (
          <>
            <div
              className="browse-drawer-backdrop"
              aria-hidden="true"
              onClick={() => setFiltersOpen(false)}
            />
            <section
              id="browse-filter-panel"
              className="browse-filter-panel"
              aria-label="Catalogue filters"
            >
              <div className="browse-filter-drawer-header">
                <h2 className="browse-filter-drawer-title">Filters</h2>
                <button
                  type="button"
                  className="browse-drawer-close"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                >
                  ×
                </button>
              </div>

              {/* Category Row */}
              <div className="browse-filter-section">
                <span className="browse-filter-section-label">CATEGORY</span>
                <div className="browse-category-pills" role="group" aria-label="Filter by category">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const isActive = category === opt.value;
                    return (
                      <button
                        key={opt.value || 'all'}
                        type="button"
                        aria-pressed={isActive}
                        className={`browse-category-pill${isActive ? ' browse-category-pill-active' : ''}`}
                        onClick={() =>
                          updateParams((next) => {
                            if (opt.value) next.set('category', opt.value);
                            else next.delete('category');
                          })
                        }
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5-Column Detailed Filter Controls */}
              <div className="browse-filter-columns">
                {/* Column 1: Size */}
                <div className="browse-filter-col">
                  <div>
                    <span className="browse-filter-section-label">SIZE</span>
                    <div className="browse-size-grid" role="group" aria-label="Filter by size">
                      {SIZE_OPTIONS.map((sizeVal) => {
                        const active = selectedSizes.includes(sizeVal);
                        return (
                          <button
                            key={sizeVal}
                            type="button"
                            aria-pressed={active}
                            className={`browse-size-btn${active ? ' browse-size-btn-active' : ''}`}
                            onClick={() => toggleCsvParam('size', sizeVal)}
                          >
                            {sizeVal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Column 2: Condition */}
                <div className="browse-filter-col">
                  <div>
                    <span className="browse-filter-section-label">CONDITION</span>
                    <div className="browse-checkbox-list">
                      {CONDITION_OPTIONS.map((opt) => (
                        <label key={opt.value} className="browse-checkbox-label">
                          <input
                            type="checkbox"
                            className="browse-checkbox-input"
                            checked={selectedConditions.includes(opt.value)}
                            onChange={() => toggleCsvParam('condition', opt.value)}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 3: Points */}
                <div className="browse-filter-col">
                  <div>
                    <span className="browse-filter-section-label">POINTS</span>
                    <p className="browse-points-readout">{pointsSummary}</p>
                    <div className="browse-points-inputs">
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        className="browse-number-input"
                        aria-label="Minimum points"
                        placeholder="Min"
                        value={minPointsDraft}
                        onChange={(e) => setMinPointsDraft(e.target.value)}
                      />
                      <span className="browse-points-sep">to</span>
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        className="browse-number-input"
                        aria-label="Maximum points"
                        placeholder="Max"
                        value={maxPointsDraft}
                        onChange={(e) => setMaxPointsDraft(e.target.value)}
                      />
                    </div>
                    <div className="browse-points-presets">
                      <button
                        type="button"
                        className="browse-preset-btn"
                        onClick={() => {
                          setMinPointsDraft('0');
                          setMaxPointsDraft('50');
                        }}
                      >
                        0–50
                      </button>
                      <button
                        type="button"
                        className="browse-preset-btn"
                        onClick={() => {
                          setMinPointsDraft('40');
                          setMaxPointsDraft('120');
                        }}
                      >
                        40–120
                      </button>
                      <button
                        type="button"
                        className="browse-preset-btn"
                        onClick={() => {
                          setMinPointsDraft('100');
                          setMaxPointsDraft('');
                        }}
                      >
                        100+
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column 4: Colour & Material */}
                <div className="browse-filter-col">
                  <div>
                    <span className="browse-filter-section-label">COLOUR</span>
                    <div className="browse-swatch-grid" role="group" aria-label="Filter by colour">
                      {COLOUR_OPTIONS.map((opt) => {
                        const active = selectedColours.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            aria-label={`Colour ${opt.label}`}
                            aria-pressed={active}
                            title={opt.label}
                            className={`browse-swatch-btn ${opt.swatchClass}${active ? ' browse-swatch-btn-active' : ''}`}
                            onClick={() => toggleCsvParam('colour', opt.value)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="browse-filter-section-label">MATERIAL</span>
                    <div className="browse-checkbox-grid">
                      {MATERIAL_OPTIONS.map((opt) => (
                        <label key={opt.value} className="browse-checkbox-label">
                          <input
                            type="checkbox"
                            className="browse-checkbox-input"
                            checked={selectedMaterials.includes(opt.value)}
                            onChange={() => toggleCsvParam('material', opt.value)}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 5: Brand & Fit */}
                <div className="browse-filter-col">
                  <div>
                    <span className="browse-filter-section-label">BRAND</span>
                    <input
                      type="text"
                      className="browse-text-input"
                      aria-label="Filter by brand"
                      placeholder="Search brands, e.g. Levi's"
                      value={brandDraft}
                      onChange={(e) => setBrandDraft(e.target.value)}
                    />
                  </div>

                  <div>
                    <span className="browse-filter-section-label">FIT</span>
                    <div className="browse-checkbox-grid">
                      {GENDER_OPTIONS.map((opt) => (
                        <label key={opt.value || 'all-fit'} className="browse-checkbox-label">
                          <input
                            type="radio"
                            name="browse-gender"
                            className="browse-checkbox-input"
                            checked={gender === opt.value}
                            onChange={() =>
                              updateParams((next) => {
                                if (opt.value) next.set('gender', opt.value);
                                else next.delete('gender');
                              })
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Chips Bar */}
              <div className="browse-filter-footer">
                <div className="browse-active-chips">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className="browse-chip-btn"
                      onClick={chip.onRemove}
                    >
                      <span>{chip.label}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                  {activeChips.length > 0 && (
                    <button
                      type="button"
                      className="browse-clear-btn"
                      onClick={clearAllFilters}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="browse-apply-btn"
                  onClick={() => setFiltersOpen(false)}
                >
                  Show {pagination.totalItems} {pagination.totalItems === 1 ? 'result' : 'results'}
                </button>
              </div>
            </section>
          </>
        )}

        {/* Garment Archive Grid */}
        {loading ? (
          <div className="browse-grid" aria-busy="true" aria-label="Loading garments">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="browse-skeleton-card">
                <div className="browse-skeleton-box" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="browse-state-panel" role="alert">
            <span className="browse-state-eyebrow">ARCHIVE UNAVAILABLE</span>
            <h2 className="browse-state-title">Could not load catalogue pieces.</h2>
            <p className="browse-state-copy">{error}</p>
            <button type="button" className="browse-apply-btn" onClick={fetchItems}>
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="browse-state-panel">
            <span className="browse-state-eyebrow">NO MATCHING PIECES</span>
            <h2 className="browse-state-title">
              {activeChips.length > 0
                ? 'No garments match these filter selections.'
                : 'No garments are currently listed in active circulation.'}
            </h2>
            <p className="browse-state-copy">
              {activeChips.length > 0
                ? 'Widen your point range or remove a filter to see more community pieces.'
                : 'Be the first to circulate a garment into the community wardrobe.'}
            </p>
            {activeChips.length > 0 ? (
              <button type="button" className="browse-apply-btn" onClick={clearAllFilters}>
                Clear All Filters
              </button>
            ) : (
              <Link to="/add-item" className="browse-card-cta">
                + List an Item
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="browse-grid">
              {items.map((item) => {
                const shortCode = String(item._id || '').slice(-4).toUpperCase() || '0000';
                const specsParts = [
                  `Size ${item.size || 'One Size'}`,
                  item.brand || item.material || null,
                ].filter(Boolean);

                return (
                  <article key={item._id} className="browse-card">
                    <Link to={`/items/${item._id}`} aria-label={`Inspect ${item.title}`}>
                      <GarmentCardImage item={item} />
                    </Link>

                    <p className="browse-card-meta">
                      {(item.category || 'garment').toUpperCase()} &bull; #RW-{shortCode}
                    </p>

                    <h2 className="browse-card-title">
                      <Link to={`/items/${item._id}`} className="browse-card-title-link">
                        {item.title}
                      </Link>
                    </h2>

                    <p className="browse-card-specs">{specsParts.join(' • ')}</p>

                    <p className="browse-condition-strip">
                      {formatConditionLabel(item.condition)} &bull; {truncateNote(item.description)}
                    </p>

                    <div className="browse-card-footer">
                      <span className="browse-card-points">{item.pointsValue || 50} PTS</span>
                      <Link to={`/items/${item._id}`} className="browse-card-cta">
                        Inspect &amp; Swap
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Footer */}
            {pagination.totalItems > 0 && (
              <nav className="browse-pagination" aria-label="Pagination">
                {pagination.totalPages > 1 && (
                  <div className="browse-pagination-controls">
                    <button
                      type="button"
                      className="browse-page-btn"
                      disabled={!pagination.hasPrevPage}
                      onClick={() =>
                        updateParams(
                          (next) => {
                            const prevPage = Math.max(1, page - 1);
                            if (prevPage === 1) next.delete('page');
                            else next.set('page', String(prevPage));
                          },
                          { resetPage: false }
                        )
                      }
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="browse-page-btn"
                      disabled={!pagination.hasNextPage}
                      onClick={() =>
                        updateParams(
                          (next) => {
                            next.set('page', String(page + 1));
                          },
                          { resetPage: false }
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                )}
                <p className="browse-pagination-summary">
                  Showing {showingStart}–{showingEnd} of {pagination.totalItems} matching{' '}
                  {pagination.totalItems === 1 ? 'piece' : 'pieces'}
                  {pagination.totalPages > 1
                    ? ` (Page ${pagination.currentPage} of ${pagination.totalPages})`
                    : ''}
                </p>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ItemsPage;
