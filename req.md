# Requirements Backlog

## NSFW safety (not started — deferred 2026-08-12)

Add NSFW/content-safety protection to the site. Scope not yet decided — candidates identified so far:

- **AI Studio prompt/image filtering** (`/super/ai-studio`, `src/pages/AIStudioPage.jsx`): admin types a free-text prompt that's sent directly to `image.pollinations.ai` (an open text-to-image API with no built-in content filter). The generated image can be merged into a product background and published to the storefront. No prompt or output filtering exists today.
- **Product image uploads** (`src/pages/admin/AdminProductsPage.jsx`): admins upload product photos directly; no content check before save/publish.
- Other areas: TBD — revisit with user.

Next step: confirm scope with user, then decide on approach (e.g. prompt keyword/moderation-API check before generation, image classification on the result before it can be saved/published).
