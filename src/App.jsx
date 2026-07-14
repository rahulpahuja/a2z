import { Routes, Route } from 'react-router-dom'
import EntryGate from './components/EntryGate.jsx'
import FloatingContactButtons from './components/FloatingContactButtons.jsx'
import HomePage from './pages/HomePage.jsx'
import StorefrontPage from './pages/StorefrontPage.jsx'
import ProductListingPage from './pages/ProductListingPage.jsx'
import ProductDetailPage from './pages/ProductDetailPage.jsx'
import ProductDetailAltPage from './pages/ProductDetailAltPage.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckoutShippingPage from './pages/CheckoutShippingPage.jsx'
import PaymentPage from './pages/PaymentPage.jsx'
import OrderTrackingPage from './pages/OrderTrackingPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import WatchAndBuyModalPage from './pages/WatchAndBuyModalPage.jsx'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx'

const ROUTES = [
  { path: '/', Component: HomePage },
  { path: '/storefront', Component: StorefrontPage },
  { path: '/products', Component: ProductListingPage },
  { path: '/product/:id', Component: ProductDetailPage },
  { path: '/product-alt', Component: ProductDetailAltPage },
  { path: '/cart', Component: CartPage },
  { path: '/checkout/shipping', Component: CheckoutShippingPage },
  { path: '/checkout/payment', Component: PaymentPage },
  { path: '/orders/tracking', Component: OrderTrackingPage },
  { path: '/dashboard', Component: DashboardPage },
  { path: '/watch-and-buy', Component: WatchAndBuyModalPage },
  { path: '/privacy-policy', Component: PrivacyPolicyPage },
]

export default function App() {
  return (
    <EntryGate>
      <Routes>
        {ROUTES.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
      </Routes>
      <FloatingContactButtons />
    </EntryGate>
  )
}
