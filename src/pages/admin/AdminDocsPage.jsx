const ENV_VARS = [
  { name: 'VITE_FIREBASE_API_KEY', desc: 'Firebase Web API key.' },
  { name: 'VITE_FIREBASE_AUTH_DOMAIN', desc: 'Firebase Auth domain, e.g. your-project.firebaseapp.com.' },
  { name: 'VITE_FIREBASE_PROJECT_ID', desc: 'Firebase project ID.' },
  { name: 'VITE_FIREBASE_STORAGE_BUCKET', desc: 'Firebase storage bucket.' },
  { name: 'VITE_FIREBASE_MESSAGING_SENDER_ID', desc: 'Firebase Cloud Messaging sender ID.' },
  { name: 'VITE_FIREBASE_APP_ID', desc: 'Firebase Web app ID.' },
  { name: 'VITE_FIREBASE_DATABASE_URL', desc: 'Realtime Database URL, e.g. https://your-project-default-rtdb.firebaseio.com.' },
  {
    name: 'VITE_ADMIN_EMAILS',
    desc: 'Comma-separated Google account emails allowed into /dashboard and /super after signing in. Leave blank to lock everyone out.',
  },
  {
    name: 'VITE_ADMIN_PHONES',
    desc: 'Comma-separated E.164 phone numbers (e.g. +919876543210) allowed the same access via phone OTP sign-in.',
  },
  {
    name: 'VITE_IMAGE_UPLOAD_API_URL',
    desc: 'Your deployed Cloudflare R2 Upload Worker endpoint (e.g. https://r2-image-uploader.<subdomain>.workers.dev). Leave blank for local uploader simulation.',
  },
];

const ADMIN_SECTIONS = [
  { to: '/super', label: 'Dashboard', desc: 'Sales KPIs and recent-orders overview.' },
  { to: '/super/categories', label: 'Categories', desc: 'Create and remove product categories.' },
  { to: '/super/products', label: 'Products', desc: 'Manage the product catalog stored in Realtime Database.' },
  { to: '/super/bill-template', label: 'Bill Template', desc: 'Configure the layout used for generated order receipts.' },
  { to: '/super/settings', label: 'Store Settings', desc: 'Store name, address, phone, and GST number.' },
  { to: '/super/upload-test', label: 'R2 Upload Test', desc: 'Diagnose and run test uploads to Cloudflare R2.' },
];

const RTDB_PATHS = [
  { path: 'productStats/{productId}/views', access: 'Read: public. Write: public, numeric only.', note: 'Incremented once per browser session per product on the product detail pages.' },
  { path: 'productStats/{productId}/purchases', access: 'Read: public. Write: public, numeric only.', note: 'Incremented by line-item quantity when an order is placed (CartContext.placeOrder).' },
  { path: 'adminProducts/*', access: 'Read & write: signed-in users only.', note: 'Used by the Products admin page.' },
  { path: 'categories/*', access: 'Read & write: signed-in users only.', note: 'Used by the Categories admin page.' },
  { path: 'settings/*', access: 'Read & write: signed-in users only.', note: 'Store Settings + Bill Template.' },
  { path: 'fileMetadata/*', access: 'Read & write: signed-in users only.', note: 'Logs R2 storage keys, urls, MIME types, and sizes for all uploads.' },
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-title-sm text-title-sm text-on-surface border-b border-outline-variant pb-3 mb-4">{title}</h2>
      <div className="font-body-sm text-body-sm text-on-surface-variant space-y-4">{children}</div>
    </section>
  );
}

function Code({ children }) {
  return (
    <code className="bg-surface-container-low border border-outline-variant rounded px-1.5 py-0.5 font-mono text-[13px] text-on-surface">
      {children}
    </code>
  );
}

function Pre({ children }) {
  return (
    <pre className="bg-surface-container-low border border-outline-variant rounded-lg p-4 overflow-x-auto font-mono text-[13px] text-on-surface whitespace-pre-wrap">
      {children}
    </pre>
  );
}

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'signing-in', label: 'Signing In' },
  { id: 'env-vars', label: 'Environment Variables' },
  { id: 'firebase-setup', label: 'Firebase Console Setup' },
  { id: 'r2-setup', label: 'Cloudflare R2 Worker Setup' },
  { id: 'view-tracking', label: 'Product View & Purchase Tracking' },
  { id: 'rtdb-paths', label: 'Realtime Database Paths' },
  { id: 'admin-sections', label: 'Admin Panel Sections' },
  { id: 'security', label: 'Security Notes' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
];

export default function AdminDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Documentation</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          How admin sign-in and product view/purchase tracking are wired up.
        </p>
      </header>

      <div className="px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 max-w-5xl">
        <nav className="hidden lg:block">
          <ul className="sticky top-8 space-y-2 font-label-caps text-label-caps text-on-surface-variant">
            {TOC.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="hover:text-primary transition-colors">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-12">
          <Section id="overview" title="Overview">
            <p>
              The storefront has no customer accounts — the only sign-in flow is for admins. Clicking the profile
              (person) icon anywhere on the site opens a sign-in modal offering <strong>Google sign-in</strong> or{' '}
              <strong>phone number + OTP</strong>, both via Firebase Authentication. Whether a signed-in user counts
              as an admin is decided entirely by an allow-list of emails/phone numbers in <Code>.env</Code> — there
              are no roles or a users database.
            </p>
            <p>
              Two things are gated behind this: the legacy <Code>/dashboard</Code> page and the full admin panel
              under <Code>/super</Code> (this page included).
            </p>
          </Section>

          <Section id="signing-in" title="Signing In">
            <ol className="list-decimal list-inside space-y-2">
              <li>Click the person icon in the header on any page.</li>
              <li>
                Choose <strong>Continue with Google</strong> (opens a popup), or enter a phone number in E.164 format
                (e.g. <Code>+919876543210</Code>) and tap <strong>Send OTP</strong>, then enter the 6-digit code.
              </li>
              <li>
                If the signed-in account's email or phone number is in <Code>VITE_ADMIN_EMAILS</Code> /{' '}
                <Code>VITE_ADMIN_PHONES</Code>, an <strong>Admin Dashboard</strong> link appears in the account menu
                and <Code>/super</Code>, <Code>/dashboard</Code> become reachable.
              </li>
              <li>Otherwise, visiting an admin route shows an "Access Denied" screen with a sign-out button.</li>
            </ol>
            <p>
              Relevant source: <Code>src/context/AuthContext.jsx</Code> (sign-in logic + <Code>isAdmin</Code>),{' '}
              <Code>src/components/AuthModal.jsx</Code> (the sign-in UI), <Code>src/components/RequireAdmin.jsx</Code>{' '}
              (the route guard).
            </p>
          </Section>

          <Section id="env-vars" title="Environment Variables">
            <p>
              Copy <Code>.env.example</Code> to <Code>.env</Code> and fill these in (Firebase values come from{' '}
              Project Settings → General → Your apps → SDK setup and configuration):
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="py-2 pr-4 font-label-caps text-label-caps text-on-surface">Variable</th>
                    <th className="py-2 font-label-caps text-label-caps text-on-surface">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {ENV_VARS.map((row) => (
                    <tr key={row.name} className="border-b border-outline-variant/60 align-top">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <Code>{row.name}</Code>
                      </td>
                      <td className="py-2">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="firebase-setup" title="Firebase Console Setup">
            <p>One-time setup in the Firebase Console for the project referenced in your <Code>.env</Code>:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>Authentication → Sign-in method</strong>: enable the <strong>Google</strong> and{' '}
                <strong>Phone</strong> providers. Phone sign-in requires the project to be on the{' '}
                <strong>Blaze (pay-as-you-go)</strong> billing plan.
              </li>
              <li>
                <strong>Authentication → Settings → Authorized domains</strong>: make sure your deployed domain
                (<Code>a2zco.netlify.app</Code> and <Code>localhost</Code> for local dev) is listed, or the Google popup will fail.
              </li>
              <li>
                <strong>Realtime Database → Rules</strong>: paste in the contents of{' '}
                <Code>react-app/database.rules.json</Code> and click Publish. Until this is done, every read/write
                from the app fails with "Permission denied" even though the SDK's local cache can make it look like
                it worked in the browser.
              </li>
            </ol>
          </Section>

          <Section id="r2-setup" title="Cloudflare R2 Worker Setup">
            <p>
              Product images are uploaded to **Cloudflare R2** object storage. The upload process runs through a 
              secured, keyless Cloudflare Worker located in the <Code>r2-image-uploader/</Code> directory.
            </p>

            <h3 className="font-semibold text-on-surface mt-4 mb-2">Local Development &amp; Testing</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>Wrangler automatically simulates R2 buckets locally using Miniflare when running dev servers.</li>
              <li>Start the local worker by executing: <Code>cd r2-image-uploader &amp;&amp; npm run dev</Code> (Runs on <Code>http://localhost:8787</Code>).</li>
              <li>Vite React app starts on <Code>http://localhost:5173</Code>. Go to <Code>/super/upload-test</Code> to verify local uploads.</li>
            </ol>

            <h3 className="font-semibold text-on-surface mt-4 mb-2">Cloudflare Bucket Configuration</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>In Cloudflare, go to **R2** &gt; click your bucket **`a2z`** (Bucket ID: `b8ebe9fcc46b4305a85b2ce591f72033`).</li>
              <li>Go to **Settings** &gt; scroll to **Public Access** &gt; enable **R2.dev subdomain** (or custom domain). Copy this public URL.</li>
            </ol>

            <h3 className="font-semibold text-on-surface mt-4 mb-2">Production Live Deployment</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>Register your free subdomain at <a href="https://dash.cloudflare.com/6c94ed9cf1a037967350e4f9374c4b1c/workers/onboarding" target="_blank" rel="noreferrer" className="text-primary hover:underline">Cloudflare Onboarding</a>.</li>
              <li>Deploy the worker: <Code>npx wrangler deploy</Code>.</li>
              <li>Securely bind your public R2 URL in secrets: <Code>npx wrangler secret put R2_PUBLIC_URL</Code> (paste your public bucket URL when prompted).</li>
              <li>In your storefront's <Code>.env</Code> file, set <Code>VITE_IMAGE_UPLOAD_API_URL</Code> to your live worker endpoint.</li>
            </ol>

            <h3 className="font-semibold text-on-surface mt-4 mb-2">Upload Logic &amp; Constraints</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Slots</strong>: Product creation supports uploading **3 to 5 images** in parallel. First image is the primary thumbnail.</li>
              <li><strong>Renaming</strong>: Images are auto-renamed to `{`productId`}_image_{`index`}.{`ext`}`. Filenames are fully editable in the UI before submitting.</li>
              <li><strong>Metadata</strong>: After successful R2 uploads, complete file logs are saved in Firebase RTDB at <Code>fileMetadata/</Code> (tracking sizes, keys, URLs, and timestamps).</li>
            </ul>
          </Section>

          <Section id="view-tracking" title="Product View & Purchase Tracking">
            <p>
              Every product detail page calls <Code>recordView(productId)</Code> on mount
              (<Code>src/services/productStats.js</Code>), which increments{' '}
              <Code>productStats/&#123;productId&#125;/views</Code> in Realtime Database. A{' '}
              <Code>sessionStorage</Code> flag stops the same browser tab from incrementing the same product more
              than once per session. The live count is shown next to the product title as "N people viewed this".
            </p>
            <p>
              When an order is placed (<Code>CartContext.placeOrder</Code>), <Code>recordPurchase</Code> is called
              once per cart line with its quantity, incrementing{' '}
              <Code>productStats/&#123;productId&#125;/purchases</Code>.
            </p>
            <p>
              The homepage "Trending Now" section (<Code>src/components/TrendingProducts.jsx</Code>) subscribes to
              the top 4 products by <Code>views</Code> and by <Code>purchases</Code> and lets shoppers toggle
              between "Most Viewed" and "Best Sellers". It renders nothing until at least one product has a
              non-zero count.
            </p>
          </Section>

          <Section id="rtdb-paths" title="Realtime Database Paths">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="py-2 pr-4 font-label-caps text-label-caps text-on-surface">Path</th>
                    <th className="py-2 pr-4 font-label-caps text-label-caps text-on-surface">Access</th>
                    <th className="py-2 font-label-caps text-label-caps text-on-surface">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {RTDB_PATHS.map((row) => (
                    <tr key={row.path} className="border-b border-outline-variant/60 align-top">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <Code>{row.path}</Code>
                      </td>
                      <td className="py-2 pr-4">{row.access}</td>
                      <td className="py-2">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pre>{`{
  "rules": {
    "productStats": {
      ".read": true,
      "$productId": {
        ".write": true,
        "views": { ".validate": "newData.isNumber() && newData.val() >= 0" },
        "purchases": { ".validate": "newData.isNumber() && newData.val() >= 0" },
        "$other": { ".validate": false }
      }
    },
    "adminProducts": { ".read": "auth != null", ".write": "auth != null" },
    "categories": { ".read": "auth != null", ".write": "auth != null" },
    "settings": { ".read": "auth != null", ".write": "auth != null" },
    ".read": false,
    ".write": false
  }
}`}</Pre>
          </Section>

          <Section id="admin-sections" title="Admin Panel Sections">
            <ul className="space-y-2">
              {ADMIN_SECTIONS.map((item) => (
                <li key={item.to}>
                  <Code>{item.to}</Code> — {item.desc}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="security" title="Security Notes">
            <ul className="list-disc list-inside space-y-2">
              <li>
                "Admin" is a client-side allow-list check (<Code>isAdmin</Code> in <Code>AuthContext</Code>), not a
                Firebase custom claim or a role stored in the database. It gates the React UI, but the database
                rules above only require <Code>auth != null</Code> (any signed-in Google/phone user) for the
                <Code> adminProducts</Code>/<Code>categories</Code>/<Code>settings</Code> paths — a signed-in
                non-admin could still read or write those paths directly via the Firebase SDK/REST API, since RTDB
                rules can't see the <Code>VITE_ADMIN_EMAILS</Code>/<Code>VITE_ADMIN_PHONES</Code> list at runtime.
              </li>
              <li>
                To close that gap, mirror the allow-list into the rules themselves, e.g.{' '}
                <Code>{'"auth != null && (auth.token.email in [\'you@example.com\']'}</Code>{' '}
                <Code>{'|| auth.token.phone_number in [\'+91...\'])"'}</Code> — keep the emails/phones in sync with
                <Code> .env</Code> by hand, since rules are static JSON and can't read environment variables.
              </li>
              <li>
                <Code>productStats</Code> writes are intentionally public (storefront visitors are anonymous by
                design), restricted only to the two numeric counters. Treat these counts as directional, not
                tamper-proof — a script could inflate them.
              </li>
            </ul>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting">
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>"Permission denied" in the console / view counts never change:</strong> the Realtime
                Database rules haven't been published yet — see Firebase Console Setup above.
              </li>
              <li>
                <strong>OTP never arrives:</strong> the Phone provider isn't enabled, or the project isn't on the
                Blaze plan.
              </li>
              <li>
                <strong>Google popup closes immediately / errors:</strong> the current domain isn't in Authorized
                domains under Authentication settings.
              </li>
              <li>
                <strong>Signed in but "Access Denied" on /super:</strong> the account's email/phone isn't in{' '}
                <Code>VITE_ADMIN_EMAILS</Code>/<Code>VITE_ADMIN_PHONES</Code> — add it and restart the dev server
                (Vite only reads <Code>.env</Code> at startup).
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
