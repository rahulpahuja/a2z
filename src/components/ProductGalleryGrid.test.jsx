import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./ProductImage.jsx', () => ({ default: ({ src, alt }) => <img src={src} alt={alt} /> }));
vi.mock('./VideoPlayer.jsx', () => ({ default: ({ src }) => <video data-testid="video" src={src} /> }));

import ProductGalleryGrid from './ProductGalleryGrid.jsx';

const images = (n) => Array.from({ length: n }, (_, i) => ({ type: 'image', src: `img${i}.jpg`, alt: `Alt ${i}` }));

describe('ProductGalleryGrid', () => {
  it('renders four equal tiles for four images, with no "+N"', () => {
    render(<ProductGalleryGrid media={images(4)} name="Jacket" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByText(/^\+\d/)).toBeNull();
  });

  it('shows only the available images when there are fewer than four', () => {
    render(<ProductGalleryGrid media={images(3)} name="Jacket" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows four tiles and a "+N" badge when there are more', () => {
    render(<ProductGalleryGrid media={images(7)} name="Jacket" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('puts the lead (selected colour) image first', () => {
    render(<ProductGalleryGrid media={images(6)} leadIndex={4} name="Jacket" />);
    expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', 'img4.jpg');
  });

  it('opens the viewer on the clicked item, wraps with the arrows, and closes with Escape', () => {
    render(<ProductGalleryGrid media={images(5)} name="Jacket" />);
    fireEvent.click(screen.getAllByRole('listitem')[0]);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('1 / 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('1 / 5')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the viewer in <body>, outside any ancestor that could trap a fixed overlay', () => {
    const { container } = render(
      <div style={{ backdropFilter: 'blur(4px)' }}>
        <ProductGalleryGrid media={images(3)} name="Jacket" />
      </div>
    );
    fireEvent.click(screen.getAllByRole('listitem')[0]);
    const dialog = screen.getByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
  });

  it('renders a video tile with a play icon and plays it in the viewer', () => {
    const media = [...images(2), { type: 'video', src: 'clip.mp4' }];
    render(<ProductGalleryGrid media={media} name="Jacket" />);
    fireEvent.click(screen.getByRole('listitem', { name: /Play video 3 of 3/ }));
    expect(screen.getByTestId('video')).toHaveAttribute('src', 'clip.mp4');
  });

  it('restores body scrolling after the viewer closes', () => {
    render(<ProductGalleryGrid media={images(2)} name="Jacket" />);
    fireEvent.click(screen.getAllByRole('listitem')[0]);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Close gallery' }));
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
