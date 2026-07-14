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
import NotFoundPage from './pages/NotFoundPage.jsx'
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage.jsx'
import AdminProductsPage from './pages/admin/AdminProductsPage.jsx'
import AdminBillTemplatePage from './pages/admin/AdminBillTemplatePage.jsx'
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx'
import AdminDocsPage from './pages/admin/AdminDocsPage.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'

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
  { path: '/watch-and-buy', Component: WatchAndBuyModalPage },
  { path: '/privacy-policy', Component: PrivacyPolicyPage },
]

const ADMIN_ROUTES = [
  { path: '/admin', Component: AdminDashboardPage },
  { path: '/admin/categories', Component: AdminCategoriesPage },
  { path: '/admin/products', Component: AdminProductsPage },
  { path: '/admin/bill-template', Component: AdminBillTemplatePage },
  { path: '/admin/settings', Component: AdminSettingsPage },
  { path: '/admin/docs', Component: AdminDocsPage },
]

function adminElement(Component) {
  return (
    <RequireAdmin>
      <AdminLayout>
        <Component />
      </AdminLayout>
    </RequireAdmin>
  )
}

export default function App() {
  return (
    <EntryGate>
      <Routes>
        {ROUTES.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
        <Route
          path="/dashboard"
          element={
            <RequireAdmin>
              <DashboardPage />
            </RequireAdmin>
          }
        />
        {ADMIN_ROUTES.map(({ path, Component }) => (
          <Route key={path} path={path} element={adminElement(Component)} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <FloatingContactButtons />
    </EntryGate>
  )
}
