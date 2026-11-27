import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api';
import MemberProfilePage from './MemberProfilePage';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const renderMemberProfile = (username = 'mia_rewears') =>
  render(
    <MemoryRouter initialEntries={[`/members/${username}`]}>
      <Routes>
        <Route path="/members/:username" element={<MemberProfilePage />} />
        <Route path="/items/:id" element={<div>Item Detail Route</div>} />
        <Route path="/items" element={<div>Items Route</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('MemberProfilePage (/members/:username)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trust summary, visible reviews, and active browse cards for rated members', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          username: 'mia_rewears',
          city: 'Indiranagar, Bengaluru',
          memberSince: '2025-03-01T00:00:00.000Z',
          bio: 'Mostly knits and dresses. I wash and press everything before a swap.',
          stats: { listed: 1, swapsDone: 32, redeemed: 6 },
          trust: {
            averageStars: 4.7,
            ratingCount: 32,
            matchedCount: 31,
          },
          listings: [
            {
              _id: 'item-a1',
              title: 'Fisherman Wool Knit',
              category: 'tops',
              size: 'M',
              condition: 'like-new',
              description: 'Heavy ribbed wool crewneck.',
              pointsValue: 60,
              images: [],
            },
          ],
          ratings: [
            {
              _id: 'rev-1',
              stars: 5,
              matchStatus: 'yes',
              comment: 'Knit was exactly as photographed, freshly washed.',
              createdAt: '2026-11-12T10:00:00.000Z',
              rater: { username: 'noor_vintage' },
            },
          ],
        },
      },
    });

    renderMemberProfile('mia_rewears');

    expect(await screen.findByRole('heading', { name: '@mia_rewears' })).toBeInTheDocument();
    expect(screen.getByText('4.7')).toBeInTheDocument();
    expect(screen.getByText('from 32 ratings')).toBeInTheDocument();
    expect(screen.getByText('31 of 32 swaps matched their listing')).toBeInTheDocument();
    expect(screen.getByText('Fisherman Wool Knit')).toBeInTheDocument();
    expect(screen.getByText('Matched listing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@noor_vintage' })).toHaveAttribute(
      'href',
      '/members/noor_vintage'
    );
  });

  it('displays "No ratings yet" without zero stars when member has no visible ratings', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          username: 'fresh_member',
          memberSince: '2026-11-01T00:00:00.000Z',
          stats: { listed: 0, swapsDone: 0, redeemed: 0 },
          trust: { averageStars: 0, ratingCount: 0, matchedCount: 0 },
          listings: [],
          ratings: [],
        },
      },
    });

    renderMemberProfile('fresh_member');

    expect(await screen.findByRole('heading', { name: '@fresh_member' })).toBeInTheDocument();
    expect(screen.getAllByText('No ratings yet.').length + screen.getAllByText('No ratings yet').length).toBeGreaterThan(0);
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });

  it('renders 404 state for unknown or banned members', async () => {
    api.get.mockRejectedValue({
      response: { status: 404, data: { message: 'Member not found' } },
    });

    renderMemberProfile('ghost_user');

    expect(await screen.findByText(/No active member "@ghost_user" found\./i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Catalogue' })).toHaveAttribute('href', '/items');
  });
});
