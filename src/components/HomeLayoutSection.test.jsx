import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import HomeLayoutSection from './HomeLayoutSection.jsx';

describe('HomeLayoutSection', () => {
  it('adds no style or size attributes for a section left at its defaults', () => {
    const { container } = render(
      <HomeLayoutSection section={{ id: 'trending', padY: null, maxWidth: null, cardWidth: null }}>
        <p>child</p>
      </HomeLayoutSection>
    );
    const wrapper = container.firstChild;
    expect(wrapper.getAttribute('style')).toBeNull();
    expect(wrapper.hasAttribute('data-hl-pad')).toBe(false);
    expect(wrapper.hasAttribute('data-hl-width')).toBe(false);
    expect(wrapper.hasAttribute('data-hl-card')).toBe(false);
    expect(wrapper).toHaveTextContent('child');
  });

  it('sets only the CSS variables and markers for the sizes that are set', () => {
    const { container } = render(
      <HomeLayoutSection section={{ id: 'featured1', padY: 0, maxWidth: 960, cardWidth: null }}>
        <p>child</p>
      </HomeLayoutSection>
    );
    const wrapper = container.firstChild;
    expect(wrapper.style.getPropertyValue('--hl-pad-y')).toBe('0px');
    expect(wrapper.style.getPropertyValue('--hl-max-w')).toBe('960px');
    expect(wrapper.style.getPropertyValue('--hl-card-w')).toBe('');
    expect(wrapper.hasAttribute('data-hl-pad')).toBe(true);
    expect(wrapper.hasAttribute('data-hl-width')).toBe(true);
    expect(wrapper.hasAttribute('data-hl-card')).toBe(false);
    expect(wrapper.getAttribute('data-section')).toBe('featured1');
  });
});
