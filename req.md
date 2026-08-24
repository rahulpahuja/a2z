# Requirements Backlog

## NSFW safety (not started — deferred 2026-08-12)

Add NSFW/content-safety protection to the site. Scope not yet decided — candidates identified so far:

- **AI Studio prompt/image filtering** (`/super/ai-studio`, `src/pages/AIStudioPage.jsx`): admin types a free-text prompt that's sent directly to `image.pollinations.ai` (an open text-to-image API with no built-in content filter). The generated image can be merged into a product background and published to the storefront. No prompt or output filtering exists today.
- **Product image uploads** (`src/pages/admin/AdminProductsPage.jsx`): admins upload product photos directly; no content check before save/publish.
- Other areas: TBD — revisit with user.

Next step: confirm scope with user, then decide on approach (e.g. prompt keyword/moderation-API check before generation, image classification on the result before it can be saved/published).

## Admin data is only gated client-side, not by Firebase rules (not started — noted 2026-08-24)

Every `/super/*` admin page (Products, Sales, Local Billing, Referrers, Categories, Collections, Settings, etc.) is protected by `RequireAdmin` (`src/components/RequireAdmin.jsx`), which checks `isAdmin` computed client-side from the `VITE_ADMIN_EMAILS` whitelist. That's UI-level only — the actual Firebase Realtime Database write rules (`database.rules.json`) for the data these pages read/write (`adminProducts`, `categories`, `collections`, `subcategories`, `settings`, `referrers`) just require `auth != null`, i.e. **any logged-in user**, not specifically an admin. `orders/$orderId` is even more open — write is `true` with no auth check at all (needed for guest checkout, but also means anyone can write/overwrite any order, including local-billing bills).

This is pre-existing across the whole admin panel, not introduced by any single feature — flagged now because the new Local Billing page (`/super/local-billing`) surfaced it.

Next step: decide whether to enforce real admin-only writes server-side, e.g. via Firebase custom claims checked in the rules (`auth.token.admin === true`) instead of (or in addition to) the client-side email whitelist, and tighten `orders` writes to require ownership/auth where guest checkout allows.
