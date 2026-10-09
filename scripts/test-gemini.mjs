// Checks every Gemini key in .env.local, once through raw REST and once through
// the same SDK the app uses. Never prints a key, only its format and length.
//
// Run from the project root:   node scripts/test-gemini.mjs
// Test another env file:       node scripts/test-gemini.mjs path\to\file
import { readFileSync } from "node:fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = "Reply with the single word: ok";
const TIMEOUT_MS = 20_000;

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

let env;
const envPath = process.argv[2] ?? ".env.local";
try {
  env = loadEnv(envPath);
} catch {
  console.error(`Could not read ${envPath}. Run this from the project root.`);
  process.exit(1);
}

const model = (env.GEMINI_MODEL || "gemini-2.5-flash").trim();
const keys = [
  { label: 1, name: "GOOGLE_GEMINI_API_KEY", key: env.GOOGLE_GEMINI_API_KEY },
  { label: 2, name: "GOOGLE_GEMINI_API_KEY_2", key: env.GOOGLE_GEMINI_API_KEY_2 },
];

const formatOf = (k) =>
  k.startsWith("AQ.") ? "AQ. (new format)" : k.startsWith("AIza") ? "AIza (old format)" : "unrecognized format";

async function testRest(key) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }] }] }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    if (res.ok) return { ok: true, detail: "HTTP 200" };
    const body = await res.json().catch(() => ({}));
    const msg = String(body?.error?.message ?? "").slice(0, 140);
    return { ok: false, detail: `HTTP ${res.status} ${body?.error?.status ?? ""} ${msg}`.trim() };
  } catch (e) {
    return { ok: false, detail: `network error: ${e.message}` };
  }
}

async function testSdk(key) {
  try {
    const m = new GoogleGenerativeAI(key).getGenerativeModel({ model });
    const r = await m.generateContent(PROMPT, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    r.response.text();
    return { ok: true, detail: "ok" };
  } catch (e) {
    return { ok: false, detail: `status ${e.status ?? "n/a"}: ${String(e.message).slice(-140)}` };
  }
}

console.log(`Model: ${model}\n`);
const healthy = [];

for (const { label, name, key } of keys) {
  if (!key) {
    console.log(`Key ${label} (${name}): not set\n`);
    continue;
  }
  const [rest, sdk] = await Promise.all([testRest(key), testSdk(key)]);
  console.log(`Key ${label} (${name}): ${formatOf(key)}, length ${key.length}`);
  console.log(`  REST: ${rest.ok ? "PASS" : "FAIL"}  ${rest.detail}`);
  console.log(`  SDK : ${sdk.ok ? "PASS" : "FAIL"}  ${sdk.detail}`);
  if (rest.ok && sdk.ok) {
    healthy.push(label);
    console.log("  Verdict: works with the app.\n");
  } else if (rest.ok && !sdk.ok) {
    console.log("  Verdict: key is valid but the SDK rejects it. Migrate lib/gemini.js to @google/genai.\n");
  } else if (rest.detail.startsWith("HTTP 404")) {
    console.log(`  Verdict: the key is accepted, but ${model} is not available to it. Change GEMINI_MODEL.\n`);
  } else if (rest.detail.startsWith("network error")) {
    console.log("  Verdict: could not reach Google. Check your internet connection and try again.\n");
  } else {
    console.log("  Verdict: the key itself is rejected. See the reason above.\n");
  }
}

if (healthy.length === 2) console.log("Failover is ready: both keys work.");
else if (healthy.length === 1) console.log(`Only key ${healthy[0]} works, so there is no failover yet.`);
else console.log("No working keys. Scans will use the fallback advisory.");
process.exit(healthy.length ? 0 : 1);
