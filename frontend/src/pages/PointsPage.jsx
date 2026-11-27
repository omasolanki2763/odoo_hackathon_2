import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { FILTERS, TYPE_DETAILS, formatSignedAmount } from '../utils/pointsDisplay';
import '../styles/PointsPage.css';

const PAGE_SIZE = 20;

/**
 * Formats a date as "14 Nov 2026" in the member's locale.
 * @param {string} value ISO date string
 * @returns {string} short readable date, or an empty string when missing
 */
const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * /points - the signed-in member's points ledger: balance, lifetime earned and
 * spent, points held by open requests, and every transaction with its reason.
 */
const PointsPage = () => {
  const [filterId, setFilterId] = useState('all');
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Loads one page of the ledger for the current filter.
   * @param {number} page page number to fetch
   * @param {boolean} shouldAppend true to add to the list (Load more), false to replace it
   */
  const loadPage = useCallback(async (page, shouldAppend) => {
    const filter = FILTERS.find((option) => option.id === filterId) || FILTERS[0];
    const params = { page, limit: PAGE_SIZE };
    if (filter.types.length > 0) {
      params.type = filter.types.join(',');
    }

    if (shouldAppend) setIsLoadingMore(true);
    else setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await api.get('/users/me/points', { params });
      const data = res.data?.data || {};
      setEntries((previous) => (shouldAppend ? [...previous, ...(data.entries || [])] : data.entries || []));
      setTotals(data.totals || null);
      setPagination(res.data?.pagination || null);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'We could not load your points history. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filterId]);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const handleLoadMore = () => {
    if (pagination?.nextPage) {
      loadPage(pagination.nextPage, true);
    }
  };

  const activeFilter = FILTERS.find((option) => option.id === filterId) || FILTERS[0];

  return (
    <div className="points-page">
      <nav className="points-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="points-breadcrumb-link">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/dashboard" className="points-breadcrumb-link">Dashboard</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Points history</span>
      </nav>

      <header className="points-header">
        <h1 className="points-title">Points history</h1>
        <p className="points-subtitle">Every point you earned or spent, and why.</p>
      </header>

      <section className="points-summary" aria-label="Points summary">
        <div className="points-summary-card">
          <p className="points-eyebrow">Balance</p>
          <p className="points-summary-value font-number">{totals ? totals.balance : '-'}</p>
        </div>
        <div className="points-summary-card">
          <p className="points-eyebrow">Earned</p>
          <p className="points-summary-value points-credit font-number">
            {totals ? `+ ${totals.earned}` : '-'}
          </p>
        </div>
        <div className="points-summary-card">
          <p className="points-eyebrow">Spent</p>
          <p className="points-summary-value points-debit font-number">
            {totals ? `- ${totals.spent}` : '-'}
          </p>
        </div>
        <div className="points-summary-card">
          <p className="points-eyebrow">Held now</p>
          <p className="points-summary-value points-hold font-number">{totals ? totals.heldNow : '-'}</p>
          <p className="points-summary-note">Comes back if a request is declined, cancelled or expires.</p>
        </div>
      </section>

      <div className="points-filters" role="group" aria-label="Filter transactions">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`points-filter${option.id === filterId ? ' is-active' : ''}`}
            aria-pressed={option.id === filterId}
            onClick={() => setFilterId(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="points-error" role="alert">
          <p>{errorMessage}</p>
          <button type="button" className="points-filter" onClick={() => loadPage(1, false)}>Try again</button>
        </div>
      )}

      <section className="points-ledger" aria-label="Transactions" aria-busy={isLoading}>
        {isLoading && <p className="points-status" role="status">Loading your points history...</p>}

        {!isLoading && !errorMessage && entries.length === 0 && (
          <div className="points-empty">
            <p className="points-empty-title">
              {activeFilter.id === 'all' ? 'No points activity yet.' : `No ${activeFilter.label.toLowerCase()} transactions yet.`}
            </p>
            <p className="points-empty-text">
              Points appear here when you get your welcome points, list an item, swap or redeem.
            </p>
            <Link to="/items" className="points-empty-link">Browse the catalogue</Link>
          </div>
        )}

        {!isLoading && entries.length > 0 && (
          <table className="points-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">What happened</th>
                <th scope="col">Item</th>
                <th scope="col" className="points-col-number">Change</th>
                <th scope="col" className="points-col-number">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const signed = formatSignedAmount(entry.type, entry.amount);
                return (
                  <tr key={entry.id}>
                    <td data-label="Date" className="points-date font-number">{formatDate(entry.createdAt)}</td>
                    <td data-label="What happened">
                      <span className={`points-badge points-badge-${signed.direction}`}>
                        {TYPE_DETAILS[entry.type]?.label || entry.type}
                      </span>
                      <span className="points-description">{entry.description}</span>
                      {entry.relatedSwap && (
                        <Link to={`/swaps/${entry.relatedSwap.id}`} className="points-swap-link">View swap</Link>
                      )}
                    </td>
                    <td data-label="Item" className="points-item">
                      {entry.relatedItem ? entry.relatedItem.title : '-'}
                    </td>
                    <td data-label="Change" className={`points-col-number points-${signed.direction} font-number`}>
                      {signed.text}
                    </td>
                    <td data-label="Balance" className="points-col-number font-number">
                      {typeof entry.balance === 'number' ? entry.balance : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!isLoading && pagination?.hasNextPage && (
          <div className="points-more">
            <button type="button" className="points-more-button" onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default PointsPage;
