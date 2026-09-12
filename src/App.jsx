import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import AnalyticsListener from './components/AnalyticsListener.jsx'
import FloatingContactButtons from './components/FloatingContactButtons.jsx'
import HoneypotLink from './components/HoneypotLink.jsx'
import BotTrapPage from './pages/BotTrapPage.jsx'
// HomePage stays a static import — it's the landing page for most visits,
// so lazy-loading it would only add a network round-trip with no benefit.
import HomePage from './pages/HomePage.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'
import { ProductsProvider } from './context/ProductsContext.jsx'
import { StorefrontThemeProvider } from './context/StorefrontThemeContext.jsx'
import LuxuryBackdrop from './components/LuxuryBackdrop.jsx'
import SimulatedSmsToaster from './components/SimulatedSmsToaster.jsx'
import OtpCaptchaHost from './components/OtpCaptchaHost.jsx'

// Every other route is code-split: none of this JS (or the admin panel's
// image-processing/PDF/chart libraries pulled in behind it) is downloaded by
// a storefront visitor until they actually navigate to it.
const StorefrontPage = lazy(() => import('./pages/StorefrontPage.jsx'))
const ProductListingPage = lazy(() => import('./pages/ProductListingPage.jsx'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'))
const ProductDetailAltPage = lazy(() => import('./pages/ProductDetailAltPage.jsx'))
const CartPage = lazy(() => import('./pages/CartPage.jsx'))
const CheckoutShippingPage = lazy(() => import('./pages/CheckoutShippingPage.jsx'))
const PaymentPage = lazy(() => import('./pages/PaymentPage.jsx'))
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage.jsx'))
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const WatchAndBuyModalPage = lazy(() => import('./pages/WatchAndBuyModalPage.jsx'))
const ShotsPage = lazy(() => import('./pages/ShotsPage.jsx'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.jsx'))
const ContactUsPage = lazy(() => import('./pages/ContactUsPage.jsx'))
const AboutUsPage = lazy(() => import('./pages/AboutUsPage.jsx'))
const FAQPage = lazy(() => import('./pages/FAQPage.jsx'))
const SizeChartPage = lazy(() => import('./pages/SizeChartPage.jsx'))
const StoreAppointmentPage = lazy(() => import('./pages/StoreAppointmentPage.jsx'))
const A2ZStoresPage = lazy(() => import('./pages/A2ZStoresPage.jsx'))
const CareersPage = lazy(() => import('./pages/CareersPage.jsx'))
const FeedbackPage = lazy(() => import('./pages/FeedbackPage.jsx'))
const TermsConditionsPage = lazy(() => import('./pages/TermsConditionsPage.jsx'))
const ShippingPolicyPage = lazy(() => import('./pages/ShippingPolicyPage.jsx'))
const ReturnExchangePolicyPage = lazy(() => import('./pages/ReturnExchangePolicyPage.jsx'))
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'))
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage.jsx'))
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage.jsx'))
const AdminTrashPage = lazy(() => import('./pages/admin/AdminTrashPage.jsx'))
const AdminUsageBillingPage = lazy(() => import('./pages/admin/AdminUsageBillingPage.jsx'))
const AdminProductVideosPage = lazy(() => import('./pages/admin/AdminProductVideosPage.jsx'))
const AdminSalesPage = lazy(() => import('./pages/admin/AdminSalesPage.jsx'))
const AdminLocalBillingPage = lazy(() => import('./pages/admin/AdminLocalBillingPage.jsx'))
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage.jsx'))
const AdminCollectionsPage = lazy(() => import('./pages/admin/AdminCollectionsPage.jsx'))
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage.jsx'))
const AdminBillTemplatePage = lazy(() => import('./pages/admin/AdminBillTemplatePage.jsx'))
const AdminReferrerDetailsPage = lazy(() => import('./pages/admin/AdminReferrerDetailsPage.jsx'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage.jsx'))
const AdminDocsPage = lazy(() => import('./pages/admin/AdminDocsPage.jsx'))
const AdminTrackingPartnersPage = lazy(() => import('./pages/admin/AdminTrackingPartnersPage.jsx'))
const AdminPaymentGatewayPage = lazy(() => import('./pages/admin/AdminPaymentGatewayPage.jsx'))
const AdminConfiguratorPage = lazy(() => import('./pages/admin/AdminConfiguratorPage.jsx'))
const ImageStudioPage = lazy(() => import('./pages/admin/ImageStudioPage.jsx'))
const AdminJobsPage = lazy(() => import('./pages/admin/AdminJobsPage.jsx'))
const AdminFeedbackPage = lazy(() => import('./pages/admin/AdminFeedbackPage.jsx'))

function RouteFallback() {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
    </div>
  )
}

const ROUTES = [
  { path: '/', Component: HomePage },
  { path: '/storefront', Component: StorefrontPage },
  { path: '/products', Component: ProductListingPage },
  { path: '/products/:id', Component: ProductDetailPage },
  { path: '/product-alt', Component: ProductDetailAltPage },
  { path: '/cart', Component: CartPage },
  { path: '/checkout/shipping', Component: CheckoutShippingPage },
  { path: '/checkout/payment', Component: PaymentPage },
  { path: '/orders/tracking', Component: OrderTrackingPage },
  { path: '/orders', Component: MyOrdersPage },
  { path: '/profile', Component: ProfilePage },
  { path: '/watch-and-buy', Component: WatchAndBuyModalPage },
  { path: '/shots', Component: ShotsPage },
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
  { path: '/super/trash', Component: AdminTrashPage },
  { path: '/super/product-videos', Component: AdminProductVideosPage },
  { path: '/super/sales', Component: AdminSalesPage },
  { path: '/super/local-billing', Component: AdminLocalBillingPage },
  { path: '/super/analytics', Component: AdminAnalyticsPage },
  { path: '/super/collections', Component: AdminCollectionsPage },
  { path: '/super/coupons', Component: AdminCouponsPage },
  { path: '/super/bill-template', Component: AdminBillTemplatePage },
  { path: '/super/referrers', Component: AdminReferrerDetailsPage },
  { path: '/super/settings', Component: AdminSettingsPage },
  { path: '/super/tracking-partners', Component: AdminTrackingPartnersPage },
  { path: '/super/payment-gateway', Component: AdminPaymentGatewayPage },
  { path: '/super/configurator', Component: AdminConfiguratorPage },
  { path: '/super/usage-billing', Component: AdminUsageBillingPage },
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

// Hero Carousel now lives inside the Layout Configurator as a surface tab.
// Kept as a redirect so existing bookmarks/links keep working.
const CONFIGURATOR_REDIRECTS = [
  { path: '/super/carousel', surface: 'hero' },
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
  const { user } = useAuth();

  // Visible cue that you're signed in: darken the top bars while logged in,
  // revert on logout.
  useEffect(() => {
    document.body.classList.toggle('user-signed-in', Boolean(user));
  }, [user]);

  return (
    <>
      <ProductsProvider>
        <StorefrontThemeProvider>
          <LuxuryBackdrop />
          <ScrollToTop />
          <AnalyticsListener />
          <HoneypotLink />
          <Suspense fallback={<RouteFallback />}>
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
              {CONFIGURATOR_REDIRECTS.map(({ path, surface }) => (
                <Route key={path} path={path} element={<Navigate to={`/super/configurator?surface=${surface}`} replace />} />
              ))}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <FloatingContactButtons />
          <SimulatedSmsToaster />
          <OtpCaptchaHost />
        </StorefrontThemeProvider>
      </ProductsProvider>
    </>
  )
}
