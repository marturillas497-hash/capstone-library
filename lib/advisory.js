/**
 * Parses the structured AI advisory text from Gemini into four named sections.
 * Returns null if the text is missing or none of the expected headings are found,
 * which triggers the raw text fallback on report pages.
 */
export function parseAdvisory(text) {
  if (!text) return null;

  const result = {
    verdict: "",
    criticalAnalysis: "",
    proposedTitles: [],
    alternativeDirections: [],
  };

  const headingPattern =
    /(VERDICT|CRITICAL ANALYSIS OF OVERLAP|PROPOSED UNIQUE TITLES|ALTERNATIVE RESEARCH DIRECTIONS)/;

  const parts = text.split(headingPattern);

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim();
    const content = (parts[i + 1] || "").trim();

    if (heading === "VERDICT") {
      result.verdict = content;
    } else if (heading === "CRITICAL ANALYSIS OF OVERLAP") {
      result.criticalAnalysis = content;
    } else if (heading === "PROPOSED UNIQUE TITLES") {
      result.proposedTitles = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^[1-3]\./.test(l))
        .map((l) => l.replace(/^[1-3]\.\s*/, "").trim());
    } else if (heading === "ALTERNATIVE RESEARCH DIRECTIONS") {
      result.alternativeDirections = content
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
    }
  }

  const hasContent =
    result.verdict ||
    result.criticalAnalysis ||
    result.proposedTitles.length >= 1 ||
    result.alternativeDirections.length >= 1;

  return hasContent ? result : null;
}

/**
 * Derives a risk level string from a raw cosine similarity score.
 * Used for per-match coloring in the Critical Analysis table,
 * independent of the report-level risk_level stored in the database.
 */
export function getMatchRisk(score) {
  if (score >= 0.85) return "RED";
  if (score >= 0.70) return "ORANGE";
  if (score >= 0.50) return "YELLOW";
  return "GREEN";
}