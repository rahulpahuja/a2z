import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const logAnalyticsEvent = vi.fn();
vi.mock('../services/analytics.js', () => ({ logAnalyticsEvent: (...a) => logAnalyticsEvent(...a) }));
const { default: ClickTracker } = await import('./ClickTracker.jsx');

const page = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ClickTracker />
      <header><a href="/products?filter=new-arrivals">New Arrivals</a></header>
      <main><p>Hello</p></main>
    </MemoryRouter>
  );

beforeEach(() => logAnalyticsEvent.mockClear());

describe('ClickTracker', () => {
  it('sends a ui_click event for a click on an option', () => {
    page('/');
    fireEvent.click(screen.getByText('New Arrivals'));
    expect(logAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(logAnalyticsEvent).toHaveBeenCalledWith('ui_click', expect.objectContaining({ label: 'New Arrivals', element: 'link', area: 'header' }));
  });

  it('sends nothing for a click on plain text, or on a page it does not track', () => {
    page('/');
    fireEvent.click(screen.getByText('Hello'));
    expect(logAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('sends nothing from the checkout', () => {
    page('/checkout/shipping');
    fireEvent.click(screen.getByText('New Arrivals'));
    expect(logAnalyticsEvent).not.toHaveBeenCalled();
  });
});
