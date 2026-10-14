import { beforeEach, describe, expect, it, vi } from 'vitest';

const logEvent = vi.fn();

vi.mock('firebase/analytics', () => ({
  logEvent,
  setUserId: vi.fn(),
  setUserProperties: vi.fn(),
}));
vi.mock('../firebase.js', () => ({ analyticsPromise: Promise.resolve({ analytics: true }) }));

const { logBuyOnWhatsapp } = await import('./analytics.js');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('logBuyOnWhatsapp', () => {
  beforeEach(() => logEvent.mockClear());

  it('sends a buy_on_whatsapp event with the product, variant, quantity and total value', async () => {
    logBuyOnWhatsapp(
      { productId: 'p1', title: 'Silk Kurta', color: 'Pink', size: 'M', price: 1299 },
      2
    );
    await flush();
    expect(logEvent).toHaveBeenCalledTimes(1);
    const [, name, params] = logEvent.mock.calls[0];
    expect(name).toBe('buy_on_whatsapp');
    expect(params.currency).toBe('INR');
    expect(params.value).toBe(2598);
    expect(params.items).toEqual([
      expect.objectContaining({ item_id: 'p1', item_name: 'Silk Kurta', item_variant: 'Pink / M', price: 1299, quantity: 2 }),
    ]);
  });

  it('defaults to a quantity of 1', async () => {
    logBuyOnWhatsapp({ productId: 'p1', title: 'Silk Kurta', price: 500 });
    await flush();
    expect(logEvent.mock.calls[0][2].value).toBe(500);
  });
});
