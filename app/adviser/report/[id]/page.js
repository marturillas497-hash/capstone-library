import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import { RISK_LABELS } from "@/lib/risk";
import MatchesList from "@/components/shared/MatchesList";

function parseAdvisory(text) {
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

function getMatchRisk(score) {
  if (score >= 0.85) return "RED";
  if (score >= 0.70) return "ORANGE";
  if (score >= 0.50) return "YELLOW";
  return "GREEN";
}

const riskBadgeColor = {
  RED: "bg-red-50 border-red-200 text-red-700",
  ORANGE: "bg-orange-50 border-orange-200 text-orange-700",
  YELLOW: "bg-yellow-50 border-yellow-200 text-yellow-700",
  GREEN: "bg-green-50 border-green-200 text-green-700",
};

const riskBarColor = {
  RED: "bg-red-500",
  ORANGE: "bg-orange-500",
  YELLOW: "bg-yellow-500",
  GREEN: "bg-green-500",
};

export default async function AdviserReportPage({ params }) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "capstone_adviser") redirect("/login");

  const { data: report, error: reportError } = await supabase
    .from("similarity_reports")
    .select("*")
    .eq("id", id)
    .eq("adviser_id", user.id)
    .filter("student_id", "is", null)
    .single();

  if (reportError || !report) notFound();

  const matches = report.results_json ?? [];
  const advisory = parseAdvisory(report.ai_recommendations);

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.full_name} />

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Back */}
        <Link
          href="/adviser"
          className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Portal
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-medium text-foreground/40 uppercase tracking-wide mb-1">
                Your Scan
              </p>
              <h1 className="font-display text-2xl text-navy mb-1">
                {report.input_title}
              </h1>
              <p className="text-sm text-foreground/50">
                Submitted on{" "}
                {new Date(report.created_at).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {report.risk_level && (
              <span
                className={`shrink-0 text-sm font-semibold px-3 py-1.5 rounded-full border ${riskBadgeColor[report.risk_level]}`}
              >
                {RISK_LABELS[report.risk_level]}
              </span>
            )}
          </div>

          {/* Similarity bar */}
          {report.similarity_score !== null && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-foreground/50 mb-1.5">
                <span>Similarity Score</span>
                <span>{(report.similarity_score * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${riskBarColor[report.risk_level]}`}
                  style={{ width: `${(report.similarity_score * 100).toFixed(1)}%` }}
                />
              </div>
            </div>
          )}

          {/* Submitted abstract */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-medium text-foreground/40 uppercase tracking-wide mb-2">
              Submitted Abstract / Problem Statement
            </p>
            <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
              {report.input_description}
            </p>
          </div>

        </div>

        {/* AI Advisory */}
        {report.ai_recommendations && (
          <div className="mb-6">

            <h2 className="font-sans font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-navy inline-block" />
              AI Advisory
            </h2>

            <div className="space-y-3">

              {advisory ? (
                <>

                  {/* Verdict */}
                  {advisory.verdict && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs font-medium text-foreground/40 uppercase tracking-wide mb-2">
                        Verdict
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {advisory.verdict}
                      </p>
                    </div>
                  )}

                  {/* Critical Analysis */}
                  {advisory.criticalAnalysis && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs font-medium text-foreground/40 uppercase tracking-wide mb-2">
                        Critical Analysis of Overlap
                      </p>
                      <p className="text-sm text-foreground/70 leading-relaxed">
                        {advisory.criticalAnalysis}
                      </p>

                      {/* Matched studies table */}
                      {matches.length >= 1 && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-slate-100">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left text-xs font-medium text-foreground/40 uppercase tracking-wide px-4 py-2.5">
                                  Matched Study
                                </th>
                                <th className="text-right text-xs font-medium text-foreground/40 uppercase tracking-wide px-4 py-2.5 whitespace-nowrap">
                                  Similarity
                                </th>
                              </tr>
                            </thead>
                            <tbody suppressHydrationWarning>
                              {matches.map((m, i) => (
                                <tr key={i} className="border-b border-slate-100 last:border-0">
                                  <td className="px-4 py-3">
                                    <p className="text-sm text-foreground/80 leading-snug">
                                      {m.title}
                                    </p>
                                    <p className="text-xs text-foreground/40 mt-0.5">
                                      {m.accession_id ?? ""}
                                      {m.year ? ` · ${m.year}` : ""}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span
                                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${riskBadgeColor[getMatchRisk(m.similarity)]}`}
                                    >
                                      {(m.similarity * 100).toFixed(1)}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Proposed Unique Titles */}
                  {advisory.proposedTitles.length >= 1 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs font-medium text-foreground/40 uppercase tracking-wide mb-3">
                        Proposed Unique Titles
                      </p>
                      <div className="divide-y divide-slate-100">
                        {advisory.proposedTitles.map((title, i) => (
                          <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                            <span className="text-xs font-medium text-foreground/30 mt-0.5 min-w-[16px] shrink-0">
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm text-foreground/80 leading-snug">
                                {title}
                              </p>
                              {i === 2 && (
                                <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                                  includes AI integration
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alternative Research Directions */}
                  {advisory.alternativeDirections.length >= 1 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs font-medium text-foreground/40 uppercase tracking-wide mb-3">
                        Alternative Research Directions
                      </p>
                      <div className="space-y-3">
                        {advisory.alternativeDirections.map((direction, i) => (
                          <p key={i} className="text-sm text-foreground/70 leading-relaxed">
                            {direction}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
                    {report.ai_recommendations}
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

        {/* Top Matched Studies */}
        {matches.length >= 1 && (
          <div>
            <h2 className="font-sans font-semibold text-foreground mb-4">
              Top Matched Studies
            </h2>
            <MatchesList matches={matches} showAccessionNote />
          </div>
        )}

      </main>
    </div>
  );
}