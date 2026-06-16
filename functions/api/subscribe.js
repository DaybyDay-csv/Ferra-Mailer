// Cloudflare Pages Function — POST /api/subscribe
// Validates Turnstile token, stores email in KV, returns JSON.

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function isValidEmail(email) {
  return typeof email === "string"
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyTurnstile(token, ip, secret) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}

export async function onRequestPost({ request, env }) {
  if (!env.SUBSCRIBERS) {
    return jsonResponse({ ok: false, error: "storage_unconfigured" }, 500);
  }
  if (!env.TURNSTILE_SECRET) {
    return jsonResponse({ ok: false, error: "turnstile_unconfigured" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "bad_json" }, 400);
  }

  const email = (body?.email || "").trim().toLowerCase();
  const token = body?.turnstileToken || "";
  const honeypot = (body?.company || "").trim();

  if (honeypot) return jsonResponse({ ok: false, error: "spam" }, 400);
  if (!isValidEmail(email)) return jsonResponse({ ok: false, error: "invalid_email" }, 400);
  if (!token) return jsonResponse({ ok: false, error: "missing_turnstile" }, 400);

  const ip = request.headers.get("cf-connecting-ip") || "";
  const ok = await verifyTurnstile(token, ip, env.TURNSTILE_SECRET);
  if (!ok) return jsonResponse({ ok: false, error: "turnstile" }, 400);

  const key = `sub:${email}`;
  const existing = await env.SUBSCRIBERS.get(key);
  if (existing) return jsonResponse({ ok: true, error: "duplicate" });

  const record = {
    email,
    createdAt: new Date().toISOString(),
    ip: ip || null,
    ua: request.headers.get("user-agent") || null,
    country: request.cf?.country || null,
  };
  await env.SUBSCRIBERS.put(key, JSON.stringify(record));
  await env.SUBSCRIBERS.put(
    "meta:count",
    String(Number(await env.SUBSCRIBERS.get("meta:count") || 0) + 1)
  );

  return jsonResponse({ ok: true });
}

export async function onRequestGet() {
  return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
}
