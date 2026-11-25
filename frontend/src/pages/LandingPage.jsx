import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/LandingPage.css';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Categories' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'tops', label: 'Tops' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'dresses', label: 'Dresses' },
  { id: 'accessories', label: 'Accessories' },
];

const formatCondition = (condition) => {
  if (!condition) return 'Good';
  return condition
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getItemImageUrl = (item) => {
  if (!item?.images || item.images.length === 0) return null;
  const primary = item.images.find((img) => img && img.isPrimary && img.url);
  if (primary?.url) return primary.url;
  const first = item.images[0];
  if (typeof first === 'string') return first;
  return first?.url || null;
};

const GarmentImage = ({ item, frameClassName }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const src = getItemImageUrl(item);

  return (
    <div className={`landing-photo-frame ${frameClassName}`}>
      {src && !imgFailed ? (
        <img
          src={src}
          alt={item.title || 'Community garment listing'}
          className="landing-photo-img"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="landing-photo-placeholder">
          <span className="landing-photo-placeholder-tag">
            {(item?.category || 'garment').toUpperCase()}
          </span>
          <span className="landing-photo-placeholder-text">
            Daylight photo pending
          </span>
        </div>
      )}
    </div>
  );
};

const LandingPage = () => {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchFeaturedItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/items/featured');
      setFeaturedItems(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Error fetching featured items:', err);
      setError('Unable to load garments in circulation right now.');
      setFeaturedItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedItems();
  }, [fetchFeaturedItems]);

  const heroItem = featuredItems[0] || null;
  const poolItems = featuredItems.length > 1 ? featuredItems.slice(1) : featuredItems;
  const filteredItems =
    activeCategory === 'all'
      ? poolItems
      : featuredItems.filter((item) => item.category === activeCategory);

  const primaryCards = filteredItems.slice(0, 2);
  const compactCards = filteredItems.slice(2, 4);

  return (
    <div className="landing-page">
      {/* Section 1: Editorial Hero */}
      <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="landing-container">
          <div className="landing-hero-grid">
            <div>
              <span className="landing-eyebrow">
                ISSUE NO. 04 &bull; COMMUNITY CIRCULATION
              </span>
              <h1 id="hero-heading" className="landing-hero-title">
                Swap the jacket you never wear for one you will.
              </h1>
              <p className="landing-hero-copy">
                Garments are made to be worn, aged with dignity, and passed forward. ReWear
                connects thoughtful wardrobes in a closed, cash-free circle. Trade directly
                item-for-item with members, or redeem curated pieces with points earned from
                your own closet.
              </p>

              <div className="landing-hero-actions">
                <Link to="/items" className="landing-btn landing-btn-ink">
                  Explore Catalogue &rarr;
                </Link>
                <a href="#how-it-works" className="landing-btn landing-btn-outline">
                  How It Works
                </a>
              </div>

              <div className="landing-principles">
                <ul className="landing-principles-list">
                  <li className="landing-principles-item">
                    <span className="landing-principles-key">&bull; ZERO CASH:</span>{' '}
                    Trade directly 1-for-1 or claim pieces using earned community points.
                  </li>
                  <li className="landing-principles-item">
                    <span className="landing-principles-key">&bull; VERIFIED SPECS:</span>{' '}
                    Every piece lists size, daylight photos, and honest condition notes.
                  </li>
                  <li className="landing-principles-item">
                    <span className="landing-principles-key">&bull; PROTECTED EXCHANGE:</span>{' '}
                    Points stay held until swap confirmation completes.
                  </li>
                </ul>
              </div>
            </div>

            <div>
              {loading ? (
                <div className="landing-plate-card" aria-busy="true">
                  <div className="landing-skeleton-box" />
                </div>
              ) : heroItem ? (
                <article className="landing-plate-card">
                  <GarmentImage item={heroItem} frameClassName="landing-photo-frame-hero" />
                  <p className="landing-plate-meta">
                    PLATE NO. 01 &bull; {(heroItem.category || 'garment').toUpperCase()}
                  </p>
                  <h2 className="landing-plate-title">
                    <Link
                      to={`/items/${heroItem._id}`}
                      className="landing-plate-title-link"
                    >
                      {heroItem.title}
                    </Link>
                  </h2>
                  <p className="landing-plate-details">
                    Size {heroItem.size || 'One Size'} &bull;{' '}
                    {formatCondition(heroItem.condition)} condition
                    {heroItem.userId?.username ? ` • Listed by @${heroItem.userId.username}` : ''}
                  </p>
                  <div className="landing-plate-footer">
                    <span className="landing-plate-points">
                      {heroItem.pointsValue} PTS
                    </span>
                    <Link
                      to={`/items/${heroItem._id}`}
                      className="landing-btn landing-btn-ink"
                    >
                      Inspect &amp; Swap Piece
                    </Link>
                  </div>
                </article>
              ) : (
                <div className="landing-empty-card">
                  <span className="landing-eyebrow">PLATE NO. 01 &bull; OPEN RACK</span>
                  <h2 className="landing-empty-title">Circulation starts with your closet.</h2>
                  <p className="landing-empty-copy">
                    {error
                      ? 'Could not reach the garment catalogue right now.'
                      : 'No garments are currently listed in active circulation.'}
                  </p>
                  <Link to="/add-item" className="landing-btn landing-btn-clay">
                    + List an Item
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Method of Circulation */}
      <section
        id="how-it-works"
        className="landing-method"
        aria-labelledby="method-heading"
      >
        <div className="landing-container">
          <span className="landing-method-eyebrow">AN HONEST APPROACH</span>
          <h2 id="method-heading" className="landing-method-title">
            The Method of Circulation
          </h2>
          <p className="landing-method-subtitle">
            Three straightforward phases to circulate garments with zero money.
          </p>

          <div className="landing-method-grid">
            <article className="landing-method-card">
              <span className="landing-method-step">01 / DOCUMENTATION</span>
              <h3 className="landing-method-card-title">Honest Documentation</h3>
              <p className="landing-method-card-copy">
                Photograph your garment in daylight without artificial filters. Record sizing,
                fabric details, and authentic wear characteristics so receivers know exactly
                what arrives.
              </p>
            </article>

            <article className="landing-method-card">
              <span className="landing-method-step">02 / THE MATCH</span>
              <h3 className="landing-method-card-title">Item-for-Item or Points</h3>
              <p className="landing-method-card-copy">
                Propose a direct 1-for-1 trade if you discover a piece you admire in another
                wardrobe. Alternatively, list pieces for point claims and spend points across
                the collective.
              </p>
            </article>

            <article className="landing-method-card">
              <span className="landing-method-step">03 / SETTLEMENT</span>
              <h3 className="landing-method-card-title">Careful Handoff</h3>
              <p className="landing-method-card-copy">
                Clean, fold, and hand off or dispatch cleanly. Community points transfer upon
                acceptance and confirmation between both members.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Section 3: Autumn Lookbook (Curated Selections from Real API Data) */}
      <section className="landing-lookbook" aria-labelledby="lookbook-heading">
        <div className="landing-container">
          <div className="landing-lookbook-header">
            <div>
              <span className="landing-eyebrow">CURATED SELECTIONS</span>
              <h2 id="lookbook-heading" className="landing-section-title">
                The Autumn Lookbook
              </h2>
            </div>
            <Link to="/items" className="landing-archive-link">
              View Full Catalogue &rarr;
            </Link>
          </div>

          <div className="landing-category-tabs" role="tablist" aria-label="Filter lookbook by category">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === tab.id}
                className={`landing-cat-tab${activeCategory === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveCategory(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="landing-alert-error" role="alert">
              <span>{error}</span>
              <button
                type="button"
                className="landing-btn landing-btn-outline"
                onClick={fetchFeaturedItems}
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="landing-lookbook-grid" aria-busy="true">
              <div className="landing-skeleton-box" />
              <div className="landing-skeleton-box" />
              <div className="landing-skeleton-box" />
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="landing-lookbook-grid">
              {primaryCards.map((item, idx) => (
                <article key={item._id} className="landing-lookbook-feature">
                  <GarmentImage item={item} frameClassName="landing-photo-frame-tall" />
                  <div className="landing-lookbook-card-body">
                    <p className="landing-plate-meta">
                      PLATE NO. 0{idx + 2} &bull; {(item.category || 'garment').toUpperCase()}
                    </p>
                    <h3 className="landing-lookbook-card-title">
                      <Link
                        to={`/items/${item._id}`}
                        className="landing-plate-title-link"
                      >
                        {item.title}
                      </Link>
                    </h3>
                    <p className="landing-lookbook-card-meta">
                      Size {item.size || 'One Size'} &bull; {formatCondition(item.condition)}
                      {item.userId?.username ? ` • @${item.userId.username}` : ''}
                    </p>
                    <div className="landing-lookbook-card-cta">
                      <Link
                        to={`/items/${item._id}`}
                        className={`landing-btn ${
                          idx === 0 ? 'landing-btn-ink' : 'landing-btn-pine'
                        }`}
                      >
                        Swap for <span className="font-number">{item.pointsValue}</span> Pts
                      </Link>
                    </div>
                  </div>
                </article>
              ))}

              {compactCards.length > 0 && (
                <div className="landing-lookbook-side-stack">
                  {compactCards.map((item, idx) => (
                    <article key={item._id} className="landing-lookbook-compact">
                      <GarmentImage
                        item={item}
                        frameClassName="landing-photo-frame-compact"
                      />
                      <div className="landing-lookbook-card-body">
                        <p className="landing-plate-meta">
                          PLATE NO. 0{idx + 4} &bull;{' '}
                          {(item.category || 'garment').toUpperCase()}
                        </p>
                        <h3 className="landing-lookbook-card-title">
                          <Link
                            to={`/items/${item._id}`}
                            className="landing-plate-title-link"
                          >
                            {item.title}
                          </Link>
                        </h3>
                        <p className="landing-lookbook-card-meta">
                          Size {item.size || 'One Size'} &bull;{' '}
                          {formatCondition(item.condition)}
                          {item.userId?.username ? ` • @${item.userId.username}` : ''}
                        </p>
                        <div className="landing-lookbook-card-cta">
                          <Link
                            to={`/items/${item._id}`}
                            className="landing-btn landing-btn-pine"
                          >
                            Claim: <span className="font-number">{item.pointsValue}</span> Pts
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="landing-empty-card">
              <h3 className="landing-empty-title">
                {activeCategory === 'all'
                  ? 'No garments listed yet'
                  : `No featured ${activeCategory} pieces right now`}
              </h3>
              <p className="landing-empty-copy">
                {activeCategory === 'all'
                  ? 'Be the first community member to list an item for circulation.'
                  : 'Try another category tab or explore the complete community archive.'}
              </p>
              {activeCategory !== 'all' ? (
                <button
                  type="button"
                  className="landing-btn landing-btn-ink"
                  onClick={() => setActiveCategory('all')}
                >
                  Show All Categories
                </button>
              ) : (
                <Link to="/add-item" className="landing-btn landing-btn-clay">
                  + List an Item
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Circular Exchange Flow */}
      <section className="landing-flow-section" aria-labelledby="flow-heading">
        <div className="landing-container">
          <div className="landing-flow-panel">
            <span className="landing-eyebrow">CIRCULAR EXCHANGE IN PRACTICE</span>
            <h2 id="flow-heading" className="landing-section-title">
              How Points Circulate
            </h2>
            <p className="landing-flow-subtitle">
              Garments move from closet to closet without currency.
            </p>

            <div className="landing-flow-grid">
              <div className="landing-flow-step">
                <h3 className="landing-flow-step-title">1. List a Garment</h3>
                <p className="landing-flow-step-copy">
                  Share an unworn jacket, knit, or shirt from your wardrobe with honest notes.
                  Approved pieces carry a point value set from category and condition.
                </p>
                <p className="landing-flow-step-note">EARN POINTS ON COMPLETION</p>
              </div>

              <div className="landing-flow-step">
                <h3 className="landing-flow-step-title">2. Request a Piece</h3>
                <p className="landing-flow-step-copy">
                  Use your accumulated points balance to redeem a piece you need, or propose a
                  direct 1-for-1 garment trade with another member.
                </p>
                <p className="landing-flow-step-note">DIRECT SWAP OR POINTS CLAIM</p>
              </div>

              <div className="landing-flow-step">
                <h3 className="landing-flow-step-title">3. Pass It Forward</h3>
                <p className="landing-flow-step-copy">
                  When a swap closes, points move directly to the listing member so they can
                  claim from the next closet in the collective.
                </p>
                <p className="landing-flow-step-note">ZERO COMMISSIONS &bull; ZERO FEES</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
