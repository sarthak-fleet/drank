/**
 * SaaS Maker auth for drank's GitHub Action.
 *
 * "Working auth at the very least": read a token from the environment (a GH
 * secret) and prove it works against the LIVE api.sassmaker.com. drank itself is
 * 100% client-side and needs none of this — only the scheduled Action that
 * publishes the global DR snapshot authenticates, to later POST /v1/events.
 *
 * Run `node scripts/saasmaker.mjs verify` to check the token end-to-end.
 */

const DEFAULT_BASE = "https://api.sassmaker.com";

/** Token from env (set as a GitHub Actions secret). */
export function resolveToken() {
  return process.env.SAASMAKER_TOKEN || process.env.SAASMAKER_SESSION_TOKEN || null;
}

export function resolveBase() {
  return process.env.SAASMAKER_BASE_URL || DEFAULT_BASE;
}

/** Confirm the token works by listing the caller's projects. */
export async function verifyAuth(token = resolveToken(), base = resolveBase()) {
  if (!token) return { ok: false, status: 0, projects: [] };
  const res = await fetch(`${base.replace(/\/+$/, "")}/v1/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, status: res.status, projects: [] };
  const body = await res.json().catch(() => ({}));
  const arr = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  return {
    ok: true,
    status: res.status,
    projects: arr.map((p) => ({ id: p.id, slug: p.slug ?? null, name: p.name })),
  };
}

/** Authenticated POST helper for the snapshot push (used by update-global-dr.mjs). */
export async function postJson(path, payload, token = resolveToken(), base = resolveBase()) {
  if (!token) throw new Error("no SaaS Maker token configured (set SAASMAKER_TOKEN)");
  const res = await fetch(`${base.replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${path} ${res.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// `node scripts/saasmaker.mjs verify` — CLI self-check.
if (process.argv[2] === "verify") {
  if (!resolveToken()) {
    console.log("Not connected. Set SAASMAKER_TOKEN (a GitHub secret) to enable hub push.");
    process.exit(0);
  }
  const v = await verifyAuth();
  if (v.ok) console.log(`✓ Connected to SaaS Maker — ${v.projects.length} project(s) visible.`);
  else {
    console.error(`Auth check failed (status ${v.status}). Token may be invalid.`);
    process.exit(1);
  }
}
