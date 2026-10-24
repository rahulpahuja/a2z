// Drafts blog article text with an AI model, for the super user's editor. This is the only place a model
// is called, so the API key never reaches the browser.
//
// - Only a signed-in super user may call it: the caller's Firebase ID token is verified and must carry the
//   `admin` claim.
// - Without ANTHROPIC_API_KEY it answers 503 `ai_not_configured` and does nothing: the editor works fully
//   by hand, and no request ever leaves the server.
// - Product facts are read from the catalogue here, never taken from the request, so the model is only
//   given verified data.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { buildAiPrompt, MAX_AI_PRODUCTS, parseAiResponse, productFacts } from '../../src/utils/blog/ai.js';
import { isBlogType } from '../../src/utils/blog/types.js';

const MAX_BODY_BYTES = 24 * 1024;
const ID_PATTERN = /^[\w-]{1,128}$/;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const rateBuckets = new Map();
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function isRateLimited(key, now = Date.now()) {
  if (rateBuckets.size > 1000) rateBuckets.clear();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

function getFirebaseAuth() {
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  return getAuth();
}

async function readRtdb(path) {
  const base = process.env.VITE_FIREBASE_DATABASE_URL;
  if (!base) throw new Error('database_url_missing');
  const res = await fetch(`${base.replace(/\/$/, '')}/${path}.json`);
  if (!res.ok) throw new Error(`rtdb_${res.status}`);
  return res.json();
}

const asText = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

// Validates the request body; returns { ok, value } or { ok: false, error }.
export function parseRequest(raw) {
  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request' };
  const productIds = Array.isArray(body.productIds) ? [...new Set(body.productIds.map(String))].filter((id) => ID_PATTERN.test(id)) : [];
  if (productIds.length > MAX_AI_PRODUCTS) return { ok: false, error: `Choose at most ${MAX_AI_PRODUCTS} products.` };
  const collectionId = body.collectionId ? String(body.collectionId) : '';
  if (collectionId && !ID_PATTERN.test(collectionId)) return { ok: false, error: 'Invalid collection' };
  const section = body.section && typeof body.section === 'object' ? { heading: asText(body.section.heading, 160), index: Number(body.section.index) || 0 } : null;
  return {
    ok: true,
    value: {
      type: isBlogType(body.type) ? body.type : 'general',
      topic: asText(body.topic, 300),
      audience: asText(body.audience, 200),
      tone: asText(body.tone, 60),
      length: asText(body.length, 10),
      language: asText(body.language, 40),
      instructions: asText(body.instructions, 1500),
      currentText: asText(body.currentText, 6000),
      productIds,
      collectionId,
      section,
    },
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const headers = event.headers || {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(503, { error: 'ai_not_configured', message: 'AI drafting is not set up. Write the article by hand, or ask the site owner to add an API key.' });

  const rawBody = event.body || '';
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) return json(413, { error: 'Request too large' });

  const bearer = String(headers.authorization || headers.Authorization || '');
  const idToken = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
  if (!idToken) return json(401, { error: 'Sign in required' });
  let claims;
  try {
    claims = await getFirebaseAuth().verifyIdToken(idToken);
  } catch {
    return json(401, { error: 'Sign in required' });
  }
  if (claims.admin !== true) return json(403, { error: 'Only the site owner can use AI drafting' });
  if (isRateLimited(claims.uid)) return json(429, { error: 'Too many requests. Please wait a few minutes.' });

  const parsed = parseRequest(rawBody);
  if (!parsed.ok) return json(400, { error: parsed.error });
  const request = parsed.value;

  try {
    const products = [];
    for (const id of request.productIds) {
      const product = await readRtdb(`adminProducts/${encodeURIComponent(id)}`);
      if (product) products.push(productFacts({ id, ...product }));
    }
    let collection = null;
    if (request.collectionId) {
      const c = await readRtdb(`collections/${encodeURIComponent(request.collectionId)}`);
      if (c?.published) collection = { name: c.name, description: '' };
    }

    const { system, user } = buildAiPrompt({ ...request, products, collection });
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.BLOG_AI_MODEL || 'claude-sonnet-5-5', max_tokens: 4096, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!response.ok) {
      console.error('blog-ai-draft: provider returned', response.status);
      return json(502, { error: 'The AI service could not complete the draft. Please try again.' });
    }
    const data = await response.json();
    const text = (data.content ?? []).filter((part) => part.type === 'text').map((part) => part.text).join('');
    const draft = parseAiResponse(text, products.map((p) => p.id));
    if (!draft) return json(502, { error: 'The AI reply could not be read. Please try again.' });
    return json(200, { draft, usedProducts: products.length });
  } catch (error) {
    console.error('blog-ai-draft failed', error?.message);
    return json(500, { error: 'Could not generate a draft.' });
  }
};
