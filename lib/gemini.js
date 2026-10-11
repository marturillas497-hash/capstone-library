import { GoogleGenerativeAI } from "@google/generative-ai";

// Primary model comes from an env var so a model swap is a Vercel setting
// plus a redeploy, not a code change.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// Optional. A second model tried after the primary keeps failing. Leave it
// unset to retry the primary only. A 503 means the MODEL is overloaded, so
// no amount of key switching helps while that lasts.
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

const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 800; // waits 0.8s, 1.6s, 3.2s between overload retries
const MIN_RETRY_BUDGET_MS = 8_000; // never start a retry with less time than this left
const ATTEMPT_TIMEOUT_MS = 14_000; // one call may not hold the whole budget, so a hang can fail over
const KEY_COOLDOWN_MS = 60_000; // warm instances try a failed key last (best effort)

const RETRYABLE_STATUSES = new Set([401, 403, 404, 429, 500, 502, 503, 504]);
const RETRYABLE_MESSAGE =
  /api key not valid|quota|resource_exhausted|overloaded|fetch failed|network|econnreset|etimedout|socket/i;
const KEY_PROBLEM_MESSAGE = /api key not valid|quota|resource_exhausted/i;

const cooldownUntil = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getKeys() {
  return [
    { label: 1, key: process.env.GOOGLE_GEMINI_API_KEY?.trim() },
    { label: 2, key: process.env.GOOGLE_GEMINI_API_KEY_2?.trim() },
  ].filter((k) => k.key);
}

function isRetryable(err) {
  return RETRYABLE_STATUSES.has(err?.status) || RETRYABLE_MESSAGE.test(err?.message ?? "");
}

/**
 * Generates text, retrying before the caller has to use its fallback advisory.
 *
 * - Overload or network errors (500/502/503/504): wait with exponential
 *   backoff, then try again.
 * - Key problems (401/403/429/quota): switch to the other key right away and
 *   do not reuse the bad key for this request.
 * - Timeout (no answer within ATTEMPT_TIMEOUT_MS): give up on that call and
 *   move to the next key or model at once, no backoff since time was spent.
 * - Unknown model (404): skip that model and move on.
 * - Anything else (bad prompt, safety block): throw immediately, retrying
 *   cannot fix it.
 *
 * Every attempt shares ONE time budget (timeoutMs), so retries can never push
 * the request past the client's 45 second limit (PRD F3.8). At most
 * MAX_ATTEMPTS calls are made, and a scan that succeeds first try makes
 * exactly one call. Throws if everything fails; the caller owns the fallback
 * advisory. Key values are never logged, only their label (1 or 2).
 */
export async function generateText(prompt, { timeoutMs = 34_000 } = {}) {
  const keys = getKeys();
  if (keys.length === 0) throw new Error("No Gemini API key is configured.");

  const now = Date.now();
  const deadline = now + timeoutMs;

  // Keys not cooling down go first. Cooling keys are still tried last so a
  // stale cooldown can never block a scan outright.
  const ordered = [...keys].sort(
    (a, b) =>
      ((cooldownUntil.get(a.label) ?? 0) > now) - ((cooldownUntil.get(b.label) ?? 0) > now)
  );
  const models = [...new Set([MODEL, FALLBACK_MODEL].filter(Boolean))];

  // Attempt order: every key on the primary model, then every key on the
  // fallback model, then around again, capped at MAX_ATTEMPTS.
  const plan = [];
  for (let round = 0; plan.length < MAX_ATTEMPTS && round < MAX_ATTEMPTS; round++) {
    for (const model of models) {
      for (const k of ordered) plan.push({ model, ...k });
    }
  }
  plan.length = Math.min(plan.length, MAX_ATTEMPTS);

  const badKeys = new Set();
  const badModels = new Set();
  const usable = (s) => !badKeys.has(s.label) && !badModels.has(s.model);

  let lastErr;
  let attempts = 0;
  let backoffs = 0;

  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    if (!usable(step)) continue;

    const remaining = deadline - Date.now();
    if (attempts > 0 && remaining < MIN_RETRY_BUDGET_MS) break;
    attempts++;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(ATTEMPT_TIMEOUT_MS, remaining));
    const startedAt = Date.now();
    try {
      const model = new GoogleGenerativeAI(step.key).getGenerativeModel({
        model: step.model,
        generationConfig: configFor(step.model),
      });
      const result = await model.generateContent(prompt, { signal: controller.signal });
      console.info(`Gemini ${step.model} key ${step.label} ok in ${Date.now() - startedAt}ms`);
      return result.response.text();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;

      /*
       * The SDK rewraps our abort into GoogleGenerativeAIAbortError, whose
       * name is plain "Error", so err.name === "AbortError" never matches.
       * Our own controller is the reliable signal.
       */
      if (controller.signal.aborted) {
        console.warn(
          `Gemini ${step.model} key ${step.label} timed out after ${Date.now() - startedAt}ms (attempt ${attempts}).`
        );
        continue;
      }
      // Bad prompts and safety blocks will not be fixed by retrying.
      if (!isRetryable(err)) throw err;

      const modelMissing = err?.status === 404;
      const keyProblem =
        [401, 403, 429].includes(err?.status) || KEY_PROBLEM_MESSAGE.test(err?.message ?? "");

      if (modelMissing) badModels.add(step.model);
      else if (keyProblem) {
        badKeys.add(step.label);
        cooldownUntil.set(step.label, Date.now() + KEY_COOLDOWN_MS);
      }

      console.warn(
        `Gemini ${step.model} key ${step.label} failed (status ${err?.status ?? "n/a"}, attempt ${attempts}).`
      );

      // Overload and network errors clear with time, so back off before the
      // next try. Key and model problems are fixed by switching, so no wait.
      const hasNext = plan.slice(i + 1).some(usable);
      if (hasNext && !modelMissing && !keyProblem) {
        const wait = BASE_BACKOFF_MS * 2 ** backoffs++ + Math.random() * 300;
        if (deadline - Date.now() - wait < MIN_RETRY_BUDGET_MS) break;
        await sleep(wait);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr;
}