import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const CONDITION_DISPLAY = {
  new: 'UNWORN / NEW',
  'like-new': 'LIKE NEW',
  good: 'GOOD CONDITION',
  fair: 'FAIR / VINTAGE PATINA',
  worn: 'WELL WORN',
};

const getItemImageUrl = (item) => {
  if (!item?.images || item.images.length === 0) return null;
  const primary = item.images.find((img) => img && img.isPrimary && img.url);
  if (primary?.url) return primary.url;
  const first = item.images[0];
  if (typeof first === 'string') return first;
  return first?.url || null;
};

const formatConditionLabel = (condition) => {
  if (!condition) return 'GOOD CONDITION';
  if (CONDITION_DISPLAY[condition]) return CONDITION_DISPLAY[condition];
  return condition.replace(/-/g, ' ').toUpperCase();
};

const truncateNote = (text, maxLen = 58) => {
  if (!text) return 'Verified measurements included';
  const cleaned = text.trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1).trim()}…`;
};

export const GarmentCardImage = ({ item }) => {
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

const BrowseGarmentCard = ({ item }) => {
  const shortCode = String(item._id || '').slice(-4).toUpperCase() || '0000';
  const specsParts = [
    `Size ${item.size || 'One Size'}`,
    item.brand || item.material || null,
  ].filter(Boolean);

  return (
    <article className="browse-card">
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
};

export default BrowseGarmentCard;
