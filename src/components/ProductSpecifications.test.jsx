import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductSpecifications from './ProductSpecifications.jsx';

describe('ProductSpecifications', () => {
  it('starts closed and lists category, availability and the optional rows when opened', () => {
    const { container } = render(<ProductSpecifications product={{ category: 'Jackets', care: 'Dry clean only' }} inStock />);
    const details = container.querySelector('details');
    expect(details.open).toBe(false);
    fireEvent.click(screen.getByText('Specifications'));
    expect(details.open).toBe(true);
    const terms = [...container.querySelectorAll('dt')].map((n) => n.textContent);
    expect(terms).toEqual(['Category', 'Availability', 'Care']);
    expect(screen.getByText('Jackets')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('Dry clean only')).toBeInTheDocument();
  });

  it('says Out of Stock, and leaves out a category the product does not have', () => {
    const { container } = render(<ProductSpecifications product={{}} inStock={false} />);
    expect([...container.querySelectorAll('dt')].map((n) => n.textContent)).toEqual(['Availability']);
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });
});
