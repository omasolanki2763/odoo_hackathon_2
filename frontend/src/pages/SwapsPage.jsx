import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { getStoredUser } from '../utils/authStorage';
import '../styles/SwapsPage.css';

const STATUS_META = {
  pending: { label: 'Pending', className: 'swaps-pill-pending' },
  accepted: { label: 'Accepted', className: 'swaps-pill-accepted' },
  completed: { label: 'Completed', className: 'swaps-pill-accepted' },
  rejected: { label: 'Declined', className: 'swaps-pill-declined' },
  cancelled: { label: 'Cancelled', className: 'swaps-pill-closed' },
  expired: { label: 'Expired', className: 'swaps-pill-closed' },
};

const extractImage = (item) => {
  const first = item?.images?.[0];
  if (!first) return null;
  return typeof first === 'string' ? first : first.url || null;
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatExpiryCountdown = (expiresAt) => {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(diffMs)) return null;
  if (diffMs <= 0) return 'Expiring soon';
  const totalHours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h left to reply`;
  const mins = Math.max(1, Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000)));
  return hours > 0 ? `${hours}h ${mins}m left to reply` : `${mins}m left to reply`;
};

const readStoredUserId = () => {
  const parsed = getStoredUser();
  return parsed?._id || parsed?.id || null;
};

const SwapsPage = () => {
  const [activeTab, setActiveTab] = useState('sent');
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUserId = useMemo(() => readStoredUserId(), []);

  const loadSwaps = useCallback(async (direction) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/swaps', {
        params: { direction, limit: 25 },
      });
      const raw = res.data?.data?.swaps || [];
      const list = Array.isArray(raw) ? [...raw] : [];
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSwaps(list);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to load your swaps right now. Please try again.'
      );
      setSwaps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSwaps(activeTab);
  }, [activeTab, loadSwaps]);

  return (
    <div className="swaps-list-page">
      <div className="shell-inner">
        <nav aria-label="Breadcrumb" className="swaps-list-breadcrumb">
          <Link to="/" className="swaps-list-breadcrumb-link">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span>Swaps</span>
        </nav>

        <header className="swaps-list-header">
          <div>
            <h1 className="swaps-list-title">Your swaps</h1>
            <p className="swaps-list-subtitle">
              Track swap proposals you sent and incoming requests on garments from your rack.
            </p>
          </div>
          <Link to="/items" className="swaps-list-cta">
            Browse catalogue
          </Link>
        </header>

        <div className="swaps-tabs" role="tablist" aria-label="Filter swaps by direction">
          <button
            type="button"
            role="tab"
            id="tab-sent"
            aria-selected={activeTab === 'sent'}
            className={`swaps-tab${activeTab === 'sent' ? ' swaps-tab-active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent
          </button>
          <button
            type="button"
            role="tab"
            id="tab-received"
            aria-selected={activeTab === 'received'}
            className={`swaps-tab${activeTab === 'received' ? ' swaps-tab-active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Received
          </button>
        </div>

        <div role="tabpanel" aria-labelledby={activeTab === 'sent' ? 'tab-sent' : 'tab-received'}>
          {loading ? (
            <div className="swaps-list-state" aria-busy="true">
              <p className="swaps-list-eyebrow">LOADING EXCHANGE LEDGER</p>
              <p className="swaps-list-state-copy">Fetching your {activeTab} requests…</p>
            </div>
          ) : error ? (
            <div className="swaps-list-state swaps-list-error" role="alert">
              <p className="swaps-list-eyebrow">COULD NOT LOAD SWAPS</p>
              <p className="swaps-list-state-copy">{error}</p>
              <button
                type="button"
                className="swaps-list-retry-btn"
                onClick={() => loadSwaps(activeTab)}
              >
                Try again
              </button>
            </div>
          ) : swaps.length === 0 ? (
            <div className="swaps-list-state">
              <p className="swaps-list-eyebrow">NO RECORDS YET</p>
              <h2 className="swaps-list-empty-title">
                {activeTab === 'sent'
                  ? 'No sent requests yet.'
                  : 'No received requests yet.'}
              </h2>
              <p className="swaps-list-state-copy">
                {activeTab === 'sent'
                  ? 'Browse community listings to propose a swap or redeem with points.'
                  : 'List clean garments on your rack so members can propose swaps with you.'}
              </p>
              <Link
                to={activeTab === 'sent' ? '/items' : '/add-item'}
                className="swaps-list-cta"
              >
                {activeTab === 'sent' ? 'Browse catalogue' : 'List an item'}
              </Link>
            </div>
          ) : (
            <ul className="swaps-list-grid">
              {swaps.map((entry) => {
                const statusInfo = STATUS_META[entry.status] || {
                  label: entry.status || 'Unknown',
                  className: 'swaps-pill-closed',
                };
                const requester = entry.requesterId;
                const owner = entry.itemOwnerId;
                const viewerIsOwner =
                  activeTab === 'received' ||
                  (currentUserId && String(owner?._id || owner) === String(currentUserId));
                const partner = viewerIsOwner ? requester : owner;
                const partnerHandle = partner?.username ? `@${partner.username}` : 'member';
                const wantedTitle = entry.itemId?.title || 'Listed garment';
                const offeredTitle = entry.requestedItemId?.title || null;
                const wantedPhoto = extractImage(entry.itemId);
                const pointsAmount = entry.pointsOffered || 0;
                const expiryLabel =
                  entry.status === 'pending' ? formatExpiryCountdown(entry.expiresAt) : null;

                return (
                  <li key={entry._id} className="swaps-row-card">
                    <Link to={`/swaps/${entry._id}`} className="swaps-row-link">
                      <div className="swaps-row-thumb">
                        {wantedPhoto ? (
                          <img src={wantedPhoto} alt="" className="swaps-row-img" />
                        ) : (
                          <div className="swaps-row-placeholder">
                            <span>{(entry.itemId?.category || 'SWAP').toUpperCase()}</span>
                          </div>
                        )}
                      </div>

                      <div className="swaps-row-main">
                        <div className="swaps-row-top">
                          <span className={`swaps-pill ${statusInfo.className}`}>
                            <span aria-hidden="true">●</span>
                            <span>{statusInfo.label}</span>
                          </span>
                          <span className="swaps-row-date">
                            {formatDateShort(entry.createdAt)}
                          </span>
                        </div>

                        <h2 className="swaps-row-title">{wantedTitle}</h2>

                        <p className="swaps-row-meta">
                          {entry.type === 'redeem' ? (
                            <>
                              Redeem with points ({pointsAmount} PTS) &bull; With {partnerHandle}
                            </>
                          ) : (
                            <>
                              {viewerIsOwner ? `Offered in return: ` : `Your offer: `}
                              <strong>{offeredTitle || 'Your garment'}</strong>
                              {pointsAmount > 0 ? ` + ${pointsAmount} PTS` : ''} &bull; With{' '}
                              {partnerHandle}
                            </>
                          )}
                        </p>

                        {expiryLabel && <p className="swaps-row-expiry">{expiryLabel}</p>}
                      </div>

                      <div className="swaps-row-action" aria-hidden="true">
                        <span>View details &rsaquo;</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapsPage;
