import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api';
import AddItemPage from './AddItemPage';

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const renderAddItemPage = () =>
  render(
    <MemoryRouter initialEntries={['/add-item']}>
      <Routes>
        <Route path="/" element={<div>Home Route</div>} />
        <Route path="/dashboard" element={<div>Dashboard Route</div>} />
        <Route path="/items/:id" element={<div>Item Detail Route</div>} />
        <Route path="/add-item" element={<AddItemPage />} />
      </Routes>
    </MemoryRouter>
  );

const makeImageFile = (name = 'jacket.jpg', type = 'image/jpeg', sizeBytes = 1024) => {
  const content = new Uint8Array(Math.min(sizeBytes, 64));
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
};

describe('AddItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let counter = 1;
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => `blob:preview-${counter++}`),
      revokeObjectURL: vi.fn(),
    });
  });

  it('shows category-specific measurement fields only and prevents disallowed fields on category switch', async () => {
    const user = userEvent.setup();
    renderAddItemPage();

    expect(
      screen.getByText(/Choose a category above to show only the allowed measurement fields in cm/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Outerwear' }));
    expect(screen.getByLabelText(/Chest, pit to pit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Length$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Shoulder$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Sleeve$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Waist, flat$/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Chest, pit to pit/i), '56');

    await user.click(screen.getByRole('button', { name: 'Bottoms' }));
    expect(screen.getByLabelText(/Waist, flat/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Inseam$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Front rise/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Leg opening/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Chest, pit to pit/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Waist, flat/i), '41');

    const fileInput = document.getElementById('add-item-photos');
    await user.upload(fileInput, makeImageFile('trousers.jpg', 'image/jpeg', 2048));

    await user.type(screen.getByLabelText(/^Title \*/i), 'Heavy Twill Pleated Trousers');
    await user.click(screen.getByRole('button', { name: 'Men' }));
    await user.click(screen.getByRole('button', { name: 'M' }));
    await user.type(
      screen.getByLabelText(/^Description \*/i),
      'Relaxed wide-leg twill trousers worn only a handful of times.'
    );

    api.post
      .mockResolvedValueOnce({
        data: { data: [{ url: 'https://cdn.example.com/trousers.jpg', publicId: 'img-1' }] },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            _id: 'item-123',
            title: 'Heavy Twill Pleated Trousers',
            pointsValue: 42,
          },
        },
      });

    await user.click(screen.getByRole('button', { name: /Publish listing/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(2);
    });

    const [, itemPayload] = api.post.mock.calls[1];
    expect(itemPayload.category).toBe('bottoms');
    expect(itemPayload.measurements).toEqual({ waist: 41, unit: 'cm' });
    expect(itemPayload.measurements.chest).toBeUndefined();
    expect(itemPayload.pointsValue).toBe(42);
  });

  it('shows client validation messages for photo type/size/count and aria-describedby field errors', async () => {
    const user = userEvent.setup();
    renderAddItemPage();

    const fileInput = document.getElementById('add-item-photos');

    const badGif = makeImageFile('anim.gif', 'image/gif', 1024);
    fireEvent.change(fileInput, { target: { files: [badGif] } });
    expect(screen.getByText(/must be a JPEG, PNG, or WebP image/i)).toBeInTheDocument();

    const oversized = makeImageFile('huge.png', 'image/png', 6 * 1024 * 1024);
    fireEvent.change(fileInput, { target: { files: [oversized] } });
    expect(screen.getByText(/exceeds the 5 MB per-photo limit/i)).toBeInTheDocument();

    const sixFiles = Array.from({ length: 6 }, (_, i) =>
      makeImageFile(`photo-${i + 1}.jpg`, 'image/jpeg', 1024)
    );
    fireEvent.change(fileInput, { target: { files: sixFiles } });
    expect(screen.getByText(/Maximum 5 photos allowed/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Remove photo/i })).toHaveLength(5);

    await user.click(screen.getByRole('button', { name: 'Outerwear' }));
    await user.type(screen.getByLabelText(/Chest, pit to pit/i), '5');
    await user.click(screen.getByRole('button', { name: /Publish listing/i }));

    const titleInput = screen.getByLabelText(/^Title \*/i);
    expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    expect(titleInput).toHaveAttribute('aria-describedby', 'title-error');
    expect(screen.getByText(/Title must be between 3 and 100 characters/i)).toBeInTheDocument();

    const chestInput = screen.getByLabelText(/Chest, pit to pit/i);
    expect(chestInput).toHaveAttribute('aria-describedby', 'measure-chest-error');
    expect(screen.getByText(/Chest, pit to pit must be between 20 and 250 cm/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('displays moderator approval points copy before category choice and exact calculateItemPoints value afterwards', async () => {
    const user = userEvent.setup();
    renderAddItemPage();

    expect(
      screen.getByText(/Points are set when a moderator approves the listing/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Outerwear' }));
    expect(screen.getByText('70')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Like New/i }));
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('supports photo reordering, title-derived alt text, server alert handling, and approval-pending success links', async () => {
    const user = userEvent.setup();
    renderAddItemPage();

    await user.type(screen.getByLabelText(/^Title \*/i), 'Stonewash Denim Jacket');
    await user.click(screen.getByRole('button', { name: 'Outerwear' }));
    await user.click(screen.getByRole('button', { name: 'Unisex' }));
    await user.click(screen.getByRole('button', { name: 'L' }));
    await user.click(screen.getByRole('button', { name: 'True to size' }));
    await user.type(
      screen.getByLabelText(/^Description \*/i),
      'Vintage cotton denim jacket with clean stitching and brass rivets.'
    );

    const fileInput = document.getElementById('add-item-photos');
    await user.upload(fileInput, [
      makeImageFile('front.jpg', 'image/jpeg', 1024),
      makeImageFile('label.jpg', 'image/jpeg', 1024),
    ]);

    expect(screen.getAllByAltText(/Stonewash Denim Jacket — photo 1/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Move photo 2 earlier' }));
    expect(screen.getByAltText('Stonewash Denim Jacket — photo 2')).toBeInTheDocument();

    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Image upload service busy' } },
    });

    await user.click(screen.getByRole('button', { name: /Publish listing/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Image upload service busy');
    });

    api.post
      .mockResolvedValueOnce({
        data: {
          data: [
            { url: 'https://cdn.example.com/2.jpg', publicId: 'id-2' },
            { url: 'https://cdn.example.com/1.jpg', publicId: 'id-1' },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            _id: 'created-99',
            title: 'Stonewash Denim Jacket',
            pointsValue: 70,
          },
        },
      });

    await user.click(screen.getByRole('button', { name: /Publish listing/i }));

    await waitFor(() => {
      expect(screen.getByText(/Listing submitted for review/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Awaiting admin approval/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View listing/i })).toHaveAttribute(
      'href',
      '/items/created-99'
    );
    expect(screen.getByRole('link', { name: /Go to dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard'
    );
  });
});
