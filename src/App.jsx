import { Routes, Route, Navigate } from 'react-router-dom'
import BotGate from './components/BotGate.jsx'
import EntryGate from './components/EntryGate.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import FloatingContactButtons from './components/FloatingContactButtons.jsx'
import HoneypotLink from './components/HoneypotLink.jsx'
import TamperWarningBanner from './components/TamperWarningBanner.jsx'
import TestModeNotice from './components/TestModeNotice.jsx'
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
import ContactUsPage from './pages/ContactUsPage.jsx'
import AboutUsPage from './pages/AboutUsPage.jsx'
import FAQPage from './pages/FAQPage.jsx'
import SizeChartPage from './pages/SizeChartPage.jsx'
import StoreAppointmentPage from './pages/StoreAppointmentPage.jsx'
import A2ZStoresPage from './pages/A2ZStoresPage.jsx'
import CareersPage from './pages/CareersPage.jsx'
import FeedbackPage from './pages/FeedbackPage.jsx'
import TermsConditionsPage from './pages/TermsConditionsPage.jsx'
import ShippingPolicyPage from './pages/ShippingPolicyPage.jsx'
import ReturnExchangePolicyPage from './pages/ReturnExchangePolicyPage.jsx'
import RefundPolicyPage from './pages/RefundPolicyPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage.jsx'
import AdminProductsPage from './pages/admin/AdminProductsPage.jsx'
import AdminProductVideosPage from './pages/admin/AdminProductVideosPage.jsx'
import AdminSalesPage from './pages/admin/AdminSalesPage.jsx'
import AdminCarouselPage from './pages/admin/AdminCarouselPage.jsx'
import AdminCollectionsPage from './pages/admin/AdminCollectionsPage.jsx'
import AdminBillTemplatePage from './pages/admin/AdminBillTemplatePage.jsx'
import AdminReferrerDetailsPage from './pages/admin/AdminReferrerDetailsPage.jsx'
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx'
import AdminDocsPage from './pages/admin/AdminDocsPage.jsx'
import AdminTrackingPartnersPage from './pages/admin/AdminTrackingPartnersPage.jsx'
import AdminPaymentGatewayPage from './pages/admin/AdminPaymentGatewayPage.jsx'
import AdminConfiguratorPage from './pages/admin/AdminConfiguratorPage.jsx'
import ImageStudioPage from './pages/admin/ImageStudioPage.jsx'
import AdminJobsPage from './pages/admin/AdminJobsPage.jsx'
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'
import { ProductsProvider } from './context/ProductsContext.jsx'
import { StorefrontThemeProvider } from './context/StorefrontThemeContext.jsx'
import LuxuryBackdrop from './components/LuxuryBackdrop.jsx'
import SimulatedSmsToaster from './components/SimulatedSmsToaster.jsx'
import OtpCaptchaHost from './components/OtpCaptchaHost.jsx'

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
  { path: '/contact-us', Component: ContactUsPage },
  { path: '/about-us', Component: AboutUsPage },
  { path: '/faqs', Component: FAQPage },
  { path: '/size-chart', Component: SizeChartPage },
  { path: '/store-appointment', Component: StoreAppointmentPage },
  { path: '/a2z-stores', Component: A2ZStoresPage },
  { path: '/careers', Component: CareersPage },
  { path: '/feedback', Component: FeedbackPage },
  { path: '/terms-and-conditions', Component: TermsConditionsPage },
  { path: '/shipping-policy', Component: ShippingPolicyPage },
  { path: '/return-exchange-policy', Component: ReturnExchangePolicyPage },
  { path: '/refund-policy', Component: RefundPolicyPage },
  { path: '/__trap__', Component: BotTrapPage },
]

const ADMIN_ROUTES = [
  { path: '/super', Component: AdminDashboardPage },
  { path: '/super/categories', Component: AdminCategoriesPage },
  { path: '/super/products', Component: AdminProductsPage },
  { path: '/super/product-videos', Component: AdminProductVideosPage },
  { path: '/super/sales', Component: AdminSalesPage },
  { path: '/super/carousel', Component: AdminCarouselPage },
  { path: '/super/collections', Component: AdminCollectionsPage },
  { path: '/super/bill-template', Component: AdminBillTemplatePage },
  { path: '/super/referrers', Component: AdminReferrerDetailsPage },
  { path: '/super/settings', Component: AdminSettingsPage },
  { path: '/super/tracking-partners', Component: AdminTrackingPartnersPage },
  { path: '/super/payment-gateway', Component: AdminPaymentGatewayPage },
  { path: '/super/configurator', Component: AdminConfiguratorPage },
  { path: '/super/docs', Component: AdminDocsPage },
  { path: '/super/image-studio', Component: ImageStudioPage },
  { path: '/super/jobs', Component: AdminJobsPage },
  { path: '/super/feedback', Component: AdminFeedbackPage },
]

// Old standalone routes for tools now living inside Image Studio tabs.
// Kept as redirects so existing bookmarks/links keep working.
const IMAGE_STUDIO_REDIRECTS = [
  { path: '/super/ai-studio', tool: 'ai-studio' },
  { path: '/super/image-converter', tool: 'image-converter' },
  { path: '/super/watermark-remover', tool: 'watermark-studio' },
  { path: '/super/upload-test', tool: 'upload-test' },
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
    <>
      <TestModeNotice />
      <BotGate>
        <ProductsProvider>
          <StorefrontThemeProvider>
            <EntryGate>
              <LuxuryBackdrop />
              <ScrollToTop />
              <HoneypotLink />
              <TamperWarningBanner />
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
                {IMAGE_STUDIO_REDIRECTS.map(({ path, tool }) => (
                  <Route key={path} path={path} element={<Navigate to={`/super/image-studio?tool=${tool}`} replace />} />
                ))}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <FloatingContactButtons />
              <SimulatedSmsToaster />
              <OtpCaptchaHost />
            </EntryGate>
          </StorefrontThemeProvider>
        </ProductsProvider>
      </BotGate>
    </>
  )
}
