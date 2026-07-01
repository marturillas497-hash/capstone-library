import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import { RISK_LABELS } from "@/lib/risk";
import { parseAdvisory, getMatchRisk } from "@/lib/advisory";
import MatchesList from "@/components/shared/MatchesList";
import { ArrowLeft, Sparkles } from "lucide-react";

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

export default async function ReportPage({ params }) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: report } = await supabase
    .from("similarity_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (!report) notFound();
  if (report.student_id !== user.id) notFound();

  const matches = report.results_json ?? [];
  const advisory = parseAdvisory(report.ai_recommendations);

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.full_name} />

      <main className="max-w-4xl mx-auto px-4 py-8">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-foreground mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          Back
        </Link>

        <div className="mb-6 border-l-4 border-orange pl-4">
          <h1 className="font-display text-2xl text-navy leading-snug">
            {report.input_title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submitted on{" "}
            {new Date(report.created_at).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">

          {report.risk_level && (
            <span
              className={`inline-block text-sm font-semibold px-3 py-1.5 rounded-full border mb-4 ${riskBadgeColor[report.risk_level]}`}
            >
              {RISK_LABELS[report.risk_level]}
            </span>
          )}

          {report.similarity_score !== null && (
            <div className="mb-5">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
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

          <div className="pt-5 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Submitted Abstract / Problem Statement
            </p>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {report.input_description}
            </p>
          </div>

        </div>

        {report.ai_recommendations && (
          <div className="mb-6">

            <h2 className="font-sans font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-navy" strokeWidth={1.75} />
              AI Advisory
            </h2>

            <div className="space-y-3">
              {advisory ? (
                <>
                  {advisory.verdict && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Verdict
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {advisory.verdict}
                      </p>
                    </div>
                  )}

                  {advisory.criticalAnalysis && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Critical Analysis of Overlap
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {advisory.criticalAnalysis}
                      </p>

                      {matches.length >= 1 && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-slate-100">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-2.5">
                                  Matched Study
                                </th>
                                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-2.5 whitespace-nowrap">
                                  Similarity
                                </th>
                              </tr>
                            </thead>
                            <tbody suppressHydrationWarning>
                              {matches.map((m, i) => (
                                <tr key={i} className="border-b border-slate-100 last:border-0">
                                  <td className="px-4 py-3">
                                    <p className="text-sm text-slate-700 leading-snug">
                                      {m.title}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
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

                  {advisory.proposedTitles.length >= 1 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                        Proposed Unique Titles
                      </p>
                      <div className="divide-y divide-slate-100">
                        {advisory.proposedTitles.map((title, i) => (
                          <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                            <span className="text-xs font-medium text-slate-400 mt-0.5 min-w-[16px] shrink-0">
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm text-slate-700 leading-snug">
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

                  {advisory.alternativeDirections.length >= 1 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                        Alternative Research Directions
                      </p>
                      <div className="space-y-3">
                        {advisory.alternativeDirections.map((direction, i) => (
                          <p key={i} className="text-sm text-slate-600 leading-relaxed">
                            {direction}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {report.ai_recommendations}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

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