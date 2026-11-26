import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { refreshSessionUser } from '../utils/refreshSessionUser';
import '../styles/ProposeSwapPage.css';

const SELECTABLE_STATUSES = new Set(['available', 'approved']);

const CONDITION_LABELS = {
  new: 'Unworn / New',
  'like-new': 'Like New',
  good: 'Good',
  fair: 'Fair / Patina',
  worn: 'Well Worn',
};

const getDisabledReason = (status) => {
  switch (status) {
    case 'reserved':
      return 'Reserved in another swap';
    case 'swapped':
      return 'Already swapped';
    case 'redeemed':
      return 'Already redeemed';
    case 'pending':
      return 'Waiting for approval';
    case 'rejected':
      return 'Not approved';
    default:
      return 'Unavailable';
  }
};

const extractImageUrl = (item) => {
  const first = item?.images?.[0];
  if (!first) return null;
  return typeof first === 'string' ? first : first.url || null;
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('userData');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const HANDOVER_NOTE_MAX = 300;
const MESSAGE_MAX = 500;

const ProposeSwapPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wantedItemId = searchParams.get('item') || '';

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [wantedItem, setWantedItem] = useState(null);
  const [myItems, setMyItems] = useState([]);

  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [includeTopUp, setIncludeTopUp] = useState(false);

  const [handoverMethod, setHandoverMethod] = useState('in_person');
  const [handoverNote, setHandoverNote] = useState('');
  const [message, setMessage] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentUser = useMemo(() => readStoredUser(), []);
  const currentUserId = currentUser?._id || currentUser?.id || null;

  const loadInitialData = useCallback(async () => {
    if (!wantedItemId) {
      setPageError('Choose an available garment from Browse Catalogue to propose a swap.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError('');
    setSubmitError('');

    try {
      const [itemRes, rackRes] = await Promise.all([
        api.get(`/items/${wantedItemId}`),
        api.get('/items/user/me', { params: { limit: 100 } }),
      ]);

      const loadedItem = itemRes.data?.data;
      if (!loadedItem) {
        setPageError('This garment could not be found.');
        return;
      }

      const rawRack = Array.isArray(rackRes.data?.data) ? rackRes.data.data : [];
      const filteredRack = rawRack.filter((entry) => entry._id !== loadedItem._id);

      setWantedItem(loadedItem);
      setMyItems(filteredRack);

      const firstSelectable = filteredRack.find((entry) =>
        SELECTABLE_STATUSES.has(entry.status)
      );
      setSelectedOfferId(firstSelectable?._id || '');
    } catch (err) {
      const errMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Unable to load swap details right now.';
      setPageError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [wantedItemId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const wantedOwner =
    wantedItem?.userId && typeof wantedItem.userId === 'object' ? wantedItem.userId : null;
  const wantedOwnerId =
    wantedOwner?._id || (typeof wantedItem?.userId === 'string' ? wantedItem.userId : null);
  const isOwnItem = Boolean(
    currentUserId && wantedOwnerId && String(currentUserId) === String(wantedOwnerId)
  );
  const isWantedAvailable = Boolean(wantedItem && SELECTABLE_STATUSES.has(wantedItem.status));

  const fetchQuote = useCallback(
    async (offerId, topUpParam) => {
      if (!wantedItemId || !offerId || !isWantedAvailable || isOwnItem) {
        setQuote(null);
        return;
      }

      setQuoteLoading(true);
      setSubmitError('');
      try {
        const params = { item: wantedItemId, offer: offerId };
        if (topUpParam !== undefined) {
          params.topUp = topUpParam;
        }
        const res = await api.get('/swaps/quote', { params });
        const quoteData = res.data?.data || null;
        setQuote(quoteData);

        if (topUpParam === undefined && quoteData) {
          setIncludeTopUp(quoteData.allowedTopUp > 0 && Boolean(quoteData.canAffordTopUp));
        }
      } catch (err) {
        const msg =
          err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          'Unable to calculate swap quote right now.';
        setQuote(null);
        setSubmitError(msg);
      } finally {
        setQuoteLoading(false);
      }
    },
    [wantedItemId, isWantedAvailable, isOwnItem]
  );

  useEffect(() => {
    if (selectedOfferId) {
      fetchQuote(selectedOfferId);
    } else {
      setQuote(null);
    }
  }, [selectedOfferId, fetchQuote]);

  const handleOfferSelect = (offerId) => {
    setSelectedOfferId(offerId);
    setIncludeTopUp(false);
  };

  const handleToggleTopUp = (event) => {
    const nextChecked = event.target.checked;
    setIncludeTopUp(nextChecked);
    if (selectedOfferId && quote && quote.allowedTopUp > 0) {
      fetchQuote(selectedOfferId, nextChecked ? quote.allowedTopUp : 0);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!wantedItem || !selectedOfferId || !handoverMethod) {
      setSubmitError('Select one of your available garments and a handover method.');
      return;
    }

    const pointsOffered =
      quote && quote.allowedTopUp > 0 && includeTopUp ? quote.allowedTopUp : 0;

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        itemId: wantedItem._id,
        requestedItemId: selectedOfferId,
        type: 'swap',
        pointsOffered,
        handoverMethod,
      };
      if (handoverNote.trim()) {
        payload.handoverNote = handoverNote.trim();
      }
      if (message.trim()) {
        payload.message = message.trim();
      }

      const res = await api.post('/swaps', payload);
      const createdSwap = res.data?.data;
      await refreshSessionUser();
      navigate(createdSwap?._id ? `/swaps/${createdSwap._id}` : '/swaps');
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Unable to send swap request. Please review your selection and try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="propose-page">
        <div className="shell-inner">
          <div className="propose-state-card" aria-busy="true" aria-label="Loading swap proposal">
            <p className="propose-eyebrow">PREPARING SWAP PROPOSAL</p>
            <h1 className="propose-title">Loading your rack and garment details…</h1>
          </div>
        </div>
      </div>
    );
  }

  if (pageError || !wantedItem) {
    return (
      <div className="propose-page">
        <div className="shell-inner">
          <div className="propose-state-card" role="alert">
            <p className="propose-eyebrow">SWAP UNAVAILABLE</p>
            <h1 className="propose-title">Cannot start this swap proposal.</h1>
            <p className="propose-subtitle">
              {pageError || 'The requested garment could not be loaded.'}
            </p>
            <div style={{ marginTop: 'var(--space-5)' }}>
              <Link to="/items" className="propose-btn-primary" style={{ width: 'auto', display: 'inline-flex' }}>
                Return to Browse Catalogue
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ownerUsername = wantedOwner?.username || 'member';
  const selectedOffer = myItems.find((entry) => entry._id === selectedOfferId) || null;
  const selectableCount = myItems.filter((entry) => SELECTABLE_STATUSES.has(entry.status)).length;
  const wantedPhoto = extractImageUrl(wantedItem);
  const wantedPoints = quote?.wantedPoints ?? wantedItem.pointsValue ?? 50;
  const offeredPoints = quote?.offeredPoints ?? selectedOffer?.pointsValue ?? 0;

  const effectiveTopUp =
    quote && quote.allowedTopUp > 0 && includeTopUp ? quote.allowedTopUp : 0;
  const displayBalanceBefore = quote?.balanceBefore ?? currentUser?.points ?? 0;
  const displayBalanceAfter =
    quote && typeof quote.topUpApplied === 'number' && quote.topUpApplied === effectiveTopUp
      ? quote.balanceAfter
      : displayBalanceBefore - effectiveTopUp;
  const topUpExceedsBalance =
    quote && quote.allowedTopUp > 0 && includeTopUp && displayBalanceAfter < 0;

  const stepOneDone = Boolean(selectedOfferId);
  const stepTwoDone = Boolean(quote && !quoteLoading);

  const memberSince = wantedOwner?.createdAt
    ? new Date(wantedOwner.createdAt).getFullYear()
    : null;
  const wantedCondition = CONDITION_LABELS[wantedItem.condition] || wantedItem.condition || 'Good';

  return (
    <div className="propose-page">
      <div className="shell-inner">
        <nav aria-label="Breadcrumb" className="propose-breadcrumb">
          <Link to="/" className="propose-breadcrumb-link">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/items" className="propose-breadcrumb-link">
            Browse
          </Link>
          <span aria-hidden="true">/</span>
          <Link to={`/items/${wantedItem._id}`} className="propose-breadcrumb-link">
            {wantedItem.title}
          </Link>
          <span aria-hidden="true">/</span>
          <span>Propose a swap</span>
        </nav>

        <header className="propose-header">
          <h1 className="propose-title">Propose a swap</h1>
          <p className="propose-subtitle">
            Pick what you will give in return. @{ownerUsername} sees your offer and can accept or decline.
          </p>

          <ol className="propose-steps" aria-label="Swap proposal progress">
            <li
              className={`propose-step${
                stepOneDone ? ' propose-step-done' : ' propose-step-active'
              }`}
            >
              <span className="propose-step-num" aria-hidden="true">
                1
              </span>
              <span className="propose-step-label">Choose your item</span>
            </li>
            <li className="propose-step-line" aria-hidden="true" />
            <li
              className={`propose-step${
                stepOneDone && !stepTwoDone
                  ? ' propose-step-active'
                  : stepTwoDone
                  ? ' propose-step-active'
                  : ''
              }`}
            >
              <span className="propose-step-num" aria-hidden="true">
                2
              </span>
              <span className="propose-step-label">Check the match</span>
            </li>
            <li className="propose-step-line" aria-hidden="true" />
            <li className="propose-step">
              <span className="propose-step-num" aria-hidden="true">
                3
              </span>
              <span className="propose-step-label">Send</span>
            </li>
          </ol>
        </header>

        {(isOwnItem || !isWantedAvailable) && (
          <div className="propose-alert" role="alert" style={{ marginBottom: 'var(--space-6)' }}>
            {isOwnItem
              ? 'This is your own listing. Choose another member’s garment to propose a swap.'
              : `This garment is currently ${wantedItem.status || 'unavailable'} and cannot accept new swap requests.`}
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Link to={`/items/${wantedItem._id}`} className="propose-inline-link">
                Back to garment listing
              </Link>
            </div>
          </div>
        )}

        <div className="propose-grid">
          <div className="propose-left">
            <section className="propose-card propose-wanted-card" aria-label="Garment you want">
              <div className="propose-wanted-main">
                <div className="propose-wanted-thumb">
                  {wantedPhoto ? (
                    <img src={wantedPhoto} alt={wantedItem.title} className="propose-img" />
                  ) : (
                    <div className="propose-placeholder">
                      <span>{(wantedItem.category || 'GARMENT').toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="propose-wanted-info">
                  <p className="propose-eyebrow">YOU WANT</p>
                  <h2 className="propose-wanted-title">{wantedItem.title}</h2>
                  <p className="propose-wanted-meta">
                    SIZE {wantedItem.size || 'ONE SIZE'} &bull; {wantedCondition.toUpperCase()}
                  </p>
                  <p className="propose-wanted-pts font-number">{wantedPoints} PTS</p>
                </div>
              </div>

              <div className="propose-wanted-owner">
                <p className="propose-owner-handle">@{ownerUsername}</p>
                <p className="propose-owner-meta">
                  {memberSince ? `Member since ${memberSince}` : 'Community Member'}
                </p>
              </div>
            </section>

            <section aria-labelledby="offer-heading">
              <h2 id="offer-heading" className="propose-section-title">
                Choose what to offer
              </h2>
              <p className="propose-section-sub">
                Only approved, available items from your rack can be offered.
              </p>

              {myItems.length === 0 ? (
                <div className="propose-empty-card">
                  <h3 className="propose-empty-title">Your rack has no listed garments yet</h3>
                  <p className="propose-empty-copy">
                    Add a garment to your rack before proposing an item-for-item swap.
                  </p>
                  <Link to="/add-item" className="propose-btn-primary" style={{ width: 'auto', display: 'inline-flex' }}>
                    List an item first
                  </Link>
                </div>
              ) : (
                <>
                  <div className="propose-offers-grid" role="radiogroup" aria-label="Your rack items">
                    {myItems.map((candidate) => {
                      const selectable = SELECTABLE_STATUSES.has(candidate.status);
                      const checked = selectedOfferId === candidate._id;
                      const thumbUrl = extractImageUrl(candidate);
                      const reason = !selectable ? getDisabledReason(candidate.status) : null;

                      return (
                        <label
                          key={candidate._id}
                          className={`propose-offer-card${
                            checked ? ' propose-offer-card-selected' : ''
                          }${!selectable ? ' propose-offer-card-disabled' : ''}`}
                        >
                          <input
                            type="radio"
                            name="offeredItem"
                            value={candidate._id}
                            checked={checked}
                            disabled={!selectable}
                            aria-disabled={!selectable || undefined}
                            onChange={() => handleOfferSelect(candidate._id)}
                            className="propose-offer-radio"
                          />
                          <div className="propose-offer-thumb">
                            {thumbUrl ? (
                              <img src={thumbUrl} alt="" className="propose-img" />
                            ) : (
                              <div className="propose-placeholder">
                                <span>{(candidate.category || 'ITEM').toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div className="propose-offer-body">
                            <span className="propose-offer-title">{candidate.title}</span>
                            <span className="propose-offer-pts font-number">
                              {candidate.pointsValue || 50} PTS
                            </span>
                            {reason && <span className="propose-offer-reason">{reason}</span>}
                          </div>
                          <span className="propose-offer-indicator" aria-hidden="true" />
                        </label>
                      );
                    })}
                  </div>

                  {selectableCount === 0 && (
                    <div className="propose-empty-notice">
                      <span>None of your current items are available to offer right now. </span>
                      <Link to="/add-item" className="propose-inline-link">
                        List an item first
                      </Link>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          <aside className="propose-right">
            <form className="propose-card propose-summary-card" onSubmit={handleSubmit}>
              <p className="propose-eyebrow">CHECK THE MATCH</p>

              <div className="propose-match-rows">
                <div className="propose-match-row">
                  <div>
                    <span className="propose-match-label">YOU GIVE</span>
                    <span className="propose-match-title">
                      {selectedOffer ? selectedOffer.title : 'Choose an item from your rack'}
                    </span>
                  </div>
                  <span className="propose-match-pts font-number">
                    {selectedOffer ? `${offeredPoints} PTS` : '—'}
                  </span>
                </div>

                <div className="propose-match-row">
                  <div>
                    <span className="propose-match-label">YOU GET</span>
                    <span className="propose-match-title">{wantedItem.title}</span>
                  </div>
                  <span className="propose-match-pts font-number">{wantedPoints} PTS</span>
                </div>
              </div>

              <div className="propose-divider" />

              {quoteLoading ? (
                <p className="propose-quote-status">Checking points match…</p>
              ) : quote ? (
                <div className="propose-quote-block">
                  {quote.allowedTopUp > 0 ? (
                    <>
                      <p className="propose-quote-heading">
                        Your item is worth {quote.allowedTopUp} points less.
                      </p>

                      <label className="propose-topup-check">
                        <input
                          type="checkbox"
                          checked={includeTopUp}
                          onChange={handleToggleTopUp}
                        />
                        <span>Add {quote.allowedTopUp} points to balance it</span>
                      </label>

                      <p className="propose-quote-balance">
                        You have {displayBalanceBefore}. After the swap: {displayBalanceAfter}.
                      </p>

                      {includeTopUp ? (
                        topUpExceedsBalance ? (
                          <div className="propose-match-pill propose-match-pill-warn">
                            Balance is {Math.abs(displayBalanceAfter)} points short for this top-up.
                          </div>
                        ) : (
                          <div className="propose-match-pill propose-match-pill-ok">
                            Balanced: {offeredPoints} + {effectiveTopUp} = {wantedPoints} points
                          </div>
                        )
                      ) : (
                        <div className="propose-match-pill propose-match-pill-muted">
                          No top-up added ({quote.allowedTopUp} points difference)
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="propose-quote-heading">
                        {quote.difference === 0
                          ? `Both pieces are valued at ${wantedPoints} points. No top-up needed.`
                          : `Your garment is worth ${Math.abs(quote.difference)} points more. No top-up needed.`}
                      </p>
                      <p className="propose-quote-balance">
                        You have {displayBalanceBefore}. After the swap: {displayBalanceBefore}.
                      </p>
                      <div className="propose-match-pill propose-match-pill-ok">
                        No top-up needed: {offeredPoints} vs {wantedPoints} points
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="propose-quote-status">
                  Select an available item from your rack to preview the points match.
                </p>
              )}

              <div className="propose-divider" />

              <fieldset className="propose-fieldset">
                <legend className="propose-eyebrow">HANDOVER</legend>
                <div className="propose-handover-options">
                  <label className="propose-radio-label">
                    <input
                      type="radio"
                      name="handoverMethod"
                      value="in_person"
                      checked={handoverMethod === 'in_person'}
                      onChange={() => setHandoverMethod('in_person')}
                    />
                    <span>Meet in person</span>
                  </label>
                  <label className="propose-radio-label">
                    <input
                      type="radio"
                      name="handoverMethod"
                      value="post"
                      checked={handoverMethod === 'post'}
                      onChange={() => setHandoverMethod('post')}
                    />
                    <span>By post (you pay)</span>
                  </label>
                </div>
              </fieldset>

              <div className="propose-field">
                <div className="propose-field-head">
                  <label htmlFor="handover-note" className="propose-eyebrow">
                    HANDOVER NOTE (OPTIONAL)
                  </label>
                  <span className="propose-counter font-number">
                    {handoverNote.length} / {HANDOVER_NOTE_MAX}
                  </span>
                </div>
                <input
                  id="handover-note"
                  type="text"
                  maxLength={HANDOVER_NOTE_MAX}
                  className="propose-input"
                  placeholder="Preferred neighbourhood, station, or dispatch timing"
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                />
              </div>

              <div className="propose-field">
                <div className="propose-field-head">
                  <label htmlFor="swap-message" className="propose-eyebrow">
                    MESSAGE TO @{ownerUsername.toUpperCase()} (OPTIONAL)
                  </label>
                  <span className="propose-counter font-number">
                    {message.length} / {MESSAGE_MAX}
                  </span>
                </div>
                <textarea
                  id="swap-message"
                  rows={3}
                  maxLength={MESSAGE_MAX}
                  className="propose-textarea"
                  placeholder="Free on Saturday near Indiranagar metro?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {submitError && (
                <div className="propose-alert" role="alert">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                className="propose-btn-primary"
                disabled={
                  submitting ||
                  !selectedOfferId ||
                  !isWantedAvailable ||
                  isOwnItem
                }
              >
                {submitting ? 'Sending swap request…' : 'Send swap request'}
              </button>
            </form>

            <p className="propose-footnote">
              @{ownerUsername} has 3 days to reply. Both garments are reserved until the request is
              accepted, declined, or expires.
            </p>
            <Link to={`/items/${wantedItem._id}`} className="propose-cancel-link">
              Cancel and go back
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ProposeSwapPage;
