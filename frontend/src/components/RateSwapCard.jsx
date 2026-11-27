import React, { useRef, useState } from 'react';
import api from '../api';

const MATCH_OPTIONS = [
  { value: 'yes', label: 'Yes, exactly as described' },
  { value: 'small_differences', label: 'Small differences' },
  { value: 'no', label: 'Not as described' },
];

const RateSwapCard = ({ swapId, itemTitle, partnerUsername, onSubmitted }) => {
  const [matchStatus, setMatchStatus] = useState('yes');
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [mismatchReason, setMismatchReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const starRefs = useRef([]);

  const handleStarKeyDown = (value, event) => {
    let nextValue = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextValue = value === 5 ? 1 : value + 1;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextValue = value === 1 ? 5 : value - 1;
    } else if (event.key === 'Home') {
      event.preventDefault();
      nextValue = 1;
    } else if (event.key === 'End') {
      event.preventDefault();
      nextValue = 5;
    }

    if (nextValue !== null) {
      setStars(nextValue);
      starRefs.current[nextValue - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (stars < 1 || stars > 5) {
      setError('Please choose a rating from 1 to 5 stars.');
      return;
    }

    if (matchStatus === 'no' && !mismatchReason.trim()) {
      setError('Please describe why the item did not match its listing.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/swaps/${swapId}/rate`, {
        stars,
        matchStatus,
        comment: comment.trim() || undefined,
        reason: matchStatus === 'no' ? mismatchReason.trim() : undefined,
      });
      setSubmitted(true);
      if (onSubmitted) {
        onSubmitted();
      }
    } catch (err) {
      setError(
        err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          'Could not submit your rating right now.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="swdetail-card swdetail-rate-card" aria-label="Rate this swap">
        <p className="swdetail-eyebrow">RATE THIS SWAP</p>
        <p className="swdetail-rate-thanks" role="status">
          Thanks, your rating is visible once both of you rate or after 7 days.
        </p>
      </section>
    );
  }

  return (
    <section className="swdetail-card swdetail-rate-card" aria-labelledby="rate-swap-heading">
      <p className="swdetail-eyebrow" id="rate-swap-heading">
        RATE THIS SWAP
      </p>
      <h2 className="swdetail-rate-question">
        Did {itemTitle || 'the item'} match its listing?
      </h2>

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="swdetail-banner swdetail-banner-error" role="alert">
            {error}
          </div>
        )}

        <fieldset className="swdetail-rate-fieldset">
          <legend className="sr-only">Did the item match its listing?</legend>
          <div className="swdetail-match-options">
            {MATCH_OPTIONS.map((opt) => (
              <label key={opt.value} className="swdetail-match-option">
                <input
                  type="radio"
                  name="matchStatus"
                  value={opt.value}
                  checked={matchStatus === opt.value}
                  onChange={() => {
                    setMatchStatus(opt.value);
                    setError('');
                  }}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="swdetail-stars-block">
          <span className="swdetail-eyebrow" id="star-group-label">
            YOUR RATING FOR @{partnerUsername}
          </span>
          <div className="swdetail-stars-row">
            <div
              role="radiogroup"
              aria-labelledby="star-group-label"
              className="swdetail-stars-group"
            >
              {[1, 2, 3, 4, 5].map((value, idx) => {
                const isSelected = stars === value;
                const isFilled = value <= stars;
                const isTabTarget = isSelected || (stars === 0 && value === 1);
                return (
                  <button
                    key={value}
                    ref={(el) => {
                      starRefs.current[idx] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${value} of 5`}
                    tabIndex={isTabTarget ? 0 : -1}
                    className={`swdetail-star-btn${isFilled ? ' swdetail-star-filled' : ''}`}
                    onClick={() => {
                      setStars(value);
                      setError('');
                    }}
                    onKeyDown={(e) => handleStarKeyDown(value, e)}
                  >
                    ★
                  </button>
                );
              })}
            </div>
            <span className="swdetail-stars-readout" aria-live="polite">
              {stars > 0 ? `${stars} of 5` : 'Select stars'}
            </span>
          </div>
        </div>

        {matchStatus === 'no' && (
          <div className="swdetail-mismatch-box">
            <p className="swdetail-mismatch-notice">
              Not as described opens a mismatch report: an admin reviews it, and if upheld the
              points paid for this swap come back to you.
            </p>
            <div className="swdetail-field-head">
              <label htmlFor="rate-mismatch-reason" className="swdetail-eyebrow">
                WHAT DID NOT MATCH? (REQUIRED)
              </label>
              <span className="swdetail-char-count font-number">
                {mismatchReason.length} / 1000
              </span>
            </div>
            <textarea
              id="rate-mismatch-reason"
              rows={3}
              maxLength={1000}
              required
              className="swdetail-textarea"
              placeholder="Describe the unlisted damage, stain, sizing error, or missing piece"
              value={mismatchReason}
              onChange={(e) => {
                setMismatchReason(e.target.value);
                setError('');
              }}
            />
          </div>
        )}

        <div className="swdetail-comment-block">
          <div className="swdetail-field-head">
            <label htmlFor="rate-comment-input" className="swdetail-eyebrow">
              ANYTHING TO ADD? (OPTIONAL)
            </label>
            <span className="swdetail-char-count font-number">{comment.length} / 500</span>
          </div>
          <div className="swdetail-rate-submit-row">
            <textarea
              id="rate-comment-input"
              rows={2}
              maxLength={500}
              className="swdetail-textarea"
              placeholder="Share feedback for future members"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              type="submit"
              className="swdetail-btn swdetail-btn-primary swdetail-rate-submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit rating'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

export default RateSwapCard;
