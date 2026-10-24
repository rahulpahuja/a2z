import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ListingPageNav from './ListingPageNav.jsx';

const view = (props) => render(<ListingPageNav currentPage={1} totalPages={3} allLoaded onNext={vi.fn()} onTop={vi.fn()} {...props} />);

describe('ListingPageNav', () => {
  it('offers a large "Go to next page" button once the page is fully loaded', () => {
    const onNext = vi.fn();
    view({ currentPage: 2, onNext });
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Go to next page/ }));
    expect(onNext).toHaveBeenCalledWith(3);
  });

  it('stays out of the way while "Load more" still has items to show', () => {
    const { container } = view({ allLoaded: false });
    expect(container.firstChild).toBeNull();
  });

  it('shows nothing for a single page', () => {
    expect(view({ totalPages: 1 }).container.firstChild).toBeNull();
    expect(view({ totalPages: 0 }).container.firstChild).toBeNull();
  });

  it('on the last page says so and offers Back to top instead of a dead end', () => {
    const onTop = vi.fn();
    view({ currentPage: 3, onTop });
    expect(screen.getByText(/You've reached the end/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next page/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Back to top/ }));
    expect(onTop).toHaveBeenCalled();
  });
});
