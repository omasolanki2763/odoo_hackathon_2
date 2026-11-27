import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import api from '../api';
import PointsPage from './PointsPage';
import { formatSignedAmount } from '../utils/pointsDisplay';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));

/**
 * Builds the API response shape returned by GET /api/users/me/points.
 * @param {object[]} entries ledger rows
 * @param {object} totals lifetime totals
 * @returns {{data: object}} axios-style response
 */
const ledgerResponse = (entries, totals = { balance: 145, earned: 180, spent: 15, heldNow: 50 }) => ({
  data: {
    success: true,
    data: { entries, totals },
    pagination: { currentPage: 1, hasNextPage: false, nextPage: null }
  }
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <PointsPage />
    </MemoryRouter>
  );

describe('formatSignedAmount', () => {
  it('adds a plus sign to credits and a minus sign to debits and holds', () => {
    expect(formatSignedAmount('bonus', 100)).toEqual({ text: '+ 100', direction: 'credit' });
    expect(formatSignedAmount('refund', 20)).toEqual({ text: '+ 20', direction: 'credit' });
    expect(formatSignedAmount('spent', 15)).toEqual({ text: '- 15', direction: 'debit' });
    expect(formatSignedAmount('hold', 50)).toEqual({ text: '- 50', direction: 'hold' });
  });
});

describe('PointsPage', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('shows the totals and each transaction with its signed change and swap link', async () => {
    api.get.mockResolvedValue(
      ledgerResponse([
        {
          id: 'tx2',
          type: 'received',
          amount: 60,
          balance: 160,
          description: 'Swap top-up received',
          createdAt: '2026-11-20T10:00:00.000Z',
          relatedItem: { id: 'item1', title: 'Fisherman Wool Knit' },
          relatedSwap: { id: 'swap1', status: 'accepted', type: 'swap' }
        },
        {
          id: 'tx1',
          type: 'bonus',
          amount: 100,
          balance: 100,
          description: 'Welcome points',
          createdAt: '2026-11-01T10:00:00.000Z',
          relatedItem: null,
          relatedSwap: null
        }
      ])
    );

    renderPage();

    expect(await screen.findByText('Welcome points')).toBeInTheDocument();
    expect(screen.getByText('+ 180')).toBeInTheDocument();
    expect(screen.getByText('- 15')).toBeInTheDocument();
    expect(screen.getByText('+ 60')).toBeInTheDocument();
    expect(screen.getByText('Fisherman Wool Knit')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View swap' })).toHaveAttribute('href', '/swaps/swap1');
  });

  it('shows the empty state when there is no activity', async () => {
    api.get.mockResolvedValue(ledgerResponse([], { balance: 0, earned: 0, spent: 0, heldNow: 0 }));

    renderPage();

    expect(await screen.findByText('No points activity yet.')).toBeInTheDocument();
  });

  it('asks the server for the spent types when the Spent filter is chosen', async () => {
    api.get.mockResolvedValue(ledgerResponse([]));
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('No points activity yet.');
    await user.click(screen.getByRole('button', { name: 'Spent' }));

    expect(await screen.findByText('No spent transactions yet.')).toBeInTheDocument();
    const lastCall = api.get.mock.calls.at(-1);
    expect(lastCall[0]).toBe('/users/me/points');
    expect(lastCall[1].params.type).toBe('spent,sent,penalty');
  });

  it('shows the error in an alert region when loading fails', async () => {
    api.get.mockRejectedValue({ response: { data: { message: 'Server unavailable' } } });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
  });
});
