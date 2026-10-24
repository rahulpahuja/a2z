import { beforeEach, describe, expect, it, vi } from 'vitest';

const logEvent = vi.fn();
vi.mock('firebase/analytics', () => ({ logEvent, setUserId: vi.fn(), setUserProperties: vi.fn() }));
vi.mock('../firebase.js', () => ({ analyticsPromise: Promise.resolve({ analytics: true }) }));

const a = await import('./analytics.js');
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const shot = { id: 'p1_0', productId: 'p1' };
const last = () => logEvent.mock.calls.at(-1).slice(1);

beforeEach(() => logEvent.mockClear());

describe('Shots analytics events', () => {
  it('shot_view carries the shot, product and whether it counted', async () => {
    a.logShotView(shot, true);
    await flush();
    expect(last()).toEqual(['shot_view', { shot_id: 'p1_0', product_id: 'p1', counted: true }]);
    a.logShotView(shot, undefined);
    await flush();
    expect(last()[1].counted).toBe(false);
  });

  it('uses separate events for like and unlike', async () => {
    a.logShotLike(shot, true);
    a.logShotLike(shot, false);
    await flush();
    expect(logEvent.mock.calls.map((c) => c[1])).toEqual(['shot_like', 'shot_unlike']);
  });

  it('records a successful share as the standard GA4 share event', async () => {
    a.logShotShare(shot, 'shared');
    a.logShotShare(shot, 'copied');
    await flush();
    expect(logEvent.mock.calls[0].slice(1)).toEqual(['share', expect.objectContaining({ method: 'native', content_type: 'shot', item_id: 'p1_0' })]);
    expect(logEvent.mock.calls[1][2].method).toBe('copy_link');
  });

  it('records cancelled and failed shares as their own events, not as shares', async () => {
    a.logShotShare(shot, 'cancelled');
    a.logShotShare(shot, 'failed');
    await flush();
    expect(logEvent.mock.calls.map((c) => c[1])).toEqual(['shot_share_cancelled', 'shot_share_failed']);
  });

  it('records swipe, mute and deep-link events', async () => {
    a.logShotSwipe(shot, 3);
    a.logShotMuteToggle(shot, false);
    a.logShotDeepLink('p1_0', true);
    a.logShotDeepLink('gone_9', false);
    await flush();
    expect(logEvent.mock.calls.map((c) => [c[1], c[2]])).toEqual([
      ['shot_swipe', { shot_id: 'p1_0', product_id: 'p1', index: 3 }],
      ['shot_mute_toggle', { shot_id: 'p1_0', product_id: 'p1', muted: false }],
      ['shot_deeplink_open', { shot_id: 'p1_0' }],
      ['shot_deeplink_missing', { shot_id: 'gone_9' }],
    ]);
  });
});
