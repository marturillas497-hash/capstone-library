import { GoogleGenerativeAI } from "@google/generative-ai";

// Primary model comes from an env var so a model swap is a Vercel setting
// plus a redeploy, not a code change.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// Optional. A second model tried when the primary keeps failing. Leave it
// unset to retry the primary only. A 503 means the MODEL is overloaded, so
// alternating models gives the retry a chance to land on free capacity.
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL?.trim() || "";

// Gemini 3.x models think at "medium" by default, which can push this long,
// rule heavy prompt past the timeout and drop the scan into the fallback
// advisory. "low" is enough for rule following. The SDK's types do not list
// this field, but it sends generationConfig to the API unchanged. Only for
// 3.x: older models use thinkingBudget and would reject thinkingLevel.
function configFor(model) {
  return model.startsWith("gemini-3")
    ? { thinkingConfig: { thinkingLevel: "low" } }
    : undefined;
}

const MAX_ATTEMPTS = 6;
const BASE_BACKOFF_MS = 1000; // waits about 1s, 2s, 4s, then 6s between overload retries
const MAX_BACKOFF_MS = 6000; // cap so a long spike does not eat the whole budget in one sleep
const ATTEMPT_TIMEOUT_MS = 22_000; // one call may not hold the whole budget, so a hang can fail over
// Must stay BELOW (total budget - ATTEMPT_TIMEOUT_MS), or a single timed out
// attempt would leave too little time and end the retries on the spot.
const MIN_RETRY_BUDGET_MS = 8_000;

// 429 (rate limit or quota) is retryable: limits clear with time and quotas are
// per model. A rejected key (401/403, "api key not valid") is NOT, with one key
// there is nothing to switch to, so it throws at once.
const RETRYABLE_STATUSES = new Set([404, 429, 500, 502, 503, 504]);
const RETRYABLE_MESSAGE =
  /quota|resource_exhausted|overloaded|fetch failed|network|econnreset|etimedout|socket/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(err) {
  return RETRYABLE_STATUSES.has(err?.status) || RETRYABLE_MESSAGE.test(err?.message ?? "");
}

/**
 * Generates text, retrying before the caller has to use its fallback advisory.
 *
 * - Overload, rate limit or network errors (429/500/502/503/504): wait with
 *   exponential backoff, then try again, alternating primary and fallback model.
 * - Timeout (no answer within ATTEMPT_TIMEOUT_MS): give up on that call and move
 *   to the next model at once, no backoff since time was already spent.
 * - Unknown model (404): skip that model and move on.
 * - Anything else (bad prompt, safety block, rejected key): throw immediately,
 *   retrying cannot fix it.
 *
 * Every attempt shares ONE time budget (timeoutMs), so retries can never push
 * the request past the client's 45 second limit (PRD F3.8). At most
 * MAX_ATTEMPTS calls are made, and a scan that succeeds first try makes
 * exactly one call. Throws if everything fails; the caller owns the fallback
 * advisory. The key is never logged.
 */
export async function generateText(prompt, { timeoutMs = 34_000 } = {}) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("No Gemini API key is configured.");

  const deadline = Date.now() + timeoutMs;
  const client = new GoogleGenerativeAI(apiKey);
  const models = [...new Set([MODEL, FALLBACK_MODEL].filter(Boolean))];

  // Attempt order alternates models: primary, fallback, primary, ...
  const plan = Array.from({ length: MAX_ATTEMPTS }, (_, i) => models[i % models.length]);
  const badModels = new Set();
  const usable = (m) => !badModels.has(m);

  let lastErr;
  let attempts = 0;
  let backoffs = 0;

  for (let i = 0; i < plan.length; i++) {
    const modelName = plan[i];
    if (!usable(modelName)) continue;

    const remaining = deadline - Date.now();
    if (attempts > 0 && remaining < MIN_RETRY_BUDGET_MS) break;
    attempts++;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(ATTEMPT_TIMEOUT_MS, remaining));
    const startedAt = Date.now();
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: configFor(modelName),
      });
      const result = await model.generateContent(prompt, { signal: controller.signal });
      console.info(`Gemini ${modelName} ok in ${Date.now() - startedAt}ms`);
      return result.response.text();
    } catch (err) {
      lastErr = err;

      // The SDK rewraps our abort into an error whose name is plain "Error",
      // so err.name === "AbortError" never matches. Our own controller is the
      // reliable signal.
      if (controller.signal.aborted) {
        console.warn(
          `Gemini ${modelName} timed out after ${Date.now() - startedAt}ms (attempt ${attempts}).`
        );
        continue;
      }
      // Bad prompts, safety blocks and rejected keys will not be fixed by retrying.
      if (!isRetryable(err)) throw err;

      const modelMissing = err?.status === 404;
      if (modelMissing) badModels.add(modelName);

      console.warn(
        `Gemini ${modelName} failed (status ${err?.status ?? "n/a"}, attempt ${attempts}).`
      );

      // Overload and network errors clear with time, so back off before the
      // next try. A missing model is fixed by switching, so no wait.
      const hasNext = plan.slice(i + 1).some(usable);
      if (hasNext && !modelMissing) {
        const wait = Math.min(BASE_BACKOFF_MS * 2 ** backoffs++, MAX_BACKOFF_MS) + Math.random() * 500;
        if (deadline - Date.now() - wait < MIN_RETRY_BUDGET_MS) break;
        await sleep(wait);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr;
}