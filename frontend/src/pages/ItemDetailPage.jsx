import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/ItemDetailPage.css';

const CONDITION_RUBRIC = {
  new: { label: 'Unworn / New', bars: 10, score: '10 / 10' },
  'like-new': { label: 'Like New', bars: 9, score: '9 / 10' },
  good: { label: 'Good', bars: 8, score: '8 / 10' },
  fair: { label: 'Fair / Patina', bars: 6, score: '6 / 10' },
  worn: { label: 'Well Worn', bars: 4, score: '4 / 10' },
};

const FIT_LABELS = {
  'runs-small': 'Runs small',
  true: 'True to size',
  'runs-large': 'Runs large',
};

const MEASUREMENT_LABELS = {
  chest: 'Chest, pit to pit',
  bust: 'Bust',
  waist: 'Waist',
  length: 'Length',
  shoulder: 'Shoulder',
  sleeve: 'Sleeve',
  inseam: 'Inseam',
  rise: 'Rise',
  legOpening: 'Leg opening',
  width: 'Width',
  euSize: 'EU Size',
  ukSize: 'UK Size',
  insoleLength: 'Insole length',
};

const SIZE_ONLY_MEASUREMENT_KEYS = new Set(['euSize', 'ukSize']);

const formatStatusBadge = (status) => {
  switch (status) {
    case 'available':
    case 'approved':
      return { label: 'Available', className: 'detail-status-available' };
    case 'pending':
      return { label: 'Pending Review', className: 'detail-status-pending' };
    case 'swapped':
      return { label: 'Swapped', className: 'detail-status-closed' };
    case 'redeemed':
      return { label: 'Redeemed', className: 'detail-status-closed' };
    default:
      return { label: status || 'Listed', className: 'detail-status-closed' };
  }
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatYearLabel = (dateStr) => {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return String(parsed.getFullYear());
};

const getOwnerInitials = (owner) => {
  if (!owner) return 'RW';
  if (owner.firstName && owner.lastName) {
    return `${owner.firstName.charAt(0)}${owner.lastName.charAt(0)}`.toUpperCase();
  }
  return (owner.username || 'RW').slice(0, 2).toUpperCase();
};

const readStoredUserId = () => {
  try {
    const raw = localStorage.getItem('userData');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?._id || parsed?.id || null;
  } catch {
    return null;
  }
};

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [item, setItem] = useState(null);
  const [relatedItems, setRelatedItems] = useState([]);

  const [currentUserId, setCurrentUserId] = useState(() => readStoredUserId());
  const [userPoints, setUserPoints] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [failedImages, setFailedImages] = useState({});

  const [actionBanner, setActionBanner] = useState({ type: '', text: '' });
  const [redeeming, setRedeeming] = useState(false);

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [userItems, setUserItems] = useState([]);
  const [loadingUserItems, setLoadingUserItems] = useState(false);
  const [selectedSwapItemId, setSelectedSwapItemId] = useState('');
  const [swapMessage, setSwapMessage] = useState('');
  const [submittingSwap, setSubmittingSwap] = useState(false);

  const loadItemDetails = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setError('');
    setSelectedImage(0);
    setFailedImages({});

    try {
      const itemRes = await api.get(`/items/${id}`);
      const itemData = itemRes.data?.data;
      if (!itemData) {
        setNotFound(true);
        return;
      }
      setItem(itemData);

      // Load up to 3 other available pieces cleanly without blocking on failure
      api
        .get('/items', { params: { limit: 4 } })
        .then((relRes) => {
          const pool = Array.isArray(relRes.data?.data) ? relRes.data.data : [];
          setRelatedItems(pool.filter((entry) => entry._id !== itemData._id).slice(0, 3));
        })
        .catch(() => {
          setRelatedItems([]);
        });

      const token = localStorage.getItem('token');
      if (token) {
        try {
          const profileRes = await api.get('/auth/profile');
          const profileUser = profileRes.data?.data;
          if (profileUser) {
            setCurrentUserId(profileUser._id || profileUser.id || null);
            setUserPoints(typeof profileUser.points === 'number' ? profileUser.points : 0);
          }
        } catch (profileErr) {
          if (profileErr.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            setCurrentUserId(null);
          }
        }
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 400) {
        setNotFound(true);
      } else {
        setError(err.response?.data?.message || 'Unable to load garment details right now.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadItemDetails();
  }, [loadItemDetails]);

  useEffect(() => {
    if (!showSwapModal) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowSwapModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showSwapModal]);

  const owner = item?.userId && typeof item.userId === 'object' ? item.userId : null;
  const ownerId = owner?._id || (typeof item?.userId === 'string' ? item.userId : null);
  const isOwner = Boolean(currentUserId && ownerId && String(currentUserId) === String(ownerId));
  const isAvailable = item?.status === 'available' || item?.status === 'approved';
  const pointsCost = item?.pointsValue || 50;

  const images = useMemo(() => {
    if (!Array.isArray(item?.images)) return [];
    return item.images
      .map((img) => (typeof img === 'string' ? { url: img } : img))
      .filter((img) => img && img.url);
  }, [item]);

  const measurementEntries = useMemo(() => {
    if (!item?.measurements || typeof item.measurements !== 'object') return [];
    const unit = item.measurements.unit || 'cm';
    return Object.entries(MEASUREMENT_LABELS)
      .map(([key, label]) => {
        const raw = item.measurements[key];
        if (raw === undefined || raw === null || raw === '') return null;
        const formatted = SIZE_ONLY_MEASUREMENT_KEYS.has(key) ? String(raw) : `${raw} ${unit}`;
        return { key, label, value: formatted };
      })
      .filter(Boolean);
  }, [item]);

  const openSwapModal = async () => {
    setActionBanner({ type: '', text: '' });
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    setShowSwapModal(true);
    setLoadingUserItems(true);
    try {
      const res = await api.get('/auth/dashboard');
      const allItems = res.data?.data?.recentItems || [];
      const swappable = allItems.filter(
        (candidate) =>
          candidate._id !== item._id &&
          (candidate.status === 'available' ||
            candidate.status === 'approved' ||
            candidate.status === 'pending')
      );
      setUserItems(swappable);
      setSelectedSwapItemId(swappable[0]?._id || '');
    } catch {
      setActionBanner({ type: 'error', text: 'Could not load items from your rack right now.' });
      setShowSwapModal(false);
    } finally {
      setLoadingUserItems(false);
    }
  };

  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSwapItemId) {
      setActionBanner({ type: 'error', text: 'Select a garment from your rack to offer.' });
      return;
    }

    const offered = userItems.find((entry) => entry._id === selectedSwapItemId);
    setSubmittingSwap(true);
    try {
      await api.post('/swaps', {
        itemId: item._id,
        requestedItemId: selectedSwapItemId,
        type: 'swap',
        message:
          swapMessage.trim() ||
          `I would like to swap my "${offered?.title || 'garment'}" for your "${item.title}".`,
      });
      setShowSwapModal(false);
      setSwapMessage('');
      setActionBanner({
        type: 'success',
        text: 'Swap proposal sent. Nothing moves until the owner accepts your request.',
      });
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message;
      setActionBanner({ type: 'error', text: msg || 'Failed to send swap proposal.' });
    } finally {
      setSubmittingSwap(false);
    }
  };

  const handleRedeem = async () => {
    setActionBanner({ type: '', text: '' });
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    if (userPoints < pointsCost) {
      setActionBanner({
        type: 'error',
        text: `Insufficient balance: you have ${userPoints} points and this piece requires ${pointsCost} points.`,
      });
      return;
    }

    setRedeeming(true);
    try {
      const res = await api.post('/swaps/redeem/direct', {
        itemId: item._id,
        pointsOffered: pointsCost,
      });
      if (res.data?.data?.item) {
        setItem(res.data.data.item);
      } else {
        setItem((prev) => (prev ? { ...prev, status: 'redeemed' } : prev));
      }
      if (typeof res.data?.data?.user?.points === 'number') {
        setUserPoints(res.data.data.user.points);
      }
      setActionBanner({
        type: 'success',
        text: `Redeemed for ${pointsCost} points. Check your swaps dashboard for handoff updates.`,
      });
    } catch (err) {
      setActionBanner({
        type: 'error',
        text: err.response?.data?.message || 'Unable to complete points redemption.',
      });
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div className="shell-inner">
          <div className="detail-skeleton-grid" aria-busy="true" aria-label="Loading item details">
            <div className="detail-skeleton-block" />
            <div className="detail-skeleton-block" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="detail-page">
        <div className="shell-inner">
          <div className="detail-state-card">
            <p className="detail-eyebrow">ARCHIVE RECORD NOT FOUND</p>
            <h1 className="detail-title">This garment could not be found.</h1>
            <p className="detail-description">
              It may have been removed by its owner or the link may be incorrect.
            </p>
            <div style={{ marginTop: 'var(--space-5)', display: 'inline-block' }}>
              <Link to="/items" className="detail-btn detail-btn-primary">
                Return to Browse Catalogue
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="detail-page">
        <div className="shell-inner">
          <div className="detail-state-card" role="alert">
            <p className="detail-eyebrow">CONNECTION ERROR</p>
            <h1 className="detail-title">Unable to load this listing.</h1>
            <p className="detail-description">{error || 'Please try again shortly.'}</p>
            <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
              <button type="button" className="detail-btn detail-btn-primary" style={{ width: 'auto' }} onClick={loadItemDetails}>
                Try Again
              </button>
              <Link to="/items" className="detail-btn detail-btn-secondary" style={{ width: 'auto' }}>
                Browse Catalogue
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activePhoto = images[selectedImage];
  const activePhotoBroken = !activePhoto || failedImages[selectedImage];
  const conditionInfo = CONDITION_RUBRIC[item.condition] || CONDITION_RUBRIC.good;
  const statusInfo = formatStatusBadge(item.status);
  const listedDate = formatDateLabel(item.createdAt);
  const memberSinceYear = formatYearLabel(owner?.createdAt);
  const locationText = [item.location?.city, item.location?.country].filter(Boolean).join(', ');
  const fitDisplay = item.fit ? FIT_LABELS[item.fit] || item.fit : null;

  const specRows = [
    item.material ? { key: 'MATERIAL', val: item.material } : null,
    item.brand ? { key: 'BRAND', val: item.brand } : null,
    item.colour ? { key: 'COLOUR', val: item.colour } : null,
    item.gender ? { key: 'FIT CATEGORY', val: item.gender } : null,
    locationText ? { key: 'PICK-UP', val: locationText } : null,
  ].filter(Boolean);

  return (
    <div className="detail-page">
      <div className="shell-inner">
        <nav aria-label="Breadcrumb" className="detail-breadcrumb">
          <Link to="/" className="detail-breadcrumb-link">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/items" className="detail-breadcrumb-link">
            Browse
          </Link>
          {item.category && (
            <>
              <span aria-hidden="true">/</span>
              <Link to={`/items?category=${item.category}`} className="detail-breadcrumb-link">
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span>{item.title}</span>
        </nav>

        {actionBanner.text && (
          <div
            role={actionBanner.type === 'error' ? 'alert' : 'status'}
            className={`detail-banner ${
              actionBanner.type === 'error' ? 'detail-banner-error' : 'detail-banner-success'
            }`}
          >
            {actionBanner.text}
          </div>
        )}

        <div className="detail-main-grid">
          {/* Left Column: Gallery + About this item */}
          <div className="detail-col-left">
            <section className="detail-card" aria-label="Garment photos">
              <div className="detail-hero-frame">
                {!activePhotoBroken ? (
                  <img
                    src={activePhoto.url}
                    alt={item.title || 'Community garment photo'}
                    className="detail-hero-img"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [selectedImage]: true }))
                    }
                  />
                ) : (
                  <div className="detail-placeholder">
                    <span className="detail-placeholder-tag">
                      {(item.category || 'garment').toUpperCase()}
                    </span>
                    <span className="detail-placeholder-copy">Daylight photo pending</span>
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="detail-thumb-strip" role="group" aria-label="Select garment image">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`View photo ${idx + 1} of ${item.title}`}
                      aria-pressed={selectedImage === idx}
                      className={`detail-thumb-btn${
                        selectedImage === idx ? ' detail-thumb-btn-active' : ''
                      }`}
                      onClick={() => setSelectedImage(idx)}
                    >
                      <img
                        src={img.url}
                        alt={`${item.title} thumbnail ${idx + 1}`}
                        className="detail-thumb-img"
                      />
                    </button>
                  ))}
                </div>
              )}

              <p className="detail-gallery-caption">
                Listings show up to 5 member-supplied garment photos.
              </p>
            </section>

            <section className="detail-card" aria-labelledby="about-heading">
              <h2 id="about-heading" className="detail-section-title">
                About this item
              </h2>
              <p className="detail-description">{item.description}</p>

              {specRows.length > 0 && (
                <dl className="detail-spec-list">
                  {specRows.map((row) => (
                    <div key={row.key} className="detail-spec-row">
                      <dt className="detail-spec-key">{row.key}</dt>
                      <dd className="detail-spec-val">{row.val}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          </div>

          {/* Right Column: Title, Points & Actions, Condition Rubric, Measurements, Owner */}
          <div className="detail-col-right">
            <header>
              <p className="detail-eyebrow">
                {(item.category || 'GARMENT').toUpperCase()}
                {listedDate ? ` • LISTED ${listedDate.toUpperCase()}` : ''}
              </p>
              <h1 className="detail-title">{item.title}</h1>
              <div className="detail-status-row">
                <span className={`detail-status-pill ${statusInfo.className}`}>
                  <span aria-hidden="true">●</span>
                  <span>{statusInfo.label}</span>
                </span>
                <span className="detail-status-summary">
                  Size {item.size || 'One Size'} &bull; {conditionInfo.label}
                </span>
              </div>
            </header>

            <div className="detail-points-box">
              <div>
                <span className="detail-points-label">POINTS</span>
                <div className="detail-points-value-wrap">
                  <span className="detail-points-number">{pointsCost}</span>
                  <span className="detail-points-unit">points</span>
                </div>
              </div>
              <p className="detail-points-note">
                or swap item for item with something from your rack
              </p>
            </div>

            {isOwner ? (
              <div className="detail-owner-notice">
                <p style={{ margin: '0 0 var(--space-3)' }}>
                  <strong>This is your listing</strong> (Status: {statusInfo.label}).
                </p>
                <Link to="/dashboard" className="detail-btn detail-btn-secondary">
                  Manage Listing in Dashboard
                </Link>
              </div>
            ) : (
              <div className="detail-actions">
                <button
                  type="button"
                  className="detail-btn detail-btn-primary"
                  disabled={!isAvailable}
                  onClick={openSwapModal}
                >
                  Propose a swap
                </button>
                <button
                  type="button"
                  className="detail-btn detail-btn-secondary"
                  disabled={!isAvailable || redeeming}
                  onClick={handleRedeem}
                >
                  {redeeming ? 'Completing redemption…' : `Redeem for ${pointsCost} points`}
                </button>
                <p className="detail-action-footnote">
                  {isAvailable
                    ? `Nothing moves until @${owner?.username || 'the owner'} accepts.`
                    : `Currently ${statusInfo.label.toLowerCase()} and unavailable for new requests.`}
                </p>
              </div>
            )}

            {/* Condition Rubric Card */}
            <section className="detail-card" aria-label="Condition rubric">
              <span className="detail-card-eyebrow">CONDITION, AS DESCRIBED BY THE OWNER</span>
              <div className="detail-condition-meter-row">
                <div className="detail-condition-bars" aria-hidden="true">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`detail-condition-segment${
                        idx < conditionInfo.bars ? ' detail-condition-segment-filled' : ''
                      }`}
                    />
                  ))}
                </div>
                <span className="detail-condition-score">
                  {conditionInfo.label}
                  <span className="detail-condition-score-num">{conditionInfo.score}</span>
                </span>
              </div>
              <p className="detail-protection-note">
                If it arrives not as described, points stay protected until swap confirmation completes.
              </p>
            </section>

            {/* Size & Measurements Table */}
            <section className="detail-card" aria-label="Size and laid-flat measurements">
              <span className="detail-card-eyebrow">SIZE AND MEASUREMENTS, LAID FLAT</span>
              <div className="detail-size-row">
                <span className="detail-size-badge">{item.size || 'One Size'}</span>
                {fitDisplay && <span className="detail-fit-note">Fit note: {fitDisplay}</span>}
              </div>

              {measurementEntries.length > 0 ? (
                <div className="detail-measurements-grid" role="table" aria-label="Garment measurements">
                  {measurementEntries.map((entry) => (
                    <div key={entry.key} className="detail-measurement-cell" role="row">
                      <span className="detail-measurement-label" role="rowheader">
                        {entry.label}
                      </span>
                      <span className="detail-measurement-value" role="cell">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="detail-measurements-empty">
                  No laid-flat measurements supplied for this listing.
                </p>
              )}
            </section>

            {/* Owner Card (Username + Member Since only; trust ratings arrive in Task 15) */}
            {owner && (
              <section className="detail-card" aria-label="Listing owner">
                <span className="detail-card-eyebrow">LISTED BY</span>
                <div className="detail-owner-row">
                  <div className="detail-owner-identity">
                    <div className="detail-owner-avatar" aria-hidden="true">
                      {getOwnerInitials(owner)}
                    </div>
                    <div>
                      <p className="detail-owner-name">@{owner.username}</p>
                      <p className="detail-owner-sub">
                        {[
                          locationText || owner.profile?.location || null,
                          memberSinceYear ? `Member since ${memberSinceYear}` : null,
                        ]
                          .filter(Boolean)
                          .join(' • ') || 'Community Member'}
                      </p>
                    </div>
                  </div>

                  <Link to="/items" className="detail-owner-link">
                    Browse Archive &rsaquo;
                  </Link>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Related Available Pieces */}
        {relatedItems.length > 0 && (
          <section className="detail-related" aria-labelledby="related-heading">
            <div className="detail-related-header">
              <h2 id="related-heading" className="detail-section-title" style={{ margin: 0 }}>
                More in Circulation
              </h2>
              <Link to="/items" className="detail-owner-link">
                See all &rsaquo;
              </Link>
            </div>

            <div className="detail-related-grid">
              {relatedItems.map((rel) => {
                const relImg = rel.images?.[0]?.url || (typeof rel.images?.[0] === 'string' ? rel.images[0] : null);
                return (
                  <article key={rel._id} className="detail-related-card">
                    <div className="detail-related-photo">
                      {relImg ? (
                        <img
                          src={relImg}
                          alt={rel.title || 'Related garment'}
                          className="detail-hero-img"
                        />
                      ) : (
                        <div className="detail-placeholder">
                          <span className="detail-placeholder-tag">
                            {(rel.category || 'garment').toUpperCase()}
                          </span>
                          <span className="detail-placeholder-copy">Daylight photo pending</span>
                        </div>
                      )}
                    </div>
                    <h3 className="detail-related-title">{rel.title}</h3>
                    <p className="detail-related-meta">
                      Size {rel.size || 'One Size'} &bull; {(rel.condition || 'good').toUpperCase()}
                    </p>
                    <div className="detail-related-footer">
                      <span className="detail-related-pts">{rel.pointsValue || 50} PTS</span>
                      <Link to={`/items/${rel._id}`} className="detail-related-cta">
                        View
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Propose a Swap Modal */}
      {showSwapModal && (
        <div
          className="detail-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSwapModal(false);
          }}
        >
          <div
            className="detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="swap-modal-title"
          >
            <h2 id="swap-modal-title" className="detail-section-title">
              Propose a Swap
            </h2>
            <p className="detail-status-summary">
              Select a piece from your rack to offer for &ldquo;{item.title}&rdquo;.
            </p>

            {loadingUserItems ? (
              <p className="detail-measurements-empty" style={{ margin: 'var(--space-5) 0' }}>
                Loading your garments…
              </p>
            ) : userItems.length === 0 ? (
              <div style={{ margin: 'var(--space-5) 0' }}>
                <p className="detail-description">
                  You have no available garments listed yet to offer in exchange.
                </p>
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
                  <Link to="/add-item" className="detail-btn detail-btn-primary">
                    + List an Item First
                  </Link>
                  <button
                    type="button"
                    className="detail-btn detail-btn-secondary"
                    onClick={() => setShowSwapModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSwapSubmit}>
                <div className="detail-modal-list" role="radiogroup" aria-label="Your rack items">
                  {userItems.map((candidate) => {
                    const selected = selectedSwapItemId === candidate._id;
                    return (
                      <button
                        key={candidate._id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`detail-modal-item-btn${
                          selected ? ' detail-modal-item-btn-selected' : ''
                        }`}
                        onClick={() => setSelectedSwapItemId(candidate._id)}
                      >
                        <span>
                          <strong>{candidate.title}</strong> ({candidate.size})
                        </span>
                        <span>{candidate.pointsValue || 50} PTS</span>
                      </button>
                    );
                  })}
                </div>

                <textarea
                  className="detail-modal-textarea"
                  aria-label="Message to owner"
                  placeholder="Optional note to the owner (meetup details, fit question)…"
                  value={swapMessage}
                  onChange={(e) => setSwapMessage(e.target.value)}
                />

                <div className="detail-modal-actions">
                  <button
                    type="button"
                    className="detail-btn detail-btn-secondary"
                    onClick={() => setShowSwapModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="detail-btn detail-btn-primary"
                    disabled={submittingSwap || !selectedSwapItemId}
                  >
                    {submittingSwap ? 'Sending…' : 'Send Swap Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetailPage;
