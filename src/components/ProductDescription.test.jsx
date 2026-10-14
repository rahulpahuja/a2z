import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductDescription from './ProductDescription.jsx';

describe('ProductDescription', () => {
  it('renders nothing for an empty description', () => {
    const { container } = render(<ProductDescription text="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders paragraphs and bullet lists as semantic elements', () => {
    const { container } = render(<ProductDescription text={'Festive kurti\n\n- Soft cotton\n- Relaxed fit'} />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Soft cotton', 'Relaxed fit']);
  });

  it('renders a legacy single string as one paragraph', () => {
    const { container } = render(<ProductDescription text="A soft cotton kurti set." />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('ul')).toBeNull();
  });

  it('shows markup as text instead of creating elements', () => {
    const { container } = render(<ProductDescription text={'<script>alert(1)</script>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container).toHaveTextContent('<script>alert(1)</script>');
  });

  it('applies the variant and extra class names without inline styles', () => {
    const { container } = render(<ProductDescription text="Hello" variant="full" className="md:block" />);
    const root = container.firstChild;
    expect(root).toHaveClass('product-description', 'product-description--full', 'md:block');
    expect(root).not.toHaveAttribute('style');
  });
});
