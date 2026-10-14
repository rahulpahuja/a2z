import { Link, useLocation } from 'react-router-dom';
import { isAllProductsView } from '../services/topNav.js';
import { logSelectContent } from '../services/analytics.js';

// A phone-only strip under the header with a direct "All Products" link, so shoppers
// need not open the menu drawer. The header's own nav links are hidden on phones;
// CSS hides this strip wherever they show, so the two never appear together.
export default function MobileQuickNav() {
  const { pathname, search } = useLocation();
  const active = isAllProductsView(pathname, search);

  return (
    <nav className="mobile-quick-nav" aria-label="Shop">
      <div className="mobile-quick-nav__inner">
        <Link
          to="/products"
          className="mobile-quick-nav__link"
          aria-current={active ? 'page' : undefined}
          onClick={() => logSelectContent('nav_link', 'All Products')}
        >
          <span className="material-symbols-outlined mobile-quick-nav__icon" aria-hidden="true">grid_view</span>
          All Products
        </Link>
      </div>
    </nav>
  );
}
