import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DescriptionAssistant from './DescriptionAssistant.jsx';

const product = {
  title: 'Rani Kurti Set',
  categoryTitle: 'Kurti',
  hashtags: '#festive',
  gender: 'Female',
  sizes: ['S', 'M'],
  colors: [{ name: 'Pink' }, { name: 'Navy Blue' }],
};

const MESSY = 'rani kurti set in soft cotton\n\nColor: Red\nFabric: Silk';

// Mirrors how AdminProductsPage hosts it: inside a form, value held in state.
function Host({ initial, onSubmit = () => {} }) {
  const [value, setValue] = useState(initial);
  return (
    <form onSubmit={onSubmit}>
      <textarea aria-label="Description" value={value} onChange={(event) => setValue(event.target.value)} />
      <DescriptionAssistant value={value} product={product} onApply={setValue} />
    </form>
  );
}

describe('DescriptionAssistant', () => {
  it('is disabled until there is text to work on', () => {
    render(<DescriptionAssistant value="" product={product} onApply={() => {}} />);
    expect(screen.getByRole('button', { name: 'Format & improve' })).toBeDisabled();
  });

  it('opens a panel with before/after changes, a checklist and a preview', async () => {
    const user = userEvent.setup();
    render(<DescriptionAssistant value={MESSY} product={product} onApply={() => {}} />);
    const trigger = screen.getByRole('button', { name: 'Format & improve' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);

    const panel = screen.getByRole('region', { name: 'Description assistant' });
    expect(within(panel).getAllByText('Before').length).toBeGreaterThan(0);
    expect(within(panel).getAllByText('After').length).toBeGreaterThan(0);
    expect(within(panel).getByText('Matches the listing')).toBeInTheDocument();
    expect(within(panel).getByText('Storefront preview')).toBeInTheDocument();
    expect(panel.querySelector('.product-description')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Close assistant' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('reports contradictions as findings without changing the text', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<DescriptionAssistant value="Rani kurti set in red cotton for a festive look." product={product} onApply={onApply} />);
    await user.click(screen.getByRole('button', { name: 'Format & improve' }));
    expect(screen.getByText(/Mentions "red", which is not among the listed colours/)).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('applies accepted changes only, then undoes', async () => {
    const user = userEvent.setup();
    render(<Host initial={'wear it today\n\nsecond paragraph is here too'} />);
    await user.click(screen.getByRole('button', { name: 'Format & improve' }));

    const toggles = screen.getAllByRole('button', { name: /Accepted \(click to reject\)/ });
    expect(toggles).toHaveLength(2);
    await user.click(toggles[1]);
    expect(screen.getByRole('button', { name: /Rejected \(click to accept\)/ })).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: 'Apply 1 change' }));
    expect(screen.getByLabelText('Description')).toHaveValue('Wear it today\n\nsecond paragraph is here too');

    await user.click(screen.getByRole('button', { name: 'Undo last apply' }));
    expect(screen.getByLabelText('Description')).toHaveValue('wear it today\n\nsecond paragraph is here too');
    expect(screen.queryByRole('button', { name: 'Undo last apply' })).toBeNull();
  });

  it('applies every change by default and then finds nothing left to do', async () => {
    const user = userEvent.setup();
    render(<Host initial={MESSY} />);
    await user.click(screen.getByRole('button', { name: 'Format & improve' }));
    await user.click(screen.getByRole('button', { name: /^Apply \d+ changes?$/ }));
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Rani kurti set in soft cotton.\n\n- Colour: Red\n- Fabric: Silk',
    );
    expect(screen.getByRole('status')).toHaveTextContent('No formatting changes suggested.');
  });

  it('never submits the surrounding form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(<Host initial={MESSY} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Format & improve' }));
    await user.click(screen.getAllByRole('button', { name: /click to reject/ })[0]);
    await user.click(screen.getByRole('button', { name: /^Apply/ }));
    await user.click(screen.getByRole('button', { name: 'Undo last apply' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not use inline styles', async () => {
    const user = userEvent.setup();
    const { container } = render(<DescriptionAssistant value={MESSY} product={product} onApply={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Format & improve' }));
    expect(container.querySelector('[style]')).toBeNull();
  });
});
