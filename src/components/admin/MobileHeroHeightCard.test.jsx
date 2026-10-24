import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const showToast = vi.fn();
const saveStoreSettings = vi.fn();
let stored;
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../services/storeSettings.js', () => ({
  DEFAULT_STORE_SETTINGS: { mobileHeroHeightVh: 24 },
  subscribeToStoreSettings: (cb) => { cb(stored); return () => {}; },
  getStoreSettingsOnce: async () => ({ ...stored, storeName: 'A2Z', facebookUrl: 'fb' }),
  saveStoreSettings: (...a) => saveStoreSettings(...a),
}));

const { default: MobileHeroHeightCard, clampHeroHeight } = await import('./MobileHeroHeightCard.jsx');

beforeEach(() => {
  showToast.mockReset();
  saveStoreSettings.mockReset().mockResolvedValue();
  stored = { mobileHeroHeightVh: 42 };
});

describe('clampHeroHeight', () => {
  it('keeps whole numbers within 12-60 and falls back to the default for junk', () => {
    expect(clampHeroHeight(5)).toBe(12);
    expect(clampHeroHeight(99)).toBe(60);
    expect(clampHeroHeight('30.4')).toBe(30);
    for (const bad of ['', 'x', undefined, NaN]) expect(clampHeroHeight(bad)).toBe(24);
  });
});

describe('MobileHeroHeightCard', () => {
  it('starts at the stored height with nothing to save', () => {
    render(<MobileHeroHeightCard />);
    expect(screen.getByLabelText('Mobile banner height value')).toHaveValue(42);
    expect(screen.getByRole('button', { name: 'Save height' })).toBeDisabled();
  });

  it('applies presets, clamps typed values and enables saving', () => {
    render(<MobileHeroHeightCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Compact (18)' }));
    expect(screen.getByLabelText('Mobile banner height value')).toHaveValue(18);
    expect(screen.getByRole('button', { name: 'Compact (18)' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Mobile banner height value'), { target: { value: '2' } });
    expect(screen.getByLabelText('Mobile banner height value')).toHaveValue(12);
    expect(screen.getByRole('button', { name: 'Save height' })).toBeEnabled();
  });

  it('saves into the latest settings without dropping the other fields, then reports it', async () => {
    render(<MobileHeroHeightCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Balanced (24)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save height' }));
    await waitFor(() => expect(saveStoreSettings).toHaveBeenCalledTimes(1));
    expect(saveStoreSettings.mock.calls[0][0]).toMatchObject({ mobileHeroHeightVh: 24, storeName: 'A2Z', facebookUrl: 'fb' });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Mobile banner height saved.'));
    expect(screen.getByRole('button', { name: 'Save height' })).toBeDisabled();
  });

  it('keeps the edit and explains when saving fails; Undo restores the saved height', async () => {
    saveStoreSettings.mockRejectedValue(new Error('denied'));
    render(<MobileHeroHeightCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Compact (18)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save height' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('denied'));
    expect(screen.getByLabelText('Mobile banner height value')).toHaveValue(18);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Mobile banner height value')).toHaveValue(42);
  });
});
