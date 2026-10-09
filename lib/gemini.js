import { GoogleGenerativeAI } from "@google/generative-ai";

// Model comes from an env var so a model swap (e.g. when Google retires
// gemini-2.5-flash) is a Vercel setting plus a redeploy, not a code change.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// Gemini 3.x models think at "medium" by default, which can push this long,
// rule heavy prompt past the 25 second timeout and drop the scan into the
// fallback advisory. The advisory is rule following, not deep reasoning, so
// "low" is enough. The SDK's types do not list this field, but it sends
// generationConfig to the API unchanged. Only applied to Gemini 3.x: older
// models use thinkingBudget instead and would reject thinkingLevel.
const THINKING_LEVEL = "low";
const GENERATION_CONFIG = MODEL.startsWith("gemini-3")
  ? { thinkingConfig: { thinkingLevel: THINKING_LEVEL } }
  : undefined;

// After a key fails, try it last for this long. Warm serverless instances
// remember this, which saves a wasted round trip on every scan while a key
// is rate limited. It is best effort only: a cold start simply resets it.
const COOLDOWN_MS = 60_000;

// Do not start a second attempt unless this much of the shared time budget remains.
const MIN_RETRY_BUDGET_MS = 5_000;

const FAILOVER_STATUSES = new Set([401, 403, 429, 500, 503]);
const cooldownUntil = new Map();

// Primary key first. The second key is optional, so with only one key set
// this behaves exactly like the old single-key code.
function getKeys() {
  return [
    { label: 1, key: process.env.GOOGLE_GEMINI_API_KEY?.trim() },
    { label: 2, key: process.env.GOOGLE_GEMINI_API_KEY_2?.trim() },
  ].filter((k) => k.key);
}

function shouldFailover(err) {
  if (FAILOVER_STATUSES.has(err?.status)) return true;
  return /api key not valid|quota|resource_exhausted|overloaded/i.test(err?.message ?? "");
}

/**
 * Generates text with automatic failover between up to two Gemini API keys.
 * Both attempts share ONE timeout budget, so a slow failure on key 1 cannot
 * push the request past the client's 45 second limit (PRD F3.8).
 * Throws if every attempt fails; the caller owns the fallback advisory.
 * Key values are never logged, only their label (1 or 2).
 */
export async function generateText(prompt, { timeoutMs = 25_000 } = {}) {
  const keys = getKeys();
  if (keys.length === 0) throw new Error("No Gemini API key is configured.");

  // Keys not cooling down go first. Cooling keys are still tried last so a
  // stale cooldown can never block a scan outright.
  const now = Date.now();
  const ordered = [...keys].sort(
    (a, b) =>
      ((cooldownUntil.get(a.label) ?? 0) > now) - ((cooldownUntil.get(b.label) ?? 0) > now)
  );

  const deadline = now + timeoutMs;
  let lastErr;

  for (let i = 0; i < ordered.length; i++) {
    const { label, key } = ordered[i];
    const remaining = deadline - Date.now();
    if (i > 0 && remaining < MIN_RETRY_BUDGET_MS) break;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const model = new GoogleGenerativeAI(key).getGenerativeModel({
        model: MODEL,
        generationConfig: GENERATION_CONFIG,
      });
      const result = await model.generateContent(prompt, { signal: controller.signal });
      return result.response.text();
    } catch (err) {
      lastErr = err;
      // Timeouts and bad prompts will not be fixed by another key, so stop.
      if (err?.name === "AbortError" || !shouldFailover(err)) throw err;
      cooldownUntil.set(label, Date.now() + COOLDOWN_MS);
      console.warn(
        `Gemini key ${label} failed (status ${err?.status ?? "n/a"}).`,
        i + 1 < ordered.length ? "Trying next key." : "No keys left."
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr;
}