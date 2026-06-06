/**
 * Determines risk level from the top cosine similarity score.
 * Boundaries use strict operators to eliminate ambiguity at boundary values.
 */
export function getRiskLevel(score) {
  if (score >= 0.85) return "RED";
  if (score >= 0.70) return "ORANGE";
  if (score >= 0.50) return "YELLOW";
  return "GREEN";
}

export const RISK_LABELS = {
  RED: "Critical Similarity",
  ORANGE: "High Relevance",
  YELLOW: "Moderate Relevance",
  GREEN: "Low Similarity",
};

export const RISK_COLORS = {
  RED: "bg-red-100 text-red-700 border-red-200",
  ORANGE: "bg-orange-100 text-orange-700 border-orange-200",
  YELLOW: "bg-yellow-100 text-yellow-700 border-yellow-200",
  GREEN: "bg-green-100 text-green-700 border-green-200",
};
