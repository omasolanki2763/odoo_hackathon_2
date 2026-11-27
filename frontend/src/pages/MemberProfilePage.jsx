import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import BrowseGarmentCard from '../components/BrowseGarmentCard';
import '../styles/ItemsPage.css';
import '../styles/MemberProfilePage.css';

const MATCH_BADGES = {
  yes: { label: 'Matched listing', className: 'member-badge-yes' },
  small_differences: { label: 'Small differences', className: 'member-badge-diff' },
  no: { label: 'Not as described', className: 'member-badge-no' },
};

const getInitials = (profile) => {
  if (!profile) return 'RW';
  if (profile.firstName && profile.lastName) {
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  }
  return (profile.username || 'RW').slice(0, 2).toUpperCase();
};

const formatMemberSince = (dateStr) => {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const formatReviewDate = (dateStr) => {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const renderStarGlyphs = (count) => {
  const filled = Math.max(0, Math.min(5, Math.round(Number(count) || 0)));
  return (
    <span className="member-stars" aria-hidden="true">
      {'★'.repeat(filled)}
      {'☆'.repeat(5 - filled)}
    </span>
  );
};

const MemberProfilePage = () => {
  const { username } = useParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setError('');
    try {
      const res = await api.get(`/users/${encodeURIComponent(username)}/public`);
      setProfile(res.data?.data || null);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 400) {
        setNotFound(true);
      } else {
        setError(err.response?.data?.message || 'Unable to load this member profile right now.');
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="member-page">
        <div className="shell-inner">
          <div className="member-card member-loading-box" aria-busy="true" aria-label="Loading member profile">
            <p className="member-muted">Loading member rack and trust record…</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="member-page">
        <div className="shell-inner">
          <nav aria-label="Breadcrumb" className="member-breadcrumb">
            <Link to="/" className="member-breadcrumb-link">Home</Link>
            <span aria-hidden="true">/</span>
            <Link to="/items" className="member-breadcrumb-link">Catalogue</Link>
            <span aria-hidden="true">/</span>
            <span>@{username}</span>
          </nav>

          <section className="member-card member-state-panel" role={error ? 'alert' : 'status'}>
            <p className="member-eyebrow">{error ? 'PROFILE UNAVAILABLE' : 'MEMBER NOT FOUND'}</p>
            <h1 className="member-state-title">
              {error ? 'Could not load this member rack.' : `No active member "@${username}" found.`}
            </h1>
            <p className="member-state-copy">
              {error || 'This account may not exist, may have changed username, or is no longer active in circulation.'}
            </p>
            <div className="member-state-actions">
              {error && (
                <button type="button" className="member-btn member-btn-primary" onClick={fetchProfile}>
                  Try again
                </button>
              )}
              <Link to="/items" className="member-btn member-btn-primary">
                Browse Catalogue
              </Link>
              <Link to="/" className="member-btn member-btn-secondary">
                Back home
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const trust = profile.trust || { averageStars: 0, ratingCount: 0, matchedCount: 0 };
  const hasRatings = Number(trust.ratingCount) > 0;
  const matchedPct = hasRatings
    ? Math.round((Number(trust.matchedCount || 0) / Number(trust.ratingCount)) * 100)
    : 0;
  const memberSince = formatMemberSince(profile.memberSince);
  const listings = Array.isArray(profile.listings) ? profile.listings : [];
  const ratings = Array.isArray(profile.ratings) ? profile.ratings : [];
  const listedCount = typeof profile.stats?.listed === 'number' ? profile.stats.listed : listings.length;
  const swapsDone = typeof profile.stats?.swapsDone === 'number' ? profile.stats.swapsDone : 0;
  const redeemedCount = typeof profile.stats?.redeemed === 'number' ? profile.stats.redeemed : 0;

  return (
    <div className="member-page">
      <div className="shell-inner">
        <nav aria-label="Breadcrumb" className="member-breadcrumb">
          <Link to="/" className="member-breadcrumb-link">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/items" className="member-breadcrumb-link">Catalogue</Link>
          <span aria-hidden="true">/</span>
          <span>@{profile.username}</span>
        </nav>

        {/* Hero Profile & Trust Card */}
        <section className="member-card member-hero" aria-label="Member profile">
          <div className="member-hero-left">
            <div className="member-avatar" aria-hidden="true">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="member-avatar-img" />
              ) : (
                <span>{getInitials(profile)}</span>
              )}
            </div>
            <div className="member-identity">
              <h1 className="member-handle">@{profile.username}</h1>
              <p className="member-meta">
                {[
                  profile.city || null,
                  memberSince ? `member since ${memberSince}` : null,
                ]
                  .filter(Boolean)
                  .join(' • ') || 'ReWear community member'}
              </p>
              {profile.bio && <p className="member-bio">{profile.bio}</p>}
              <div className="member-actions">
                <Link to="/items" className="member-btn member-btn-primary">
                  Browse catalogue
                </Link>
              </div>
            </div>
          </div>

          <aside className="member-trust-box" aria-label="Trust summary">
            <p className="member-eyebrow">TRUST RATING</p>
            {hasRatings ? (
              <>
                <div className="member-trust-score-row">
                  <span className="member-trust-score font-number">
                    {Number(trust.averageStars).toFixed(1)}
                  </span>
                  <div>
                    {renderStarGlyphs(trust.averageStars)}
                    <p className="member-trust-count">
                      from {trust.ratingCount} {trust.ratingCount === 1 ? 'rating' : 'ratings'}
                    </p>
                  </div>
                </div>

                <div className="member-honesty">
                  <p className="member-eyebrow">HONEST CONDITION</p>
                  <div className="member-honesty-bar" aria-hidden="true">
                    <span
                      className="member-honesty-fill"
                      style={{ width: `${Math.max(4, matchedPct)}%` }}
                    />
                  </div>
                  <div className="member-honesty-foot">
                    <span>
                      {trust.matchedCount} of {trust.ratingCount} swaps matched their listing
                    </span>
                    <span className="font-number">{matchedPct}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="member-no-ratings">
                <p className="member-no-ratings-title">No ratings yet</p>
                <p className="member-no-ratings-copy">
                  Trust scores appear once this member completes swaps and ratings reveal.
                </p>
              </div>
            )}
          </aside>
        </section>

        {/* Member Activity Metrics */}
        <section className="member-stats-grid" aria-label="Member wardrobe totals">
          <div className="member-stat-card">
            <p className="member-eyebrow">LISTED</p>
            <p className="member-stat-num font-number">{listedCount}</p>
          </div>
          <div className="member-stat-card">
            <p className="member-eyebrow">SWAPS DONE</p>
            <p className="member-stat-num font-number">{swapsDone}</p>
          </div>
          <div className="member-stat-card">
            <p className="member-eyebrow">REDEEMED</p>
            <p className="member-stat-num font-number">{redeemedCount}</p>
          </div>
        </section>

        {/* Active Listings */}
        <section className="member-section" aria-labelledby="member-rack-heading">
          <div className="member-section-head">
            <h2 id="member-rack-heading" className="member-section-title">
              On the rack
            </h2>
            <Link to="/items" className="member-inline-link">
              All {listedCount} {listedCount === 1 ? 'listing' : 'listings'} &rsaquo;
            </Link>
          </div>

          {listings.length > 0 ? (
            <div className="browse-grid">
              {listings.map((item) => (
                <BrowseGarmentCard key={item._id} item={item} />
              ))}
            </div>
          ) : (
            <div className="member-card member-empty-panel">
              <p className="member-muted">
                @{profile.username} has no active pieces available in circulation right now.
              </p>
            </div>
          )}
        </section>

        {/* Visible Member Ratings */}
        <section className="member-section" aria-labelledby="member-reviews-heading">
          <div className="member-section-head">
            <h2 id="member-reviews-heading" className="member-section-title">
              What other members said
            </h2>
          </div>

          {ratings.length > 0 ? (
            <div className="member-reviews-grid">
              {ratings.map((rev) => {
                const badge = MATCH_BADGES[rev.matchStatus] || MATCH_BADGES.yes;
                return (
                  <article key={rev._id} className="member-review-card">
                    <div className="member-review-top">
                      {renderStarGlyphs(rev.stars)}
                      <span className="member-review-date">{formatReviewDate(rev.createdAt)}</span>
                    </div>
                    <span className={`member-badge ${badge.className}`}>{badge.label}</span>
                    {rev.comment && <p className="member-review-quote">&ldquo;{rev.comment}&rdquo;</p>}
                    <p className="member-review-author">
                      {rev.rater?.username ? (
                        <>
                          &ndash;{' '}
                          <Link
                            to={`/members/${rev.rater.username}`}
                            className="member-inline-link"
                          >
                            @{rev.rater.username}
                          </Link>
                        </>
                      ) : (
                        '– Verified swap partner'
                      )}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="member-card member-empty-panel">
              <p className="member-muted">No ratings yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MemberProfilePage;
