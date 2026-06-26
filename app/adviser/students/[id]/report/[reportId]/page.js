import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import { RISK_LABELS } from "@/lib/risk";
import MatchesList from "@/components/shared/MatchesList";
import Link from "next/link";

export default async function AdviserStudentReportPage({ params }) {
  const { id, reportId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "capstone_adviser") redirect("/login");

  // Confirm this student is assigned to this adviser
  const { data: meta } = await supabase
    .from("student_metadata")
    .select("profile_id, id_number, adviser_id")
    .eq("profile_id", id)
    .eq("adviser_id", user.id)
    .single();

  if (!meta) notFound();

  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .single();

  // Fetch report — RLS reports_select_adviser ensures adviser can only read where adviser_id = auth.uid()
  const { data: report } = await supabase
    .from("similarity_reports")
    .select("*")
    .eq("id", reportId)
    .eq("student_id", id)
    .single();

  if (!report) notFound();

  const matches = report.results_json ?? [];

  const riskColor = {
    RED: "bg-red-50 border-red-200 text-red-700",
    ORANGE: "bg-orange-50 border-orange-200 text-orange-700",
    YELLOW: "bg-yellow-50 border-yellow-200 text-yellow-700",
    GREEN: "bg-green-50 border-green-200 text-green-700",
  };

  const riskBar = {
    RED: "bg-red-500",
    ORANGE: "bg-orange-500",
    YELLOW: "bg-yellow-500",
    GREEN: "bg-green-500",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.full_name} />
      <main className="max-w-4xl mx-auto px-4 py-8">

        <Link
          href={`/adviser/students/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-foreground mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {studentProfile?.full_name ?? "Student"}
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                {studentProfile?.full_name} · {meta.id_number}
              </p>
              <h1 className="font-display text-2xl text-navy mb-1">{report.input_title}</h1>
              <p className="text-sm text-slate-600">
                Submitted on{" "}
                {new Date(report.created_at).toLocaleDateString("en-PH", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </p>
            </div>
            {report.risk_level && (
              <span className={`shrink-0 text-sm font-semibold px-3 py-1.5 rounded-full border ${riskColor[report.risk_level]}`}>
                {RISK_LABELS[report.risk_level]}
              </span>
            )}
          </div>

          {report.similarity_score !== null && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-slate-600 mb-1.5">
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

          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
              Submitted Abstract / Problem Statement
            </p>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {report.input_description}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-600 italic">Read-only view</span>
          </div>
        </div>

        {report.ai_recommendations && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h2 className="font-sans font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-navy inline-block" />
              AI Advisory
            </h2>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {report.ai_recommendations}
            </div>
          </div>
        )}

        {matches.length > 0 && (
          <div>
            <h2 className="font-sans font-semibold text-foreground mb-4">Top Matched Studies</h2>
            <MatchesList matches={matches} showAccessionNote />
          </div>
        )}
      </main>
    </div>
  );
}
