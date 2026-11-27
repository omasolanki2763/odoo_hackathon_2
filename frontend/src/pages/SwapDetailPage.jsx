import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { getStoredUser } from '../utils/authStorage';
import { refreshSessionUser } from '../utils/refreshSessionUser';
import '../styles/SwapDetailPage.css';

const STATUS_META = {
  pending: { label: 'Pending', className: 'swdetail-pill-pending' },
  accepted: { label: 'Accepted', className: 'swdetail-pill-accepted' },
  completed: { label: 'Completed', className: 'swdetail-pill-accepted' },
  rejected: { label: 'Declined', className: 'swdetail-pill-declined' },
  cancelled: { label: 'Cancelled', className: 'swdetail-pill-closed' },
  expired: { label: 'Expired', className: 'swdetail-pill-closed' },
};

const CONDITION_LABELS = {
  new: 'Unworn / New',
  'like-new': 'Like New',
  good: 'Good',
  fair: 'Fair / Patina',
  worn: 'Well Worn',
};

const TX_LABELS = {
  hold: { label: 'Held', sign: '-', tone: 'pending' },
  received: { label: 'Transferred', sign: '+', tone: 'credit' },
  refund: { label: 'Refunded', sign: '+', tone: 'credit' },
  spent: { label: 'Spent', sign: '-', tone: 'debit' },
  earned: { label: 'Earned', sign: '+', tone: 'credit' },
};

const extractImage = (item) => {
  const first = item?.images?.[0];
  if (!first) return null;
  return typeof first === 'string' ? first : first.url || null;
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatCountdown = (expiresAt, nowMs) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - nowMs;
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) return 'Expires in under 1m';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.max(1, Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000)));
  if (days > 0) return `Expires in ${days}d ${hours}h`;
  if (hours > 0) return `Expires in ${hours}h ${mins}m`;
  return `Expires in ${mins}m`;
};

const getErrorCode = (status) => {
  if (status === 403) return 'SWAP_FORBIDDEN';
  if (status === 404 || status === 400) return 'SWAP_NOT_FOUND';
  return 'SWAP_LOAD_ERROR';
};

const getInitials = (userObj) => {
  if (!userObj) return 'RW';
  if (userObj.firstName && userObj.lastName) {
    return `${userObj.firstName.charAt(0)}${userObj.lastName.charAt(0)}`.toUpperCase();
  }
  return (userObj.username || 'RW').slice(0, 2).toUpperCase();
};

const ItemComparisonTile = ({ eyebrow, item, bonusPoints = 0 }) => {
  const imageUrl = extractImage(item);
  const condition = CONDITION_LABELS[item?.condition] || item?.condition || 'Good';
  return (
    <div className="swdetail-item-slot">
      <p className="swdetail-eyebrow">{eyebrow}</p>
      {item ? (
        <div className="swdetail-item-inner">
          <div className="swdetail-item-thumb">
            {imageUrl ? (
              <img src={imageUrl} alt={item.title} className="swdetail-img" />
            ) : (
              <div className="swdetail-placeholder">
                <span>{(item.category || 'ITEM').toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="swdetail-item-info">
            <h2 className="swdetail-item-title">
              <Link to={`/items/${item._id}`} className="swdetail-item-link">
                {item.title}
              </Link>
            </h2>
            <p className="swdetail-item-meta">
              SIZE {item.size || 'ONE SIZE'} &bull; {condition.toUpperCase()}
            </p>
            <p className="swdetail-item-pts font-number">
              {item.pointsValue || 50} PTS
              {bonusPoints > 0 && (
                <span className="swdetail-bonus-pill"> + {bonusPoints} PTS top-up</span>
              )}
            </p>
          </div>
        </div>
      ) : (
        <p className="swdetail-muted-copy">Garment record unavailable</p>
      )}
    </div>
  );
};

const SwapDetailPage = () => {
  const { id } = useParams();

  const [swap, setSwap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState({ message: '', status: null });

  const [actionLoading, setActionLoading] = useState(false);
  const [actionBanner, setActionBanner] = useState({ type: '', text: '' });
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const currentUser = useMemo(() => getStoredUser(), []);
  const currentUserId = currentUser?._id || currentUser?.id || null;

  const fetchSwap = useCallback(async () => {
    setLoading(true);
    setLoadError({ message: '', status: null });
    try {
      const res = await api.get(`/swaps/${id}`);
      setSwap(res.data?.data || null);
    } catch (err) {
      setLoadError({
        message: err.response?.data?.message || 'Unable to load this swap right now.',
        status: err.response?.status || null,
      });
      setSwap(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSwap();
  }, [fetchSwap]);

  useEffect(() => {
    if (swap?.status !== 'pending' || !swap?.expiresAt) {
      return undefined;
    }
    const timer = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, [swap?.status, swap?.expiresAt]);

  const runAction = async (endpoint, body, successText) => {
    setActionLoading(true);
    setActionBanner({ type: '', text: '' });
    try {
      if (body !== undefined) {
        await api.put(endpoint, body);
      } else {
        await api.put(endpoint);
      }
      const refreshed = await api.get(`/swaps/${id}`);
      setSwap(refreshed.data?.data || null);
      await refreshSessionUser();
      setShowDeclineForm(false);
      setDeclineReason('');
      setActionBanner({ type: 'success', text: successText });
    } catch (err) {
      setActionBanner({
        type: 'error',
        text: err.response?.data?.message || 'Could not update this swap. Please try again.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="swdetail-page">
        <div className="shell-inner">
          <div className="swdetail-card" aria-busy="true" aria-label="Loading swap details">
            <p className="swdetail-eyebrow">EXCHANGE RECORD</p>
            <h1 className="swdetail-title">Loading swap details…</h1>
          </div>
        </div>
      </div>
    );
  }

  if (loadError.message || !swap) {
    const code = getErrorCode(loadError.status);
    return (
      <div className="swdetail-page">
        <div className="shell-inner">
          <nav aria-label="Breadcrumb" className="swdetail-breadcrumb">
            <Link to="/" className="swdetail-breadcrumb-link">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/swaps" className="swdetail-breadcrumb-link">
              Swaps
            </Link>
            <span aria-hidden="true">/</span>
            <span>Swap</span>
          </nav>

          <header className="swdetail-header">
            <h1 className="swdetail-title">Swap</h1>
            <p className="swdetail-subtitle">We could not open this swap.</p>
          </header>

          <div className="swdetail-error-grid">
            <section className="swdetail-error-card" role="alert">
              <p className="swdetail-eyebrow">SOMETHING WENT WRONG</p>
              <h2 className="swdetail-error-heading">This swap could not be loaded</h2>
              <ul className="swdetail-error-list">
                <li>
                  {loadError.status === 403
                    ? 'Only the member who proposed this swap and the garment owner can view it.'
                    : 'The other member may have withdrawn or deleted it.'}
                </li>
                <li>The link may be incomplete or mistyped.</li>
                <li>Your connection may have dropped while loading details.</li>
              </ul>

              <div className="swdetail-error-actions">
                <button
                  type="button"
                  className="swdetail-btn swdetail-btn-ink"
                  onClick={fetchSwap}
                >
                  Try again
                </button>
                <Link to="/swaps" className="swdetail-btn swdetail-btn-secondary">
                  Back to swaps
                </Link>
                <Link to="/dashboard" className="swdetail-btn swdetail-btn-secondary">
                  Back to dashboard
                </Link>
              </div>

              <p className="swdetail-error-code">Error code: {code}</p>
            </section>

            <aside className="swdetail-reassure-card">
              <p className="swdetail-eyebrow">POINTS SAFETY</p>
              <p className="swdetail-reassure-copy">
                Your points and reserved listings stay tracked on your ledger. No points transfer to
                an owner unless a pending swap is accepted.
              </p>
              <Link to="/swaps" className="swdetail-inline-link">
                Review all your swaps &rsaquo;
              </Link>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const requester = swap.requesterId && typeof swap.requesterId === 'object' ? swap.requesterId : null;
  const owner = swap.itemOwnerId && typeof swap.itemOwnerId === 'object' ? swap.itemOwnerId : null;
  const requesterId = requester?._id || (typeof swap.requesterId === 'string' ? swap.requesterId : null);
  const ownerId = owner?._id || (typeof swap.itemOwnerId === 'string' ? swap.itemOwnerId : null);

  const isOwner = Boolean(currentUserId && ownerId && String(currentUserId) === String(ownerId));
  const isRequester = Boolean(currentUserId && requesterId && String(currentUserId) === String(requesterId));
  const partner = isOwner ? requester : owner;
  const partnerUsername = partner?.username || 'member';
  const partnerSince = partner?.createdAt ? new Date(partner.createdAt).getFullYear() : null;

  const statusMeta = STATUS_META[swap.status] || {
    label: swap.status || 'Active',
    className: 'swdetail-pill-closed',
  };
  const countdownText =
    swap.status === 'pending' ? formatCountdown(swap.expiresAt, nowMs) : null;

  const pointsOffered = swap.pointsOffered || 0;
  const transactions = Array.isArray(swap.transactions) ? swap.transactions : [];
  const timeline = Array.isArray(swap.timeline) ? swap.timeline : [];

  const getPointsHeadline = () => {
    if (pointsOffered === 0) {
      return 'No points change hands (item-for-item exchange).';
    }
    if (swap.status === 'pending') {
      return `Held: ${pointsOffered} points held from @${requester?.username || 'requester'} until accepted, declined, cancelled, or expired.`;
    }
    if (swap.status === 'accepted' || swap.status === 'completed') {
      return `Transferred: ${pointsOffered} points credited to @${owner?.username || 'owner'}.`;
    }
    return `Refunded: ${pointsOffered} points returned to @${requester?.username || 'requester'}.`;
  };

  const renderRoleActions = () => {
    if (swap.status === 'pending' && isOwner) {
      return (
        <>
          <p className="swdetail-side-copy">
            @{requester?.username || 'This member'} offered their garment
            {pointsOffered > 0 ? ` with +${pointsOffered} points` : ''}. Accept to confirm the
            exchange or decline to release both items.
          </p>

          {!showDeclineForm ? (
            <div className="swdetail-side-buttons">
              <button
                type="button"
                className="swdetail-btn swdetail-btn-primary"
                disabled={actionLoading}
                onClick={() =>
                  runAction(`/swaps/${id}/accept`, {}, 'Swap accepted. Both garments are now confirmed.')
                }
              >
                {actionLoading ? 'Updating…' : 'Accept swap'}
              </button>
              <button
                type="button"
                className="swdetail-btn swdetail-btn-danger-outline"
                disabled={actionLoading}
                onClick={() => setShowDeclineForm(true)}
              >
                Decline swap
              </button>
            </div>
          ) : (
            <div className="swdetail-decline-box">
              <label htmlFor="decline-reason-input" className="swdetail-eyebrow">
                REASON FOR DECLINING (OPTIONAL)
              </label>
              <textarea
                id="decline-reason-input"
                rows={3}
                maxLength={500}
                className="swdetail-textarea"
                placeholder="Share a brief note for the requester (optional)"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
              <div className="swdetail-decline-actions">
                <button
                  type="button"
                  className="swdetail-btn swdetail-btn-secondary"
                  disabled={actionLoading}
                  onClick={() => {
                    setShowDeclineForm(false);
                    setDeclineReason('');
                  }}
                >
                  Keep open
                </button>
                <button
                  type="button"
                  className="swdetail-btn swdetail-btn-primary"
                  disabled={actionLoading}
                  onClick={() =>
                    runAction(
                      `/swaps/${id}/reject`,
                      { reason: declineReason.trim() || undefined },
                      'Swap declined. Reserved items and any held points have been released.'
                    )
                  }
                >
                  {actionLoading ? 'Declining…' : 'Confirm decline'}
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    if (swap.status === 'pending' && isRequester) {
      return (
        <>
          <p className="swdetail-side-copy">
            Waiting for @{owner?.username || 'the owner'} to respond.
            {pointsOffered > 0
              ? ` Cancelling refunds your ${pointsOffered} held points immediately.`
              : ''}
          </p>
          <div className="swdetail-side-buttons">
            <button
              type="button"
              className="swdetail-btn swdetail-btn-danger-outline"
              disabled={actionLoading}
              onClick={() =>
                runAction(
                  `/swaps/${id}/cancel`,
                  undefined,
                  'Request cancelled and items returned to available.'
                )
              }
            >
              {actionLoading ? 'Cancelling…' : 'Cancel request'}
            </button>
          </div>
        </>
      );
    }

    if (swap.status === 'accepted' && (isOwner || isRequester)) {
      return (
        <>
          <p className="swdetail-side-copy">
            This exchange is confirmed. Once both sides finish handover, mark the swap as completed.
          </p>
          <div className="swdetail-side-buttons">
            <button
              type="button"
              className="swdetail-btn swdetail-btn-ink"
              disabled={actionLoading}
              onClick={() =>
                runAction(`/swaps/${id}/complete`, undefined, 'Swap marked as completed.')
              }
            >
              {actionLoading ? 'Updating…' : 'Mark as completed'}
            </button>
          </div>
        </>
      );
    }

    const readOnlyNotes = {
      completed: 'This swap is complete. No further actions are needed.',
      rejected: 'This swap was declined. Reserved garments and any held points were released.',
      cancelled: 'This request was cancelled by the requester. Any held points were refunded.',
      expired: 'This request expired after 3 days without a reply. Any held points were refunded.',
    };

    return (
      <p className="swdetail-side-copy">
        {readOnlyNotes[swap.status] || 'This swap is closed and read-only.'}
      </p>
    );
  };

  return (
    <div className="swdetail-page">
      <div className="shell-inner">
        <nav aria-label="Breadcrumb" className="swdetail-breadcrumb">
          <Link to="/" className="swdetail-breadcrumb-link">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/swaps" className="swdetail-breadcrumb-link">
            Swaps
          </Link>
          <span aria-hidden="true">/</span>
          <span>{swap.type === 'redeem' ? 'Redemption' : 'Swap detail'}</span>
        </nav>

        <header className="swdetail-header">
          <div className="swdetail-header-row">
            <h1 className="swdetail-title">
              {swap.type === 'redeem'
                ? `Redeem with @${partnerUsername}`
                : `Swap with @${partnerUsername}`}
            </h1>
            <span className={`swdetail-pill ${statusMeta.className}`}>
              <span aria-hidden="true">●</span>
              <span>{statusMeta.label}</span>
            </span>
            {countdownText && <span className="swdetail-expiry-chip">{countdownText}</span>}
          </div>
          <p className="swdetail-subtitle">
            Requested on {formatShortDate(swap.createdAt)}.{' '}
            {pointsOffered > 0 ? `${pointsOffered} points involved.` : 'No points change hands.'}
          </p>
        </header>

        {actionBanner.text && (
          <div
            role={actionBanner.type === 'error' ? 'alert' : 'status'}
            className={`swdetail-banner ${
              actionBanner.type === 'error' ? 'swdetail-banner-error' : 'swdetail-banner-success'
            }`}
          >
            {actionBanner.text}
          </div>
        )}

        <div className="swdetail-grid">
          <div className="swdetail-main">
            {/* Items Comparison */}
            <section className="swdetail-card swdetail-items-card" aria-label="Items in this exchange">
              {swap.type === 'redeem' ? (
                <div className="swdetail-items-pair">
                  <ItemComparisonTile
                    eyebrow={isOwner ? 'YOU GIVE' : 'YOU GET'}
                    item={swap.itemId}
                  />
                  <div className="swdetail-pair-arrow" aria-hidden="true">
                    &harr;
                  </div>
                  <div className="swdetail-item-slot">
                    <p className="swdetail-eyebrow">{isOwner ? 'YOU RECEIVE' : 'POINTS SPENT'}</p>
                    <p className="swdetail-redeem-pts font-number">{pointsOffered} PTS</p>
                    <p className="swdetail-muted-copy">Points redemption</p>
                  </div>
                </div>
              ) : (
                <div className="swdetail-items-pair">
                  <ItemComparisonTile
                    eyebrow="YOU GIVE"
                    item={isOwner ? swap.itemId : swap.requestedItemId}
                    bonusPoints={isRequester ? pointsOffered : 0}
                  />
                  <div className="swdetail-pair-arrow" aria-hidden="true">
                    &harr;
                  </div>
                  <ItemComparisonTile
                    eyebrow="YOU GET"
                    item={isOwner ? swap.requestedItemId : swap.itemId}
                    bonusPoints={isOwner ? pointsOffered : 0}
                  />
                </div>
              )}
            </section>

            {/* Points Summary & Transactions */}
            <section className="swdetail-card" aria-labelledby="points-summary-heading">
              <p className="swdetail-eyebrow" id="points-summary-heading">
                POINTS SUMMARY
              </p>
              <p className="swdetail-points-headline">{getPointsHeadline()}</p>

              {transactions.length > 0 && (
                <ul className="swdetail-tx-list">
                  {transactions.map((tx) => {
                    const txInfo = TX_LABELS[tx.type] || {
                      label: tx.type,
                      sign: '',
                      tone: 'muted',
                    };
                    return (
                      <li key={tx._id} className="swdetail-tx-row">
                        <div className="swdetail-tx-left">
                          <span className={`swdetail-tx-badge swdetail-tx-${txInfo.tone}`}>
                            {txInfo.label}
                          </span>
                          <div>
                            <p className="swdetail-tx-desc">{tx.description}</p>
                            <p className="swdetail-tx-date">{formatDateTime(tx.createdAt)}</p>
                          </div>
                        </div>
                        <div className="swdetail-tx-right">
                          <span className="swdetail-tx-amt font-number">
                            {txInfo.sign}
                            {tx.amount} PTS
                          </span>
                          {typeof tx.balance === 'number' && (
                            <span className="swdetail-tx-bal">Balance: {tx.balance}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Handover & Messages */}
            <section className="swdetail-card" aria-labelledby="handover-heading">
              <p className="swdetail-eyebrow" id="handover-heading">
                HANDOVER AND NOTES
              </p>
              <dl className="swdetail-dl">
                <div className="swdetail-dl-row">
                  <dt className="swdetail-dl-key">METHOD</dt>
                  <dd className="swdetail-dl-val">
                    {swap.handoverMethod === 'post'
                      ? 'By post (requester pays)'
                      : swap.handoverMethod === 'in_person'
                      ? 'Meet in person'
                      : 'Points redemption'}
                  </dd>
                </div>
                {swap.handoverNote && (
                  <div className="swdetail-dl-row">
                    <dt className="swdetail-dl-key">HANDOVER NOTE</dt>
                    <dd className="swdetail-dl-val">{swap.handoverNote}</dd>
                  </div>
                )}
                {swap.message && (
                  <div className="swdetail-dl-row">
                    <dt className="swdetail-dl-key">MESSAGE</dt>
                    <dd className="swdetail-dl-val">{swap.message}</dd>
                  </div>
                )}
                {swap.response?.message && (
                  <div className="swdetail-dl-row">
                    <dt className="swdetail-dl-key">RESPONSE</dt>
                    <dd className="swdetail-dl-val">{swap.response.message}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Timeline */}
            <section className="swdetail-card" aria-labelledby="timeline-heading">
              <p className="swdetail-eyebrow" id="timeline-heading">
                TIMELINE
              </p>
              {timeline.length > 0 ? (
                <ol className="swdetail-timeline">
                  {timeline.map((step, idx) => (
                    <li key={idx} className="swdetail-timeline-item">
                      <span className="swdetail-timeline-dot" aria-hidden="true" />
                      <div className="swdetail-timeline-body">
                        <div className="swdetail-timeline-head">
                          <span className="swdetail-timeline-action">{step.action}</span>
                          <span className="swdetail-timeline-date">
                            {formatDateTime(step.date)}
                          </span>
                        </div>
                        {step.details && <p className="swdetail-timeline-details">{step.details}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="swdetail-muted-copy">No timeline activity recorded yet.</p>
              )}
            </section>
          </div>

          <aside className="swdetail-side">
            <section className="swdetail-card" aria-labelledby="next-heading">
              <p className="swdetail-eyebrow" id="next-heading">
                WHAT HAPPENS NEXT
              </p>
              {renderRoleActions()}
            </section>

            <section className="swdetail-card" aria-label="Swap partner">
              <p className="swdetail-eyebrow">EXCHANGE PARTNER</p>
              <div className="swdetail-partner-row">
                <div className="swdetail-partner-avatar" aria-hidden="true">
                  {getInitials(partner)}
                </div>
                <div>
                  <p className="swdetail-partner-handle">@{partnerUsername}</p>
                  <p className="swdetail-partner-meta">
                    {partnerSince ? `Member since ${partnerSince}` : 'Community member'}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SwapDetailPage;
