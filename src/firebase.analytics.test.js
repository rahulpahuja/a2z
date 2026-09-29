import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initializeAnalytics = vi.fn(() => ({ analytics: true }));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ useDeviceLanguage: vi.fn() })) }));
vi.mock('firebase/database', () => ({ getDatabase: vi.fn(() => ({})) }));
vi.mock('firebase/analytics', () => ({
  initializeAnalytics,
  isSupported: vi.fn(() => Promise.resolve(true)),
}));

async function loadAnalytics(hostname) {
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'key');
  vi.stubEnv('VITE_FIREBASE_MEASUREMENT_ID', 'G-TEST');
  vi.stubGlobal('location', { hostname });
  vi.resetModules();
  return (await import('./firebase.js')).analyticsPromise;
}

describe('analytics initialisation', () => {
  beforeEach(() => initializeAnalytics.mockClear());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each(['www.thea2zcollection.com', 'thea2zcollection.in'])('reports from %s without the SDK\'s own page_view', async (host) => {
    expect(await loadAnalytics(host)).toBeTruthy();
    expect(initializeAnalytics).toHaveBeenCalledWith(expect.anything(), { config: { send_page_view: false } });
  });

  it.each(['localhost', 'a2zco.netlify.app', 'evil-thea2zcollection.com.example.org'])('stays silent on %s', async (host) => {
    expect(await loadAnalytics(host)).toBeNull();
    expect(initializeAnalytics).not.toHaveBeenCalled();
  });
});
