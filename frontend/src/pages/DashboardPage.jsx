import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { getToken } from '../utils/authStorage';
import { refreshSessionUser } from '../utils/refreshSessionUser';
import '../styles/DashboardPage.css';

const ITEM_STATUS_META = {
  pending: { label: 'Pending approval', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  available: { label: 'Available', tone: 'green' },
  reserved: { label: 'Reserved', tone: 'amber' },
  swapped: { label: 'Swapped', tone: 'slate' },
  redeemed: { label: 'Redeemed', tone: 'slate' },
  rejected: { label: 'Rejected', tone: 'red' },
};

const CREDIT_TX_TYPES = new Set(['earned', 'received', 'bonus', 'refund']);

const extractImage = (item) => {
  const images = item?.images;
  if (!Array.isArray(images) || images.length === 0) return null;
  const primary = images.find((img) => img && img.isPrimary && img.url);
  if (primary?.url) return primary.url;
  const first = images[0];
  return typeof first === 'string' ? first : first?.url || null;
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatExpiryCountdown = (expiresAt, nowMs) => {
  if (!expiresAt) return 'Awaiting reply';
  const diffMs = new Date(expiresAt).getTime() - nowMs;
  if (Number.isNaN(diffMs)) return 'Awaiting reply';
  if (diffMs <= 0) return 'Expires soon';
  const totalHours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h left to expire`;
  const mins = Math.max(1, Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000)));
  return hours > 0 ? `${hours}h ${mins}m left to expire` : `${mins}m left to expire`;
};

const renderStars = (avg) => {
  const filled = Math.max(0, Math.min(5, Math.round(Number(avg) || 0)));
  return (
    <span className="dash-stars" aria-hidden="true">
      {'★'.repeat(filled)}
      {'☆'.repeat(5 - filled)}
    </span>
  );
};

const describeSwapTerms = (swap, viewerIsOwner) => {
  const wantedTitle = swap.itemId?.title || 'garment';
  const offeredTitle = swap.requestedItemId?.title || null;
  const pts = Number(swap.pointsOffered) || 0;

  if (swap.type === 'redeem') {
    return `Offers ${pts} points for ${wantedTitle}`;
  }
  if (viewerIsOwner) {
    return offeredTitle
      ? `Wants ${wantedTitle}, offers ${offeredTitle}${pts > 0 ? ` + ${pts} pts` : ''}`
      : `Wants ${wantedTitle}`;
  }
  return offeredTitle
    ? `You offered ${offeredTitle}${pts > 0 ? ` + ${pts} pts` : ''}`
    : 'Pending owner response';
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showWelcomeNotice, setShowWelcomeNotice] = useState(
    searchParams.get('welcome') === '1' || Boolean(location.state?.welcome)
  );
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busySwapId, setBusySwapId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ type: '', text: '' });
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fetchDashboard = useCallback(async () => {
    const token = getToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setError('');
    try {
      const res = await api.get('/auth/dashboard');
      setDashboard(res.data?.data || null);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to load your dashboard right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const openRequests = dashboard?.openRequests || [];
  const swapsNeedingAction = dashboard?.swapsNeedingAction || [];
  const hasPendingExpiries = openRequests.length > 0 || swapsNeedingAction.length > 0;

  useEffect(() => {
    if (!hasPendingExpiries) return undefined;
    const interval = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, [hasPendingExpiries]);

  const dismissWelcomeNotice = () => {
    setShowWelcomeNotice(false);
    if (searchParams.has('welcome')) {
      const next = new URLSearchParams(searchParams);
      next.delete('welcome');
      setSearchParams(next, { replace: true });
    }
  };

  const handleQuickSwapDecision = async (swapId, action) => {
    setBusySwapId(swapId);
    setActionFeedback({ type: '', text: '' });
    try {
      await api.put(`/swaps/${swapId}/${action}`);
      await fetchDashboard();
      await refreshSessionUser();
      setActionFeedback({
        type: 'success',
        text:
          action === 'accept'
            ? 'Swap accepted. Review handover details on the swap page.'
            : 'Swap request declined. Held items and points were released.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Could not update that swap request right now.',
      });
    } finally {
      setBusySwapId(null);
    }
  };

  if (loading) {
    return (
      <div className="dash-page">
        <div className="shell-inner">
          <div className="dash-card dash-state-card" aria-busy="true" aria-label="Loading dashboard">
            <p className="dash-eyebrow">MEMBER DASHBOARD</p>
            <p className="dash-subtitle">Loading your rack, swap requests, and points ledger…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="dash-page">
        <div className="shell-inner">
          <div className="dash-card dash-state-card" role="alert">
            <p className="dash-eyebrow">DASHBOARD UNAVAILABLE</p>
            <h1 className="dash-title">Could not load your dashboard.</h1>
            <p className="dash-subtitle">{error}</p>
            <div style={{ marginTop: 'var(--space-5)' }}>
              <button
                type="button"
                className="dash-btn dash-btn-primary"
                onClick={() => {
                  setLoading(true);
                  fetchDashboard();
                }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = dashboard.user || {};
  const username = user.username || 'member';
  const pointsBalance = Number(user.points ?? dashboard.stats?.totalPoints ?? 0);
  const myItems = Array.isArray(dashboard.myItems)
    ? dashboard.myItems
    : Array.isArray(dashboard.recentItems)
      ? dashboard.recentItems
      : [];
  const acceptedSwaps = dashboard.acceptedSwaps || [];
  const completedSwaps = dashboard.completedSwaps || [];
  const recentTransactions = dashboard.recentTransactions || [];
  const trust = dashboard.trust || { averageStars: 0, ratingCount: 0, matchedCount: 0 };
  const hasRatings = Number(trust.ratingCount) > 0;

  const stats = dashboard.stats || {};
  const itemsListedCount =
    typeof stats.itemsCount === 'number' ? stats.itemsCount : myItems.length;
  const swapsCompletedCount =
    typeof stats.swapsCompleted === 'number' ? stats.swapsCompleted : completedSwaps.length;
  const itemsReceivedCount =
    typeof stats.itemsReceived === 'number' ? stats.itemsReceived : 0;
  const totalSwapsCount =
    typeof stats.totalSwapsCount === 'number'
      ? stats.totalSwapsCount
      : swapsNeedingAction.length + openRequests.length + acceptedSwaps.length + completedSwaps.length;

  const earnedPoints =
    typeof stats.earnedPoints === 'number' ? stats.earnedPoints : pointsBalance;
  const spentPoints = typeof stats.spentPoints === 'number' ? stats.spentPoints : 0;

  const isWelcomeState = myItems.length === 0 && totalSwapsCount === 0;
  const callerId = String(user._id || user.id || '');

  return (
    <div className="dash-page">
      <div className="shell-inner">
        <nav aria-label="Breadcrumb" className="dash-breadcrumb">
          <Link to="/" className="dash-breadcrumb-link">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span>Dashboard</span>
        </nav>

        {showWelcomeNotice && (
          <section
            className="dash-welcome-notice"
            role="status"
            aria-live="polite"
            data-testid="dashboard-welcome-banner"
          >
            <div>
              <p className="dash-eyebrow dash-welcome-notice-eyebrow">WELCOME TO RE:WEAR</p>
              <h2 className="dash-welcome-notice-title">
                Welcome, @{username}. You received +{location.state?.starterPoints || 100} welcome points.
              </h2>
              <p className="dash-welcome-notice-copy">
                Your starter balance is recorded in your points ledger and ready for your first swap or redemption.
              </p>
            </div>
            <button
              type="button"
              className="dash-btn dash-btn-secondary"
              onClick={dismissWelcomeNotice}
              aria-label="Dismiss welcome notice"
            >
              Dismiss
            </button>
          </section>
        )}

        <header className="dash-header">
          <div className="dash-header-copy">
            <p className="dash-eyebrow">MEMBER WORKSPACE</p>
            <h1 className="dash-title">
              {isWelcomeState ? `Welcome, @${username}` : `Welcome back, @${username}`}
            </h1>
            <p className="dash-subtitle">
              {isWelcomeState
                ? 'Nothing on the rack yet. Start with your 100 welcome points and one garment.'
                : 'Your rack, swap actions, completed reviews, and points in one place.'}
            </p>
          </div>
          <div className="dash-header-actions">
            <Link to={`/members/${encodeURIComponent(username)}`} className="dash-btn dash-btn-secondary">
              Public rack
            </Link>
            <Link to="/add-item" className="dash-btn dash-btn-clay">
              + List an item
            </Link>
          </div>
        </header>

        {actionFeedback.text && (
          <div
            role={actionFeedback.type === 'error' ? 'alert' : 'status'}
            className={`dash-banner ${
              actionFeedback.type === 'error' ? 'dash-banner-error' : 'dash-banner-success'
            }`}
          >
            <span>{actionFeedback.text}</span>
            <button
              type="button"
              className="dash-btn dash-btn-secondary"
              onClick={() => setActionFeedback({ type: '', text: '' })}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Row: Points Balance Card + Account & Trust Summary Card */}
        <section className="dash-top-grid" aria-label="Points and account overview">
          <div className="dash-points-card">
            <div>
              <p className="dash-points-eyebrow">POINTS BALANCE</p>
              <div className="dash-points-main">
                <div className="dash-points-figure-wrap">
                  <span className="dash-points-figure font-number">{pointsBalance}</span>
                  <span className="dash-points-unit">points available</span>
                </div>
                <div className="dash-points-flows">
                  <div>
                    <span className="dash-points-flow-label">EARNED</span>
                    <span className="dash-points-earned font-number">
                      {earnedPoints > 0 ? `+${earnedPoints}` : '0'}
                    </span>
                  </div>
                  <div>
                    <span className="dash-points-flow-label">SPENT</span>
                    <span className="dash-points-spent font-number">
                      {spentPoints > 0 ? `-${spentPoints}` : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dash-points-foot">
              <p className="dash-points-note">
                {isWelcomeState
                  ? 'Includes your 100 starter welcome points.'
                  : 'Held points return automatically if a request is declined or expires.'}
              </p>
              <Link to="/points" className="dash-points-link">
                Points history &gt;
              </Link>
            </div>
          </div>

          <div className="dash-card dash-summary-card">
            <div>
              <p className="dash-eyebrow">YOUR ACCOUNT</p>
              <div className="dash-summary-top">
                <div>
                  <span className="dash-stat-val font-number">{itemsListedCount}</span>
                  <span className="dash-stat-label">ITEMS LISTED</span>
                </div>
                <div>
                  <span className="dash-stat-val font-number">{swapsCompletedCount}</span>
                  <span className="dash-stat-label">SWAPS COMPLETED</span>
                </div>
                <div>
                  <span className="dash-stat-val font-number">{itemsReceivedCount}</span>
                  <span className="dash-stat-label">ITEMS RECEIVED</span>
                </div>
              </div>
            </div>

            <div className="dash-trust-band" aria-label="My trust summary">
              <div>
                <p className="dash-eyebrow">MY TRUST SUMMARY</p>
                {hasRatings ? (
                  <div>
                    <div className="dash-trust-score-wrap">
                      <span className="dash-trust-score font-number">
                        {Number(trust.averageStars).toFixed(1)}
                      </span>
                      {renderStars(trust.averageStars)}
                      <span className="dash-trust-copy">
                        from {trust.ratingCount} {trust.ratingCount === 1 ? 'rating' : 'ratings'}
                      </span>
                    </div>
                    <p className="dash-trust-honesty">
                      {trust.matchedCount} of {trust.ratingCount} swaps matched their listing
                    </p>
                  </div>
                ) : (
                  <p className="dash-trust-empty">No ratings yet</p>
                )}
              </div>
              <Link to={`/members/${encodeURIComponent(username)}`} className="dash-text-link">
                View profile &gt;
              </Link>
            </div>
          </div>
        </section>

        {isWelcomeState ? (
          <section className="dash-card dash-welcome-card" aria-label="Welcome guide">
            <p className="dash-eyebrow">NEW MEMBER GUIDE · 100 WELCOME POINTS</p>
            <h2 className="dash-welcome-heading">Your rack is empty.</h2>
            <p className="dash-welcome-lead">
              Every new member starts with <strong>100 welcome points</strong> so you can explore the community exchange before waiting for a sale. Spend them to redeem a garment directly, or pair points with an item from your closet in a swap.
            </p>

            <div className="dash-steps-grid">
              <article className="dash-step-box">
                <div>
                  <p className="dash-step-num">STEP 01</p>
                  <h3 className="dash-step-title">List an item</h3>
                  <p className="dash-step-copy">
                    Photograph a clean garment from your wardrobe and share accurate measurements. Once moderators approve it, members can propose swaps or redeem it.
                  </p>
                </div>
                <Link to="/add-item" className="dash-btn dash-btn-clay">
                  List an item
                </Link>
              </article>

              <article className="dash-step-box">
                <div>
                  <p className="dash-step-num">STEP 02</p>
                  <h3 className="dash-step-title">Browse the catalogue</h3>
                  <p className="dash-step-copy">
                    Use your 100 welcome points to redeem an approved piece outright or offer one of your own garments when your rack goes live.
                  </p>
                </div>
                <Link to="/items" className="dash-btn dash-btn-primary">
                  Browse catalogue
                </Link>
              </article>

              <article className="dash-step-box">
                <div>
                  <p className="dash-step-num">STEP 03</p>
                  <h3 className="dash-step-title">How points work</h3>
                  <p className="dash-step-copy">
                    Points are held while a swap request is open for up to 3 days and released automatically if declined or expired. You earn points when others claim your garments.
                  </p>
                </div>
                <Link to="/points" className="dash-btn dash-btn-secondary">
                  View points ledger
                </Link>
              </article>
            </div>

            <div className="dash-welcome-foot">
              <div>
                <h3 className="dash-welcome-subhead">No swap requests yet.</h3>
                <p className="dash-empty-note">
                  Incoming requests for your listings and open requests you send will appear here.
                </p>
              </div>
              <div>
                <h3 className="dash-welcome-subhead">My trust summary</h3>
                <p className="dash-empty-note">
                  No ratings yet. Ratings reveal once both swap participants review or after 7 days.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Row 1: My Rack + Recent Points Activity */}
            <div className="dash-main-grid">
              <section className="dash-card" aria-labelledby="dash-rack-heading">
                <div className="dash-section-head">
                  <div>
                    <p className="dash-eyebrow">MY RACK &bull; {myItems.length} GARMENTS</p>
                    <h2 id="dash-rack-heading" className="dash-section-title">
                      My listed items
                    </h2>
                  </div>
                  <Link to="/add-item" className="dash-btn dash-btn-clay">
                    + List an item
                  </Link>
                </div>

                {myItems.length === 0 ? (
                  <div>
                    <p className="dash-empty-note" style={{ marginBottom: 'var(--space-4)' }}>
                      You haven&apos;t listed any garments yet. Add a piece from your closet so members can swap with you.
                    </p>
                    <Link to="/add-item" className="dash-btn dash-btn-primary">
                      List an item
                    </Link>
                  </div>
                ) : (
                  <ul className="dash-rack-list">
                    {myItems.map((item) => {
                      const statusMeta = ITEM_STATUS_META[item.status] || {
                        label: item.status || 'Listed',
                        tone: 'slate',
                      };
                      const thumb = extractImage(item);
                      const shortCode = String(item._id || '').slice(-4).toUpperCase() || '0000';

                      return (
                        <li key={item._id} className="dash-rack-row">
                          <div className="dash-rack-thumb">
                            {thumb ? (
                              <img src={thumb} alt="" className="dash-rack-img" />
                            ) : (
                              <span className="dash-rack-placeholder">
                                {(item.category || 'ITEM').toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="dash-rack-info">
                            <Link to={`/items/${item._id}`} className="dash-rack-title">
                              {item.title}
                            </Link>
                            <p className="dash-rack-meta">
                              SIZE {(item.size || 'ONE SIZE').toUpperCase()} &bull; RW-{shortCode}
                            </p>
                          </div>

                          <span className="dash-rack-pts font-number">
                            {item.pointsValue || 50} PTS
                          </span>

                          <span className={`dash-pill dash-pill-${statusMeta.tone}`}>
                            {statusMeta.label}
                          </span>

                          <Link to={`/items/${item._id}`} className="dash-text-link">
                            View
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="dash-card" aria-labelledby="dash-points-activity-heading">
                <div className="dash-section-head">
                  <div>
                    <p className="dash-eyebrow">POINTS LEDGER</p>
                    <h2 id="dash-points-activity-heading" className="dash-section-title">
                      Recent points activity
                    </h2>
                  </div>
                </div>

                {recentTransactions.length === 0 ? (
                  <p className="dash-empty-note" style={{ marginBottom: 'var(--space-4)' }}>
                    No points transactions recorded yet.
                  </p>
                ) : (
                  <ul className="dash-tx-list">
                    {recentTransactions.map((tx, idx) => {
                      const isCredit = CREDIT_TX_TYPES.has(tx.type);
                      const sign = isCredit ? '+' : '-';
                      return (
                        <li key={tx._id || tx.id || idx} className="dash-tx-row">
                          <div>
                            <p className="dash-tx-desc">{tx.description || tx.type}</p>
                            <p className="dash-tx-date">{formatShortDate(tx.createdAt)}</p>
                          </div>
                          <span
                            className={`font-number ${isCredit ? 'dash-tx-plus' : 'dash-tx-minus'}`}
                          >
                            {sign} {Math.abs(Number(tx.amount) || 0)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <Link to="/points" className="dash-text-link">
                  View full points history &gt;
                </Link>
              </section>
            </div>

            {/* Row 2: Swaps Needing Action + Open Requests & Completed Swaps */}
            <div className="dash-swaps-grid">
              <section className="dash-card" aria-labelledby="dash-action-swaps-heading">
                <div className="dash-section-head">
                  <div>
                    <p className="dash-eyebrow">
                      INCOMING &bull; {swapsNeedingAction.length} PENDING
                    </p>
                    <h2 id="dash-action-swaps-heading" className="dash-section-title">
                      Swaps needing my action
                    </h2>
                  </div>
                  <Link to="/swaps" className="dash-text-link">
                    All swaps &gt;
                  </Link>
                </div>

                {swapsNeedingAction.length === 0 && acceptedSwaps.length === 0 ? (
                  <p className="dash-empty-note">
                    No incoming swap requests need your action right now.
                  </p>
                ) : (
                  <ul className="dash-swap-list">
                    {swapsNeedingAction.map((swap) => {
                      const requesterHandle = swap.requesterId?.username || 'member';
                      const isBusy = busySwapId === swap._id;
                      return (
                        <li key={swap._id} className="dash-swap-item">
                          <div className="dash-swap-item-top">
                            <div>
                              <p className="dash-swap-title">@{requesterHandle}</p>
                              <p className="dash-swap-detail">{describeSwapTerms(swap, true)}</p>
                            </div>
                            <span className="dash-pill dash-pill-amber">Pending</span>
                          </div>

                          <p className="dash-swap-countdown">
                            {formatExpiryCountdown(swap.expiresAt, nowMs)}
                          </p>

                          <div className="dash-swap-actions">
                            <button
                              type="button"
                              className="dash-btn dash-btn-primary"
                              disabled={isBusy}
                              onClick={() => handleQuickSwapDecision(swap._id, 'accept')}
                            >
                              {isBusy ? 'Updating…' : 'Accept'}
                            </button>
                            <button
                              type="button"
                              className="dash-btn dash-btn-danger-ghost"
                              disabled={isBusy}
                              onClick={() => handleQuickSwapDecision(swap._id, 'reject')}
                            >
                              Decline
                            </button>
                            <Link to={`/swaps/${swap._id}`} className="dash-text-link">
                              View swap &gt;
                            </Link>
                          </div>
                        </li>
                      );
                    })}

                    {acceptedSwaps.map((swap) => {
                      const viewerIsOwner =
                        callerId && String(swap.itemOwnerId?._id || swap.itemOwnerId) === callerId;
                      const partnerHandle = viewerIsOwner
                        ? swap.requesterId?.username || 'member'
                        : swap.itemOwnerId?.username || 'member';
                      return (
                        <li key={swap._id} className="dash-swap-item">
                          <div className="dash-swap-item-top">
                            <div>
                              <p className="dash-swap-title">
                                {swap.itemId?.title || 'Accepted swap'} &bull; @{partnerHandle}
                              </p>
                              <p className="dash-swap-detail">
                                Accepted — coordinate handover and mark completed once received.
                              </p>
                            </div>
                            <span className="dash-pill dash-pill-green">Accepted</span>
                          </div>
                          <div className="dash-swap-actions">
                            <Link to={`/swaps/${swap._id}`} className="dash-btn dash-btn-secondary">
                              View swap &amp; complete
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <div className="dash-swaps-stack">
                <section className="dash-card" aria-labelledby="dash-open-requests-heading">
                  <div className="dash-section-head">
                    <div>
                      <p className="dash-eyebrow">
                        OUTGOING &bull; {openRequests.length} OPEN
                      </p>
                      <h2 id="dash-open-requests-heading" className="dash-section-title">
                        My open requests
                      </h2>
                    </div>
                  </div>

                  {openRequests.length === 0 ? (
                    <p className="dash-empty-note">
                      No open outgoing swap requests right now.
                    </p>
                  ) : (
                    <ul className="dash-swap-list">
                      {openRequests.map((swap) => {
                        const ownerHandle = swap.itemOwnerId?.username || 'member';
                        const wantedTitle = swap.itemId?.title || 'garment';
                        return (
                          <li key={swap._id} className="dash-swap-item">
                            <div className="dash-swap-item-top">
                              <div>
                                <p className="dash-swap-title">
                                  You requested {wantedTitle} from @{ownerHandle}
                                </p>
                                <p className="dash-swap-detail">{describeSwapTerms(swap, false)}</p>
                              </div>
                              <span className="dash-pill dash-pill-amber">Pending</span>
                            </div>
                            <p className="dash-swap-countdown">
                              {formatExpiryCountdown(swap.expiresAt, nowMs)}
                            </p>
                            <div className="dash-swap-actions">
                              <Link to={`/swaps/${swap._id}`} className="dash-text-link">
                                View swap &gt;
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="dash-card" aria-labelledby="dash-completed-swaps-heading">
                  <div className="dash-section-head">
                    <div>
                      <p className="dash-eyebrow">
                        COMPLETED &bull; {completedSwaps.length} RECENT
                      </p>
                      <h2 id="dash-completed-swaps-heading" className="dash-section-title">
                        Recently completed swaps
                      </h2>
                    </div>
                  </div>

                  {completedSwaps.length === 0 ? (
                    <p className="dash-empty-note">No completed swaps yet.</p>
                  ) : (
                    <ul className="dash-swap-list">
                      {completedSwaps.map((swap) => {
                        const viewerIsOwner =
                          callerId &&
                          String(swap.itemOwnerId?._id || swap.itemOwnerId) === callerId;
                        const partnerHandle = viewerIsOwner
                          ? swap.requesterId?.username || 'member'
                          : swap.itemOwnerId?.username || 'member';
                        const wantedTitle = swap.itemId?.title || 'Garment swap';
                        const isRated = Boolean(swap.hasRated);

                        return (
                          <li key={swap._id} className="dash-swap-item">
                            <div className="dash-swap-item-top">
                              <div>
                                <p className="dash-swap-title">
                                  {wantedTitle} with @{partnerHandle}
                                </p>
                                <p className="dash-swap-detail">
                                  Completed {formatShortDate(swap.completedAt || swap.updatedAt)}
                                </p>
                              </div>
                              <span
                                className={`dash-pill ${
                                  isRated ? 'dash-pill-slate' : 'dash-pill-amber'
                                }`}
                              >
                                {isRated ? 'Rated' : 'Unrated'}
                              </span>
                            </div>
                            <div className="dash-swap-actions">
                              {isRated ? (
                                <Link to={`/swaps/${swap._id}`} className="dash-text-link">
                                  View swap &gt;
                                </Link>
                              ) : (
                                <Link
                                  to={`/swaps/${swap._id}`}
                                  className="dash-btn dash-btn-clay"
                                >
                                  Rate this swap
                                </Link>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
