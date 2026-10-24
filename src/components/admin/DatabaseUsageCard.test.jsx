import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const fetchDatabaseUsage = vi.fn();
vi.mock('../../services/dbUsage.js', () => ({ fetchDatabaseUsage: (...a) => fetchDatabaseUsage(...a) }));
const { default: DatabaseUsageCard } = await import('./DatabaseUsageCard.jsx');

const usage = (over = {}) => ({
  totalBytes: 250_000_000, limitBytes: 1_000_000_000, measuredAt: 1_700_000_000_000, cached: false, partial: false, skipped: [],
  nodes: [{ name: 'products', bytes: 200_000_000 }, { name: 'orders', bytes: 50_000_000 }], ...over,
});

beforeEach(() => fetchDatabaseUsage.mockReset());

describe('DatabaseUsageCard', () => {
  it('shows the used and total MB, the percentage and the biggest areas', async () => {
    fetchDatabaseUsage.mockResolvedValue(usage());
    render(<DatabaseUsageCard />);
    expect(await screen.findByText(/250\.00 MB/)).toBeInTheDocument();
    expect(screen.getByText(/of 1,000\.00 MB used \(25\.0%\)/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('products')).toBeInTheDocument();
    expect(screen.getByText('200.00 MB')).toBeInTheDocument();
    expect(screen.queryByText(/Getting full|Almost full/)).not.toBeInTheDocument();
  });

  it('warns when the database is nearly full and says when the figure is only a minimum', async () => {
    fetchDatabaseUsage.mockResolvedValue(usage({ totalBytes: 950_000_000, partial: true, skipped: ['analytics'] }));
    render(<DatabaseUsageCard />);
    expect(await screen.findByText(/Almost full: 50\.00 MB left/)).toBeInTheDocument();
    expect(screen.getByText(/Not counted: analytics/)).toBeInTheDocument();
  });

  it('shows the error, and Measure again asks the server for a fresh measurement', async () => {
    fetchDatabaseUsage.mockRejectedValueOnce(new Error('Admins only.'));
    render(<DatabaseUsageCard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Admins only.');
    fetchDatabaseUsage.mockResolvedValueOnce(usage());
    fireEvent.click(screen.getByRole('button', { name: 'Measure again' }));
    await waitFor(() => expect(fetchDatabaseUsage).toHaveBeenLastCalledWith({ refresh: true }));
    expect(await screen.findByText(/250\.00 MB/)).toBeInTheDocument();
  });
});
