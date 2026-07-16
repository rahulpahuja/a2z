import { Routes, Route } from 'react-router-dom'
import BotGate from './components/BotGate.jsx'
import EntryGate from './components/EntryGate.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import FloatingContactButtons from './components/FloatingContactButtons.jsx'
import HoneypotLink from './components/HoneypotLink.jsx'
import BotTrapPage from './pages/BotTrapPage.jsx'
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
import AIStudioPage from './pages/AIStudioPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage.jsx'
import AdminProductsPage from './pages/admin/AdminProductsPage.jsx'
import AdminProductVideosPage from './pages/admin/AdminProductVideosPage.jsx'
import AdminBillTemplatePage from './pages/admin/AdminBillTemplatePage.jsx'
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx'
import AdminDocsPage from './pages/admin/AdminDocsPage.jsx'
import AdminUploadTestPage from './pages/admin/AdminUploadTestPage.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'
import { ProductsProvider } from './context/ProductsContext.jsx'
import LuxuryBackdrop from './components/LuxuryBackdrop.jsx'

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
  { path: '/ai-studio', Component: AIStudioPage },
  { path: '/__trap__', Component: BotTrapPage },
]

const ADMIN_ROUTES = [
  { path: '/super', Component: AdminDashboardPage },
  { path: '/super/categories', Component: AdminCategoriesPage },
  { path: '/super/products', Component: AdminProductsPage },
  { path: '/super/product-videos', Component: AdminProductVideosPage },
  { path: '/super/bill-template', Component: AdminBillTemplatePage },
  { path: '/super/settings', Component: AdminSettingsPage },
  { path: '/super/docs', Component: AdminDocsPage },
  { path: '/super/upload-test', Component: AdminUploadTestPage },
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
    <BotGate>
      <ProductsProvider>
        <EntryGate>
          <LuxuryBackdrop />
          <ScrollToTop />
          <HoneypotLink />
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
      </ProductsProvider>
    </BotGate>
  )
}
