import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('chart.js/auto', () => ({ Chart: class { destroy() {} } }));
vi.mock('../../context/ProductsContext.jsx', () => ({
  useProducts: () => ({ products: [{ id: 'p1', title: 'Rider Jacket' }, { id: 'p2', title: 'Baggy Jeans' }, { id: 'p3', title: 'Old Tee' }] }),
}));

const month = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();
const day = `${month}-10`;

const tree = {
  p1: { views: 100, referrers: { l_instagram_com: 20, direct: 10 }, daily: { [day]: { views: 31, referrers: { l_instagram_com: 21, direct: 10 } } } },
  p2: { views: 50, referrers: { google_com: 5, direct: 30 }, daily: { [day]: { views: 37, referrers: { direct: 30, google_com: 7 } } } },
  // Views recorded before referrers were tracked: no breakdown at all.
  p3: { views: 4, daily: { [day]: { views: 4 } } },
};
vi.mock('../../services/productStats.js', () => ({
  subscribeToAllProductStats: (cb) => {
    cb(tree);
    return () => {};
  },
}));

const { default: AdminAnalyticsPage } = await import('./AdminAnalyticsPage.jsx');

const rows = () => [...document.querySelectorAll('.admin-table tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()));
const tab = (name) => screen.getByRole('tab', { name: new RegExp(name) });

describe('Analytics channel tabs', () => {
  it('lists every product under "All channels", with a count per tab', () => {
    render(<AdminAnalyticsPage />);
    expect(tab('All channels')).toHaveAttribute('aria-selected', 'true');
    expect(rows().map((r) => r[0])).toEqual(['Baggy Jeans', 'Rider Jacket', 'Old Tee']);
    expect(within(tab('Instagram')).getByText('21')).toBeInTheDocument();
    expect(within(tab('Direct')).getByText('40')).toBeInTheDocument();
    expect(within(tab('Search')).getByText('7')).toBeInTheDocument();
    expect(within(tab('Unattributed')).getByText('4')).toBeInTheDocument();
  });

  it('filters the table to one channel, counting only that channel\'s views', () => {
    render(<AdminAnalyticsPage />);
    fireEvent.click(tab('Instagram'));
    expect(tab('Instagram')).toHaveAttribute('aria-selected', 'true');
    const [only, ...rest] = rows();
    expect(rest).toHaveLength(0);
    expect([only[0], only[1], only[3]]).toEqual(['Rider Jacket', '21', '20']);
    expect(only[2]).toContain('l_instagram_com');
  });

  it('shows the channel icon next to the top referrer', () => {
    render(<AdminAnalyticsPage />);
    const jacketRow = document.querySelectorAll('.admin-table tbody tr')[1];
    expect(within(jacketRow).getByRole('img', { name: 'Instagram' })).toBeInTheDocument();
  });

  it('keeps views with no referrer data in their own "Unattributed" tab', () => {
    render(<AdminAnalyticsPage />);
    fireEvent.click(tab('Unattributed'));
    expect(rows().map((r) => r[0])).toEqual(['Old Tee']);
  });

  it('moves between tabs with the arrow keys', () => {
    render(<AdminAnalyticsPage />);
    fireEvent.keyDown(tab('All channels'), { key: 'ArrowRight' });
    expect(tab('Direct')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tab('Direct'), { key: 'ArrowLeft' });
    expect(tab('All channels')).toHaveAttribute('aria-selected', 'true');
  });

  it('only offers tabs for channels that have views this month', () => {
    render(<AdminAnalyticsPage />);
    expect(screen.queryByRole('tab', { name: /Pinterest/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Email/ })).toBeNull();
  });
});
