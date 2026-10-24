import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// This project's jsdom environment doesn't provide web storage by default.
for (const name of ['localStorage', 'sessionStorage']) {
  if (typeof globalThis[name] === 'undefined') {
    const store = new Map();
    globalThis[name] = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
  }
}

const showToast = vi.fn();
const analytics = {
  logSelectItem: vi.fn(),
  logShotDeepLink: vi.fn(),
  logShotLike: vi.fn(),
  logShotMuteToggle: vi.fn(),
  logShotShare: vi.fn(),
  logShotSwipe: vi.fn(),
  logShotView: vi.fn(),
};
const stats = { current: {} };
const service = { recordShotView: vi.fn(), setShotLiked: vi.fn(), liked: new Set() };
const share = { shareLink: vi.fn() };

vi.mock('../services/analytics.js', () => analytics);
vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../context/CartContext.jsx', () => ({ formatCurrency: (n) => `₹${n}` }));
vi.mock('../context/ProductsContext.jsx', () => ({
  useProducts: () => ({
    products: [
      { id: 'pa', title: 'Rider Jacket', price: 100, videos: ['a0.mp4', 'a1.mp4'] },
      { id: 'pb', title: 'Baggy Jeans', price: 200, videos: ['b0.mp4'] },
      { id: 'pc', title: 'No video', price: 5 },
    ],
  }),
}));
vi.mock('../services/shotStats.js', () => ({
  subscribeToShotStats: (cb) => {
    cb(stats.current);
    return () => {};
  },
  recordShotView: (...a) => service.recordShotView(...a),
  setShotLiked: (...a) => service.setShotLiked(...a),
  readLikedShots: () => new Set(service.liked),
}));
vi.mock('../utils/shotShare.js', async (importOriginal) => ({
  ...(await importOriginal()),
  shareLink: (...a) => share.shareLink(...a),
}));

let intersect;
beforeEach(() => {
  vi.useFakeTimers();
  Object.values(analytics).forEach((fn) => fn.mockReset());
  showToast.mockReset();
  service.recordShotView.mockReset().mockResolvedValue(true);
  service.setShotLiked.mockReset().mockResolvedValue(true);
  service.liked = new Set();
  share.shareLink.mockReset().mockResolvedValue('copied');
  stats.current = { pa_0: { views: 1250, likes: 7 } };
  localStorage.setItem('a2z_shots_tutorial_seen', '1');
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  intersect = [];
  global.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
      intersect.push(this);
    }
    observe() {}
    disconnect() {}
  };
});
afterEach(() => vi.useRealTimers());

const { default: ShotsPage } = await import('./ShotsPage.jsx');
const renderAt = (url = '/shots') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ShotsPage />
    </MemoryRouter>
  );
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('ShotsPage engagement', () => {
  it('shows formatted view and like counts for each short, zero when none', () => {
    renderAt();
    const likes = screen.getAllByTestId('shot-likes').map((n) => n.textContent);
    const views = screen.getAllByTestId('shot-views').map((n) => n.textContent);
    expect(likes).toEqual(['7', '0', '0']);
    expect(views).toEqual(['1.2K', '0', '0']);
  });

  it('counts a view only after the short has been on screen for 2 seconds, and tracks it', async () => {
    renderAt();
    await act(async () => {
      vi.advanceTimersByTime(1900);
    });
    expect(service.recordShotView).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    await flush();
    expect(service.recordShotView).toHaveBeenCalledWith('pa_0');
    expect(analytics.logShotView).toHaveBeenCalledWith(expect.objectContaining({ id: 'pa_0', productId: 'pa' }), true);
  });

  it('reports a repeat view in the same session as not counted', async () => {
    service.recordShotView.mockResolvedValue(false);
    renderAt();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    await flush();
    expect(analytics.logShotView).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('likes and unlikes a short, updating the heart and tracking each', async () => {
    renderAt();
    const heart = screen.getAllByRole('button', { name: 'Like this short' })[0];
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    await act(async () => {
      fireEvent.click(heart);
    });
    expect(service.setShotLiked).toHaveBeenCalledWith('pa_0', true);
    expect(analytics.logShotLike).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'pa_0' }), true);
    expect(screen.getAllByRole('button', { name: 'Unlike this short' })[0]).toHaveAttribute('aria-pressed', 'true');

    service.liked = new Set(['pa_0']);
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Unlike this short' })[0]);
    });
    expect(service.setShotLiked).toHaveBeenLastCalledWith('pa_0', false);
    expect(analytics.logShotLike).toHaveBeenLastCalledWith(expect.anything(), false);
  });

  it('puts the heart back and tells the visitor when a like cannot be saved, without tracking it', async () => {
    service.setShotLiked.mockRejectedValue(new Error('denied'));
    renderAt();
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Like this short' })[0]);
    });
    expect(analytics.logShotLike).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Could not save your like/));
    expect(screen.getAllByRole('button', { name: 'Like this short' })[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('shares a link to this specific short and tracks the outcome', async () => {
    renderAt();
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Share this short' })[0]);
    });
    expect(share.shareLink).toHaveBeenCalledWith(expect.objectContaining({ url: `${window.location.origin}/shots?v=pa_0`, title: expect.stringContaining('Rider Jacket') }));
    expect(analytics.logShotShare).toHaveBeenCalledWith(expect.objectContaining({ id: 'pa_0' }), 'copied');
    expect(showToast).toHaveBeenCalledWith('Link copied.');
  });

  it.each([
    ['shared', null],
    ['cancelled', null],
    ['failed', /Could not share/],
  ])('tracks a %s share', async (result, toast) => {
    share.shareLink.mockResolvedValue(result);
    renderAt();
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Share this short' })[0]);
    });
    expect(analytics.logShotShare).toHaveBeenCalledWith(expect.anything(), result);
    if (toast) expect(showToast).toHaveBeenCalledWith(expect.stringMatching(toast));
    else expect(showToast).not.toHaveBeenCalled();
  });

  it('opens the shot named in ?v= and tracks the deep link', () => {
    renderAt('/shots?v=pb_0');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(analytics.logShotDeepLink).toHaveBeenCalledWith('pb_0', true);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('tells the visitor a shared short is gone, tracks it, and still shows the feed', () => {
    renderAt('/shots?v=gone_9');
    expect(analytics.logShotDeepLink).toHaveBeenCalledWith('gone_9', false);
    expect(showToast).toHaveBeenCalledWith('That short is no longer available.');
    expect(screen.getAllByRole('button', { name: 'Share this short' })).toHaveLength(3);
  });

  it('ignores a malformed ?v= value', () => {
    renderAt('/shots?v=../etc');
    expect(analytics.logShotDeepLink).not.toHaveBeenCalled();
  });

  it('tracks mute toggles with the new state', () => {
    renderAt();
    fireEvent.click(screen.getAllByRole('button', { name: 'Unmute' })[0]);
    expect(analytics.logShotMuteToggle).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'pa_0' }), false);
  });

  it('tracks Buy Now as a product selection from Shots', () => {
    renderAt();
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy Now' })[0]);
    expect(analytics.logSelectItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'pa' }), 'Shots');
  });

  it('tracks a swipe to another short, but not the first one shown', () => {
    renderAt();
    const observer = intersect.at(-1);
    const sections = [...document.querySelectorAll('section')];
    act(() => observer.cb([{ isIntersecting: true, target: sections[0] }]));
    expect(analytics.logShotSwipe).not.toHaveBeenCalled();
    act(() => observer.cb([{ isIntersecting: true, target: sections[1] }]));
    expect(analytics.logShotSwipe).toHaveBeenCalledWith(expect.objectContaining({ id: 'pa_1' }), 1);
  });
});
