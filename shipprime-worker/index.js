// Rate limiting here is a best-effort, per-isolate in-memory guard — see the
// same caveat in razorpay-worker/index.js. Not a substitute for real DDoS
// protection; use Cloudflare Rate Limiting Rules for that.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestLog = new Map(); // ip -> recent request timestamps

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return false;
}

const MAX_BODY_BYTES = 50_000;

async function readJsonBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    const err = new Error("Request body too large.");
    err.status = 413;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function checkAppKey(request, env) {
  return Boolean(env.APP_SHARED_KEY) && request.headers.get("x-app-key") === env.APP_SHARED_KEY;
}

async function shipprimeFetch(env, path, options) {
  const res = await fetch(`${env.SHIPPRIME_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${env.SHIPPRIME_API_TOKEN}`,
    },
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

// Whitelist of fields ShipPrime's create-forward endpoint accepts, so the
// frontend can't smuggle extra/unexpected fields through this proxy.
function sanitizeAddress(addr) {
  if (!addr || typeof addr !== "object") return null;
  const { name, phone, address1, address2, city, state, pincode, country } = addr;
  return { name, phone, address1, address2, city, state, pincode, country };
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 50).map((i) => ({
    name: i?.name,
    sku: i?.sku,
    quantity: i?.quantity,
    price: i?.price,
    hsnCode: i?.hsnCode,
    imageUrl: i?.imageUrl,
  }));
}

async function createForward(request, env, corsHeaders) {
  const body = await readJsonBody(request);
  if (!body) return jsonResponse({ error: "Invalid JSON body." }, 400, corsHeaders);

  const payload = {
    clientReferenceId: body.clientReferenceId,
    paymentMethod: body.paymentMethod,
    collectibleAmount: body.collectibleAmount,
    weightGrams: body.weightGrams,
    declaredValue: body.declaredValue,
    preferredTpls: Array.isArray(body.preferredTpls) ? body.preferredTpls : undefined,
    items: sanitizeItems(body.items),
    pickupAddress: sanitizeAddress(body.pickupAddress),
    deliveryAddress: sanitizeAddress(body.deliveryAddress),
  };

  if (!payload.clientReferenceId || !payload.pickupAddress || !payload.deliveryAddress || payload.items.length === 0) {
    return jsonResponse({ error: "Missing required shipment fields." }, 400, corsHeaders);
  }

  const { ok, status, data } = await shipprimeFetch(env, "/v1/forward", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return jsonResponse(data ?? { error: "ShipPrime returned an invalid response." }, ok ? status : status || 502, corsHeaders);
}

async function trackForward(request, env, corsHeaders) {
  const url = new URL(request.url);
  const awb = url.searchParams.get("awb");
  if (!awb) return jsonResponse({ error: "awb query param is required." }, 400, corsHeaders);

  const { ok, status, data } = await shipprimeFetch(
    env,
    `/v1/forward/track?awbs=${encodeURIComponent(awb)}`,
    { method: "GET" }
  );

  return jsonResponse(data ?? { error: "ShipPrime returned an invalid response." }, ok ? status : status || 502, corsHeaders);
}

async function cancelForward(awb, env, corsHeaders) {
  if (!awb) return jsonResponse({ error: "awb path segment is required." }, 400, corsHeaders);

  const { ok, status, data } = await shipprimeFetch(env, `/v1/forward/${encodeURIComponent(awb)}/cancel`, {
    method: "POST",
  });

  return jsonResponse(data ?? { error: "ShipPrime returned an invalid response." }, ok ? status : status || 502, corsHeaders);
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-app-key",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const isForwardCreate = request.method === "POST" && url.pathname === "/forward/create";
    const isForwardTrack = request.method === "GET" && url.pathname === "/forward/track";
    const cancelMatch = request.method === "POST" && url.pathname.match(/^\/forward\/([^/]+)\/cancel$/);

    if (!isForwardCreate && !isForwardTrack && !cancelMatch) {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    if (!checkAppKey(request, env)) {
      return jsonResponse({ error: "Unauthorized." }, 401, corsHeaders);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) {
      return jsonResponse({ error: "Too many requests. Please try again shortly." }, 429, corsHeaders);
    }

    if (!env.SHIPPRIME_API_TOKEN || !env.SHIPPRIME_BASE_URL) {
      return jsonResponse({ error: "ShipPrime credentials are not configured on the server." }, 500, corsHeaders);
    }

    try {
      if (isForwardCreate) return await createForward(request, env, corsHeaders);
      if (isForwardTrack) return await trackForward(request, env, corsHeaders);
      return await cancelForward(decodeURIComponent(cancelMatch[1]), env, corsHeaders);
    } catch (err) {
      return jsonResponse({ error: err.message }, err.status || 500, corsHeaders);
    }
  },
};
