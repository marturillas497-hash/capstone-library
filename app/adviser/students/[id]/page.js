import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import { RISK_LABELS } from "@/lib/risk";
import Link from "next/link";

export default async function AdviserStudentPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "capstone_adviser") redirect("/login");

  // Confirm this student is actually assigned to this adviser
  const { data: meta } = await supabase
    .from("student_metadata")
    .select("profile_id, id_number, year_level, section, adviser_id")
    .eq("profile_id", id)
    .eq("adviser_id", user.id)
    .single();

  if (!meta) notFound();

  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("full_name, status")
    .eq("id", id)
    .single();

  if (!studentProfile) notFound();

  const { data: reports } = await supabase
    .from("similarity_reports")
    .select("id, input_title, similarity_score, risk_level, created_at")
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  const riskColor = {
    RED: "bg-red-50 text-red-700 border-red-200",
    ORANGE: "bg-orange-50 text-orange-700 border-orange-200",
    YELLOW: "bg-yellow-50 text-yellow-700 border-yellow-200",
    GREEN: "bg-green-50 text-green-700 border-green-200",
  };

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.full_name} />
      <main className="max-w-4xl mx-auto px-4 py-8">

        <Link
          href="/adviser"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-foreground mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Students
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>
            {studentProfile.full_name}
          </h1>
          <p className="text-sm text-gray-400">
            {[
              meta.id_number,
              meta.year_level,
              meta.section ? `Section ${meta.section}` : null,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>

        <h2 className="text-base font-semibold text-foreground mb-4">
          Similarity Reports ({(reports || []).length})
        </h2>

        {!reports || reports.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base font-medium">No scans submitted yet</p>
            <p className="text-sm mt-1">This student has not run any similarity checks.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/adviser/students/${id}/report/${report.id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-navy/20 transition-all group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-navy transition-colors truncate">
                    {report.input_title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(report.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {report.similarity_score !== null && (
                    <span className="text-xs font-medium text-slate-600">
                      {(report.similarity_score * 100).toFixed(1)}%
                    </span>
                  )}
                  {report.risk_level && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${riskColor[report.risk_level]}`}>
                      {RISK_LABELS[report.risk_level]}
                    </span>
                  )}
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-navy transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
