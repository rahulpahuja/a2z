# MSG91 SMS OTP Login (End Users)

Storefront login supports phone-number OTP verification via the [MSG91 OTP Widget](https://docs.msg91.com/otp-widget), integrated in `exposeMethods` mode so the widget never shows its own popup — our existing custom UI in `AuthModal.jsx` drives it end to end.

This covers **end-user login only** (`AuthModal.jsx` / `ProfileButton.jsx`). Admin (`/super/*`) auth is a separate, currently-bypassed path (`RequireAdmin.jsx`) and is untouched by this change.

## Files

| File | Role |
| --- | --- |
| `src/services/msg91Otp.js` | Loads the MSG91 widget script and wraps `sendOtp` / `retryOtp` / `verifyOtp` / `getWidgetData` / `isCaptchaVerified` as promises. |
| `src/context/AuthContext.jsx` | Routes the phone-OTP login flow through MSG91 when configured; persists the verified session in `localStorage`. |
| `src/components/AuthModal.jsx` | Sign-in UI — phone number entry, OTP entry, resend. |

## Setup

Get a **Widget ID** and **Token Auth** from your MSG91 dashboard (OTP → Widget), then set:

```bash
# .env
VITE_MSG91_WIDGET_ID=your_widget_id
VITE_MSG91_TOKEN_AUTH=your_token_auth
```

Restart `npm run dev` after changing `.env`.

Leave both blank to keep MSG91 disabled — the app falls back to the previous behavior:
- Firebase Phone Auth, if Firebase is configured (`VITE_FIREBASE_*` set), or
- a local mock flow (any of `123456` / `111111` / `000000` accepted as the code) when nothing is configured, for local development without real credentials.

`isMsg91Enabled` (exported from `msg91Otp.js`, and from `useAuth()`) is `true` only when both env vars are set.

## How it works

1. **Send OTP** — `AuthModal` calls `useAuth().sendOtp('+91XXXXXXXXXX', containerId)`.
   `AuthContext` strips the leading `+` and calls `msg91Otp.sendOtp(identifier, containerId)`, which lazily injects the widget script (`https://verify.msg91.com/otp-provider.js`), calls `initSendOTP(...)`, then `window.sendOtp(...)`. The returned `reqId` is cached internally by the module.
2. **Resend OTP** — the "Resend code" button (shown only when MSG91 is enabled) calls `useAuth().retryOtp(channel)`, which wraps `window.retryOtp`, reusing the cached `reqId`.
3. **Verify OTP** — submitting the code calls `useAuth().confirmOtp(code)`, which wraps `window.verifyOtp`. On success, `AuthContext` writes a session object to `localStorage` (key `a2z_msg91_session`, 12-hour TTL) and sets the in-memory `user`.
4. **Session restore** — on mount, `AuthContext` reads that `localStorage` session (if unexpired) and restores `user` from it, so a page refresh doesn't log the user out. This restore is guarded so Firebase's initial (async) `onAuthStateChanged(null)` callback can't clobber a live MSG91 session.
5. **Sign out** — `signOutUser()` clears the MSG91 `localStorage` session in addition to any Firebase sign-out.

The captcha container id (`OTP_WIDGET_CONTAINER_ID` in `OtpCaptchaHost.jsx`, currently `a2z-otp-captcha`) doubles as both the Firebase `RecaptchaVerifier` container and MSG91's `captchaRenderId` — only one is active at a time depending on which provider handled `sendOtp`.

**Never name that container `otp-widget-container`.** MSG91's `otp-provider.js` checks for an element with that exact id when it loads and, if present, calls `initSendOTP` itself with its own demo widget (`exposeMethods: false`, no captcha container). That extra init runs before ours, breaks the captcha (blank checkbox, "Failed to load widget" after the modal is reopened) and can bind `window.sendOtp` to the wrong widget.

## `src/services/msg91Otp.js` API

```js
isMsg91Enabled // boolean — true when VITE_MSG91_WIDGET_ID and VITE_MSG91_TOKEN_AUTH are both set

loadMsg91Widget({ captchaRenderId } = {}) // Promise<void> — injects the script + initSendOTP once; memoized
sendOtp(identifier, captchaRenderId)     // Promise<data> — identifier = phone/email, no leading '+'
retryOtp(channel = null, reqId)          // Promise<data> — channel: null default | '11' SMS | '4' Voice | '3' Email | '12' WhatsApp
verifyOtp(otp, reqId)                    // Promise<data>
getWidgetData()                          // widget's current configured data, or null
isCaptchaVerified()                      // boolean
getLastReqId()                           // string | null — the reqId cached from the last sendOtp
resetOtpSession()                        // clears the cached reqId (call when the user restarts the flow)
```

`reqId` defaults to the value cached by the last `sendOtp()` call, so most callers don't need to pass it explicitly — it's only relevant if you're running more than one OTP verification concurrently in the same session.

## Troubleshooting

- **`window.sendOtp is not a function`** — MSG91's widget attaches `sendOtp`/`retryOtp`/`verifyOtp` to `window` asynchronously after `initSendOTP()` runs; there's no ready-callback for it. `msg91Otp.js` polls for up to 15s after calling `initSendOTP` before resolving, and calls `initSendOTP` **at most once per page load** — retrying it (e.g. after a timeout) re-renders the widget's captcha into an already-rendered container, which breaks `hCaptcha` and leaves `window.sendOtp` undefined (you'll also see a `hCaptcha was already rendered. You may want to call 'reset()' first.` console warning when this happens). If you still hit this after the fix, do a hard refresh/restart of the dev server and check that `VITE_MSG91_WIDGET_ID`/`VITE_MSG91_TOKEN_AUTH` are correct and that `verify.msg91.com` isn't blocked (ad blocker/network).

## Notes / limitations

- The `user` object in the UI is still a lightweight local record (`{ uid: 'msg91:<identifier>', phoneNumber, provider: 'msg91' }`). Separately, after OTP verification the app asks `netlify/functions/exchange-token` for a Firebase custom token (see "Customer identity" below).
- Only phone-number SMS OTP is wired into the UI. The MSG91 widget also supports email OTP and WhatsApp/voice retry channels — the service module supports these (`identifier` can be an email; `retryOtp` accepts a channel), but `AuthModal.jsx` only exposes the phone + SMS path today.
- Super-user/admin login (`/super/*`) is unaffected — `RequireAdmin.jsx` currently bypasses auth entirely and was intentionally left alone.

## Customer identity (cross-device "My orders")

`netlify/functions/exchange-token.js` verifies the MSG91 access token server-side and takes the phone number **only** from MSG91's response (a `phoneNumber` in the request body is ignored). It then mints a Firebase custom token:

| Verified phone | uid | claims |
| --- | --- | --- |
| in `ADMIN_PHONES` | `msg91:<digits>` | `{ admin: true }` (unchanged) |
| anyone else | `c_` + first 32 chars of base64url(HMAC-SHA256(`CUSTOMER_UID_SECRET`, `a2z-customer-v1:` + phone)) | `{ customer: true }` |

Netlify environment variables (server-side only, never `VITE_*`): `MSG91_AUTH_KEY`, `ADMIN_PHONES`, `FIREBASE_SERVICE_ACCOUNT` (existing) and `CUSTOMER_UID_SECRET` (new; at least 16 random characters, e.g. `openssl rand -base64 32`). While `CUSTOMER_UID_SECRET` is unset, customers get a 503 and the storefront behaves as before (per-browser "My orders"); admin sign-in is unaffected. **Do not rotate or lose the secret** once customers have orders: the uid changes and old orders stop appearing in "My orders" on the owner query (they remain reachable by order id).

`AuthContext` signs the customer in with that token after OTP verification (failure never blocks login for customers; for admins it does). Orders placed while signed in carry `ownerUid` (= the Firebase uid). `database.rules.json` lets a signed-in user list `orders` only through `orderBy="ownerUid"&equalTo=<their uid>` (indexed); `ownerUid` must equal the creator's uid on create and cannot be changed afterwards by non-admins. `subscribeToMyOrders` / `hasPriorOrders` use that query and merge in the orders remembered in this browser (`a2z_my_order_ids`) for ones placed as a guest or before login.

Privacy: the uid cannot be reversed to a phone number without `CUSTOMER_UID_SECRET`, but it is stable per phone, so it links all of one customer's orders. Because a single order is readable by anyone who knows its id (order tracking), `ownerUid` is visible to whoever holds that order link; it reveals nothing beyond "these orders share an owner".

Verify the rules with `node scripts/check-orders-rules.mjs` (needs the cached Realtime Database emulator JAR and Java).
