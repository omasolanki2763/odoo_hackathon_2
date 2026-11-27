/**
 * Shared display rules for points ledger rows (labels, signs, filter tabs).
 */

// How each ledger type reads to a member and which way it moves the balance.
// "hold" is shown apart from spending: those points come back if a request is
// declined, cancelled or expires.
export const TYPE_DETAILS = {
  bonus: { label: 'Bonus', direction: 'credit' },
  earned: { label: 'Earned', direction: 'credit' },
  received: { label: 'Received', direction: 'credit' },
  refund: { label: 'Refund', direction: 'credit' },
  spent: { label: 'Spent', direction: 'debit' },
  sent: { label: 'Sent', direction: 'debit' },
  penalty: { label: 'Penalty', direction: 'debit' },
  hold: { label: 'Held', direction: 'hold' }
};

// Filter tabs and the ledger types each one asks the server for.
export const FILTERS = [
  { id: 'all', label: 'All', types: [] },
  { id: 'earned', label: 'Earned', types: ['bonus', 'earned', 'received', 'refund'] },
  { id: 'spent', label: 'Spent', types: ['spent', 'sent', 'penalty'] },
  { id: 'held', label: 'Held', types: ['hold'] }
];

/**
 * Formats a ledger amount with its sign: "+ 75" for credits, "- 50" for debits
 * and "- 15" for holds (taken from the balance until the request settles).
 *
 * @param {string} type ledger type, e.g. "bonus" or "hold"
 * @param {number} amount the positive amount stored on the row
 * @returns {{text: string, direction: string}} display text and colour group
 */
export const formatSignedAmount = (type, amount) => {
  const direction = TYPE_DETAILS[type]?.direction || 'credit';
  const sign = direction === 'credit' ? '+' : '-';
  return { text: `${sign} ${Math.abs(Number(amount) || 0)}`, direction };
};

