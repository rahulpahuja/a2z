import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../services/analytics.js', () => ({ logShare: vi.fn(), logSelectContent: vi.fn() }));

const { default: FloatingContactButtons } = await import('./FloatingContactButtons.jsx');
const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <FloatingContactButtons />
    </MemoryRouter>
  );

describe('FloatingContactButtons', () => {
  it('shows the Shots, WhatsApp and Instagram shortcuts on ordinary pages', () => {
    renderAt('/products');
    expect(screen.getByRole('button', { name: 'Watch Shots' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it.each(['/shots', '/shots/', '/shots?v=abc_0'])('is hidden on the full-screen Shots feed (%s)', (path) => {
    const { container } = renderAt(path);
    expect(container.firstChild).toBeNull();
  });

  it('is not hidden on pages that merely start with "shots"', () => {
    renderAt('/shotsy');
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
});
