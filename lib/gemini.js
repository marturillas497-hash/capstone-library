import { GoogleGenerativeAI } from "@google/generative-ai";

// Set GEMINI_MODEL in Vercel to swap models without a code change.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// Gemini 3.x thinks at "medium" by default, which can push this long, rule
// heavy prompt past the timeout. "low" is enough for rule following. The SDK's
// types do not list thinkingLevel, but it forwards generationConfig unchanged.
// Only for 3.x: older models use thinkingBudget and would reject it.
function configFor(model) {
  return model.startsWith("gemini-3")
    ? { thinkingConfig: { thinkingLevel: "low" } }
    : undefined;
}

/**
 * Makes one Gemini call and waits up to timeoutMs for the answer. No retries:
 * on any failure or timeout this throws, and the caller falls back to the
 * canned advisory. timeoutMs must stay under the client's 45 second abort
 * (PRD F3.8). The API key is never logged.
 */
export async function generateText(prompt, { timeoutMs = 34_000 } = {}) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("No Gemini API key is configured.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: MODEL,
      generationConfig: configFor(MODEL),
    });
    const result = await model.generateContent(prompt, { signal: controller.signal });
    console.info(`Gemini ${MODEL} ok in ${Date.now() - startedAt}ms`);
    return result.response.text();
  } catch (err) {
    // The SDK rewraps our abort into a plain Error, so check our own controller.
    if (controller.signal.aborted) {
      console.warn(`Gemini ${MODEL} timed out after ${Date.now() - startedAt}ms.`);
    } else {
      console.warn(`Gemini ${MODEL} failed (status ${err?.status ?? "n/a"}).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}