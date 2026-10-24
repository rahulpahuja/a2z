import { getSectionStyle } from '../utils/homeLayout.js';

// Wraps one home section so the super user's size overrides (Home Layout page) can be
// applied with CSS variables. A section left at its defaults gets a plain wrapper with
// no attributes, so the page renders exactly as it did before the designer existed.
export default function HomeLayoutSection({ section, children }) {
  const { style, attrs } = getSectionStyle(section);
  return (
    <div className="home-layout-section" data-section={section.id} style={style} {...attrs}>
      {children}
    </div>
  );
}
