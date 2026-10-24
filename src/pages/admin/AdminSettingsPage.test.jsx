import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const showToast = vi.fn();
const saveStoreSettings = vi.fn();
const base = {
  storeName: 'A2Z', location: 'Indore', address: 'Addr', phone: '1', gstNumber: '', facebookUrl: '', taxRatePercent: 18,
  refundPolicy: 'Policy', trashRetentionDays: 60, homeProductsPerRow: 8, mobileHeroHeightVh: 24, showCategoryBubbles: false,
  showBannerHint: true, showBuyOnWhatsapp: true, whatsappOrderTemplate: 'Hi {product}', siteFooterText: '', productFooterText: '',
};
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../services/storeSettings.js', () => ({
  DEFAULT_STORE_SETTINGS: { ...base },
  DEFAULT_REFUND_POLICY: 'Default policy',
  subscribeToStoreSettings: (cb) => { cb({ ...base }); return () => {}; },
  saveStoreSettings: (...a) => saveStoreSettings(...a),
}));

const { default: AdminSettingsPage } = await import('./AdminSettingsPage.jsx');
const renderAt = (url = '/super/settings') => render(<MemoryRouter initialEntries={[url]}><AdminSettingsPage /></MemoryRouter>);

beforeEach(() => {
  showToast.mockReset();
  saveStoreSettings.mockReset().mockResolvedValue();
});

describe('Store Settings tabs', () => {
  it('groups the settings into four tabs and shows only the active section', () => {
    renderAt();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['storefrontStore', 'homeHome page', 'gavelPolicies', 'bottom_navigationFooter']);
    expect(screen.getByLabelText('Store Name')).toBeVisible();
    expect(screen.getByLabelText('Default for every page')).not.toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: /Footer/ }));
    expect(screen.getByLabelText('Default for every page')).toBeVisible();
    expect(screen.getByLabelText('Store Name')).not.toBeVisible();
    expect(screen.getByRole('tab', { name: /Footer/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the tab named in ?tab= and ignores an unknown one', () => {
    renderAt('/super/settings?tab=policies');
    expect(screen.getByRole('tab', { name: /Policies/ })).toHaveAttribute('aria-selected', 'true');
    renderAt('/super/settings?tab=nope');
    expect(screen.getAllByRole('tab', { name: /Store/, selected: true }).length).toBeGreaterThan(0);
  });

  it('moves between tabs with the arrow keys', () => {
    renderAt();
    fireEvent.keyDown(screen.getByRole('tab', { name: /Store/ }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Home page/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tab', { name: /Home page/ }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: /Store/ })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('page-wise footer text', () => {
  it('writes text for one page, flags it in the list, and saves it with everything else', async () => {
    renderAt('/super/settings?tab=footer');
    fireEvent.change(screen.getByLabelText('Footer text for one page'), { target: { value: '/shipping-policy' } });
    fireEvent.change(screen.getByLabelText('Footer text for /shipping-policy'), { target: { value: '  Ships in 3-5 days  ' } });
    expect(screen.getByRole('option', { name: /Shipping Policy.*has text/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(saveStoreSettings).toHaveBeenCalled());
    expect(saveStoreSettings.mock.calls[0][0].pageFooters).toEqual({ 'shipping-policy': 'Ships in 3-5 days' });
  });

  it('drops a page\'s text when it is cleared', async () => {
    renderAt('/super/settings?tab=footer');
    const box = () => screen.getByLabelText(/Footer text for \//);
    fireEvent.change(box(), { target: { value: 'temp' } });
    fireEvent.change(box(), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Store Name'), { target: { value: 'Z' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(saveStoreSettings).toHaveBeenCalled());
    expect(saveStoreSettings.mock.calls[0][0].pageFooters).toEqual({});
  });
});

describe('Save button in the header', () => {
  it('sits in the page header and is disabled until something changes', () => {
    const { container } = renderAt();
    const save = screen.getByRole('button', { name: 'Saved' });
    expect(save).toBeDisabled();
    expect(container.querySelector('header').contains(save)).toBe(true);
    expect(save).toHaveAttribute('form', 'store-settings-form');
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('enables on an edit, shows the unsaved notice, and one Save stores edits from every tab', async () => {
    renderAt();
    fireEvent.change(screen.getByLabelText('Store Name'), { target: { value: 'A2Z Renamed' } });
    fireEvent.click(screen.getByRole('tab', { name: /Footer/ }));
    fireEvent.change(screen.getByLabelText('Default for every page'), { target: { value: 'Free shipping' } });
    fireEvent.click(screen.getByRole('tab', { name: /Policies/ }));
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(saveStoreSettings).toHaveBeenCalledTimes(1));
    expect(saveStoreSettings.mock.calls[0][0]).toMatchObject({ storeName: 'A2Z Renamed', siteFooterText: 'Free shipping', refundPolicy: 'Policy', taxRatePercent: 18 });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Store settings saved.'));
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();
  });

  it('keeps the edits and the button usable when saving fails', async () => {
    saveStoreSettings.mockRejectedValue(new Error('denied'));
    renderAt();
    fireEvent.change(screen.getByLabelText('Store Name'), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('denied'));
    expect(screen.getByLabelText('Store Name')).toHaveValue('X');
    expect(screen.getByRole('button', { name: 'Save Settings' })).toBeEnabled();
  });
});
