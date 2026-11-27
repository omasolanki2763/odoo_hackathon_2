import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ');

const RedeemModal = ({
  isOpen,
  item,
  ownerUsername,
  quote,
  quoteLoading,
  quoteError,
  submitError,
  submitting,
  onClose,
  onConfirm,
  triggerRef,
}) => {
  const dialogRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      if (cancelBtnRef.current) {
        cancelBtnRef.current.focus();
      } else if (dialogRef.current) {
        dialogRef.current.focus();
      }
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      if (triggerRef?.current && !triggerRef.current.disabled) {
        triggerRef.current.focus();
      }
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!submitting) {
          event.preventDefault();
          onClose();
        }
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusables = Array.from(
        dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, submitting]);

  if (!isOpen || !item) {
    return null;
  }

  const cost =
    typeof quote?.cost === 'number'
      ? quote.cost
      : typeof item.pointsValue === 'number'
      ? item.pointsValue
      : null;
  const missingPrice = cost === null;
  const balanceBefore = typeof quote?.balanceBefore === 'number' ? quote.balanceBefore : null;
  const balanceAfter =
    typeof quote?.balanceAfter === 'number'
      ? quote.balanceAfter
      : balanceBefore !== null && cost !== null
      ? balanceBefore - cost
      : null;
  const insufficientBalance = Boolean(!quoteLoading && quote && !quote.canAfford);
  const shortfall = balanceBefore !== null && cost !== null ? Math.max(0, cost - balanceBefore) : 0;
  const firstImage =
    item.images?.[0]?.url || (typeof item.images?.[0] === 'string' ? item.images[0] : null);
  const errorText = submitError || quoteError;
  const confirmDisabled =
    quoteLoading || submitting || missingPrice || !quote || !quote.canAfford || Boolean(quoteError);

  return createPortal(
    <div
      className="detail-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="detail-modal redeem-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="redeem-modal-title"
        aria-describedby="redeem-modal-summary"
        tabIndex={-1}
      >
        <p className="detail-eyebrow">REDEEM WITH POINTS</p>

        <div className="redeem-modal-item">
          <div className="redeem-modal-thumb">
            {firstImage ? (
              <img src={firstImage} alt={item.title} className="detail-hero-img" />
            ) : (
              <div className="detail-placeholder">
                <span className="detail-placeholder-tag">
                  {(item.category || 'garment').toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="redeem-modal-item-meta">
            <h2 id="redeem-modal-title" className="redeem-modal-title">
              {item.title}
            </h2>
            <p className="redeem-modal-sub">
              {ownerUsername ? `@${ownerUsername}` : 'Community Member'} &bull; Size{' '}
              {item.size || 'One Size'}
            </p>
          </div>
        </div>

        <div id="redeem-modal-summary" className="redeem-ledger">
          {quoteLoading ? (
            <p className="redeem-ledger-loading">Checking your points balance…</p>
          ) : (
            <>
              <div className="redeem-ledger-row">
                <span className="redeem-ledger-label">Your balance</span>
                <span className="redeem-ledger-value font-number">
                  {balanceBefore !== null ? balanceBefore : '—'}
                </span>
              </div>
              <div className="redeem-ledger-row">
                <span className="redeem-ledger-label">This item</span>
                <span className="redeem-ledger-value redeem-ledger-cost font-number">
                  {cost !== null ? `- ${cost}` : '—'}
                </span>
              </div>
              <div className="redeem-ledger-row redeem-ledger-row-total">
                <span className="redeem-ledger-label">Balance after</span>
                <span
                  className={`redeem-ledger-value font-number${
                    balanceAfter !== null && balanceAfter < 0 ? ' redeem-ledger-shortfall' : ''
                  }`}
                >
                  {balanceAfter !== null ? balanceAfter : '—'}
                </span>
              </div>
            </>
          )}
        </div>

        {quoteLoading ? null : errorText ? (
          <p className="redeem-modal-alert" role="alert">
            {errorText}
          </p>
        ) : missingPrice ? (
          <p className="redeem-modal-alert" role="alert">
            Points value is not available for this garment yet.
          </p>
        ) : insufficientBalance ? (
          <p className="redeem-modal-alert" role="alert">
            Balance too low: you need {shortfall} more points to redeem this piece.
          </p>
        ) : (
          <p className="redeem-modal-note">
            Confirming debits {cost} points immediately and reserves the garment for your collection.
          </p>
        )}

        <div className="detail-modal-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="detail-btn detail-btn-secondary"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="detail-btn detail-btn-primary"
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {submitting
              ? 'Completing…'
              : cost !== null
              ? `Redeem for ${cost} points`
              : 'Redemption unavailable'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RedeemModal;
