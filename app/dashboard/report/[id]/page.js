import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import { RISK_LABELS, RISK_COLORS } from "@/lib/risk";
import AbstractModal from "@/components/shared/AbstractModal";

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

  // Students can only see their own reports
  if (profile.role === "student" && report.student_id !== user.id) notFound();

  const matches = report.results_json ?? [];

  const riskColor = {
    RED: "bg-red-50 border-red-200 text-red-700",
    ORANGE: "bg-orange-50 border-orange-200 text-orange-700",
    YELLOW: "bg-yellow-50 border-yellow-200 text-yellow-700",
    GREEN: "bg-green-50 border-green-200 text-green-700",
  };

  const riskBar = {
    RED: "w-full bg-red-500",
    ORANGE: "w-3/4 bg-orange-500",
    YELLOW: "w-1/2 bg-yellow-500",
    GREEN: "w-1/4 bg-green-500",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.full_name} />

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Back link */}
        <a
          href={profile.role === "student" ? "/dashboard" : "/adviser"}
          className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </a>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
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
                className={`shrink-0 text-sm font-semibold px-3 py-1.5 rounded-full border ${
                  riskColor[report.risk_level]
                }`}
              >
                {RISK_LABELS[report.risk_level]}
              </span>
            )}
          </div>

          {/* Similarity score bar */}
          {report.similarity_score !== null && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-foreground/50 mb-1.5">
                <span>Similarity Score</span>
                <span>{(report.similarity_score * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${riskBar[report.risk_level]}`}
                  style={{ width: `${(report.similarity_score * 100).toFixed(1)}%` }}
                />
              </div>
            </div>
          )}

          {/* Input description */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-medium text-foreground/40 mb-2 uppercase tracking-wide">
              Submitted Abstract / Problem Statement
            </p>
            <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
              {report.input_description}
            </p>
          </div>
        </div>

        {/* AI Advisory */}
        {report.ai_recommendations && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h2 className="font-sans font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-navy inline-block" />
              AI Advisory
            </h2>
            <div className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
              {report.ai_recommendations}
            </div>
          </div>
        )}

        {/* Top matches */}
        {matches.length > 0 && (
          <div>
            <h2 className="font-sans font-semibold text-foreground mb-4">
              Top Matched Studies
            </h2>
            <div className="space-y-3">
              {matches.map((match, index) => (
                <AbstractModal key={match.id ?? index} abstract={match} showAccessionNote>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-navy/30 hover:shadow-sm transition cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {match.title}
                        </p>
                        <p className="text-xs text-foreground/40 mt-0.5">
                          {match.authors && `${match.authors} · `}
                          {match.year && match.year}
                          {match.accession_id && ` · ${match.accession_id}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-navy bg-navy/5 px-2.5 py-1 rounded-full">
                        {(match.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-foreground/50 mt-2 line-clamp-2">
                      {match.abstract_text}
                    </p>
                  </div>
                </AbstractModal>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
