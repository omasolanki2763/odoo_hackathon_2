import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import RedeemModal from '../components/RedeemModal';
import { getToken, getStoredUser, clearAuthSession } from '../utils/authStorage';
import { refreshSessionUser } from '../utils/refreshSessionUser';
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
    case 'reserved':
      return { label: 'Reserved', className: 'detail-status-pending' };
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
  const parsed = getStoredUser();
  return parsed?._id || parsed?.id || null;
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
  const [selectedImage, setSelectedImage] = useState(0);
  const [failedImages, setFailedImages] = useState({});

  const [actionBanner, setActionBanner] = useState({ type: '', text: '' });
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemQuote, setRedeemQuote] = useState(null);
  const [redeemQuoteLoading, setRedeemQuoteLoading] = useState(false);
  const [redeemQuoteError, setRedeemQuoteError] = useState('');
  const [redeemSubmitError, setRedeemSubmitError] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const redeemBtnRef = useRef(null);

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

      const token = getToken();
      if (token) {
        try {
          const previousUser = getStoredUser();
          const freshUser = await refreshSessionUser();
          if (freshUser) {
            setCurrentUserId(freshUser._id || freshUser.id || null);
          } else if (previousUser) {
            setCurrentUserId(previousUser._id || previousUser.id || null);
          }
        } catch (profileErr) {
          if (profileErr.response?.status === 401) {
            clearAuthSession();
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

  const openRedeemModal = async () => {
    setActionBanner({ type: '', text: '' });
    if (!getToken()) {
      navigate('/login');
      return;
    }

    setRedeemQuote(null);
    setRedeemQuoteError('');
    setRedeemSubmitError('');
    setRedeemQuoteLoading(true);
    setShowRedeemModal(true);

    try {
      const quoteRes = await api.get('/swaps/quote', {
        params: { item: item._id },
      });
      setRedeemQuote(quoteRes.data?.data || null);
    } catch (err) {
      setRedeemQuoteError(
        err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          'Unable to check points balance for this garment right now.'
      );
    } finally {
      setRedeemQuoteLoading(false);
    }
  };

  const handleConfirmRedeem = async () => {
    if (!item || !redeemQuote?.canAfford) {
      return;
    }

    const redeemCost = typeof redeemQuote.cost === 'number' ? redeemQuote.cost : pointsCost;
    setRedeemSubmitError('');
    setRedeeming(true);
    try {
      const res = await api.post('/swaps/redeem/direct', {
        itemId: item._id,
        pointsOffered: redeemCost,
      });
      if (res.data?.data?.item) {
        setItem(res.data.data.item);
      } else {
        setItem((prev) => (prev ? { ...prev, status: 'redeemed' } : prev));
      }
      await refreshSessionUser();
      setShowRedeemModal(false);
      setActionBanner({
        type: 'success',
        text: `Redeemed for ${redeemCost} points. Check your swaps dashboard for handoff updates.`,
      });
    } catch (err) {
      setRedeemSubmitError(
        err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          'Unable to complete points redemption.'
      );
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
                {isAvailable ? (
                  <Link
                    to={`/swaps/new?item=${item._id}`}
                    className="detail-btn detail-btn-primary"
                  >
                    Propose a swap
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="detail-btn detail-btn-primary"
                    disabled
                  >
                    Propose a swap
                  </button>
                )}
                <button
                  ref={redeemBtnRef}
                  type="button"
                  className="detail-btn detail-btn-secondary"
                  disabled={!isAvailable || redeeming}
                  onClick={openRedeemModal}
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
                Points transfer to @{owner?.username || 'the owner'} only when your request is accepted.
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

            {/* Owner Card */}
            {owner && (
              <section className="detail-card" aria-label="Listing owner">
                <span className="detail-card-eyebrow">LISTED BY</span>
                <div className="detail-owner-row">
                  <div className="detail-owner-identity">
                    <div className="detail-owner-avatar" aria-hidden="true">
                      {getOwnerInitials(owner)}
                    </div>
                    <div>
                      <p className="detail-owner-name">
                        <Link to={`/members/${owner.username}`} className="detail-owner-handle-link">
                          @{owner.username}
                        </Link>
                      </p>
                      <p className="detail-owner-sub">
                        {[
                          locationText || owner.profile?.location || null,
                          memberSinceYear ? `Member since ${memberSinceYear}` : null,
                        ]
                          .filter(Boolean)
                          .join(' • ') || 'Community Member'}
                      </p>
                      <p className="detail-owner-trust">
                        {owner.trustSummary?.ratingCount > 0 ? (
                          <>
                            <span className="detail-owner-stars" aria-hidden="true">★</span>{' '}
                            <span className="font-number">{Number(owner.trustSummary.averageStars).toFixed(1)}</span>{' '}
                            <span>
                              ({owner.trustSummary.ratingCount}{' '}
                              {owner.trustSummary.ratingCount === 1 ? 'rating' : 'ratings'})
                            </span>
                          </>
                        ) : (
                          'No ratings yet'
                        )}
                      </p>
                    </div>
                  </div>

                  <Link to={`/members/${owner.username}`} className="detail-owner-link">
                    View rack &rsaquo;
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

      <RedeemModal
        isOpen={showRedeemModal}
        item={item}
        ownerUsername={owner?.username}
        quote={redeemQuote}
        quoteLoading={redeemQuoteLoading}
        quoteError={redeemQuoteError}
        submitError={redeemSubmitError}
        submitting={redeeming}
        onClose={() => setShowRedeemModal(false)}
        onConfirm={handleConfirmRedeem}
        triggerRef={redeemBtnRef}
      />
    </div>
  );
};

export default ItemDetailPage;
