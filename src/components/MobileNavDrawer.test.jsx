import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/categories.js', () => ({ subscribeToCategories: (cb) => { cb([]); return () => {}; } }));
const { default: MobileNavDrawer } = await import('./MobileNavDrawer.jsx');

describe('MobileNavDrawer', () => {
  it('draws the panel on an opaque surface so the page behind never shows through the menu text', () => {
    const { container } = render(
      <MemoryRouter>
        <MobileNavDrawer open onClose={() => {}} links={[]} />
      </MemoryRouter>
    );
    const panel = container.querySelector('.shadow-2xl');
    expect(panel.className).toContain('bg-surface-solid');
    expect(panel.className).not.toMatch(/(^|\s)bg-surface(\s|$)/);
  });
});
