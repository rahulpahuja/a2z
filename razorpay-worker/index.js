// Rate limiting here is a best-effort, per-isolate in-memory guard — and a
// weak one in practice. Cloudflare frequently serves requests (even from the
// same IP, seconds apart) from a fresh isolate with empty memory, so this
// counter often never accumulates enough to trip. It's cheap defense-in-depth
// against a single hot isolate getting hammered, but it is NOT a reliable
// rate limiter and NOT a substitute for real DDoS protection. For actual
// enforcement, use Cloudflare's Rate Limiting Rules (dashboard/WAF) in front
// of this Worker, or a Durable Object-backed counter if you need it in code.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
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

const MAX_BODY_BYTES = 10_000;

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

const MIN_AMOUNT_PAISE = 100; // ₹1
const MAX_AMOUNT_PAISE = 100_000_000; // ₹10,00,000

function sanitizeReceipt(receipt) {
  // Razorpay caps `receipt` at 40 characters, so the fallback must fit too.
  const fallback = `rcpt_${Date.now()}`;
  if (typeof receipt !== "string") return fallback;
  const cleaned = receipt.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  return cleaned || fallback;
}

async function createOrder(request, env, corsHeaders) {
  const body = await readJsonBody(request);

  if (!body || typeof body.amount !== "number") {
    return new Response(JSON.stringify({ error: "amount (in paise) is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { amount, currency = "INR", receipt } = body;

  if (currency !== "INR") {
    return new Response(JSON.stringify({ error: "Only INR is supported." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!Number.isFinite(amount) || amount < MIN_AMOUNT_PAISE || amount > MAX_AMOUNT_PAISE) {
    return new Response(
      JSON.stringify({ error: "amount must be between ₹1 and ₹10,00,000" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return new Response(JSON.stringify({ error: "Razorpay credentials are not configured on the server." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);

  const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount),
      currency,
      receipt: sanitizeReceipt(receipt),
    }),
  });

  const data = await razorpayRes.json();

  if (!razorpayRes.ok) {
    const status = razorpayRes.status === 401 ? 401 : 500;
    return new Response(
      JSON.stringify({ error: data?.error?.description || "Razorpay order creation failed." }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ order_id: data.id, amount: data.amount, currency: data.currency }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function hmacSha256Hex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidRazorpayId(value, maxLength) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

async function verifyPayment(request, env, corsHeaders) {
  const body = await readJsonBody(request);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

  if (
    !isValidRazorpayId(razorpay_order_id, 64) ||
    !isValidRazorpayId(razorpay_payment_id, 64) ||
    !isValidRazorpayId(razorpay_signature, 128)
  ) {
    return new Response(JSON.stringify({ success: false, error: "Missing or invalid required fields." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!env.RAZORPAY_KEY_SECRET) {
    return new Response(
      JSON.stringify({ success: false, error: "Razorpay credentials are not configured on the server." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const expectedSignature = await hmacSha256Hex(
    env.RAZORPAY_KEY_SECRET,
    `${razorpay_order_id}|${razorpay_payment_id}`
  );

  if (expectedSignature !== razorpay_signature) {
    return new Response(JSON.stringify({ success: false, error: "Signature mismatch." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const isKnownRoute =
      request.method === "POST" && (url.pathname === "/create-order" || url.pathname === "/verify-payment");

    if (isKnownRoute) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      if (isRateLimited(ip)) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        });
      }
    }

    if (request.method === "POST" && url.pathname === "/create-order") {
      try {
        return await createOrder(request, env, corsHeaders);
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: err.status || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (request.method === "POST" && url.pathname === "/verify-payment") {
      try {
        return await verifyPayment(request, env, corsHeaders);
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: err.status || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
