import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import { RISK_LABELS } from "@/lib/risk";
import Link from "next/link";

export default async function AdviserScansPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "capstone_adviser") redirect("/login");

  const { data: reports } = await supabase
    .from("similarity_reports")
    .select("id, input_title, similarity_score, risk_level, created_at")
    .eq("adviser_id", user.id)
    .is("student_id", null)
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
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
            My Scans
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Similarity scans you have run through your adviser portal.
          </p>
        </div>

        {!reports || reports.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No scans yet</p>
            <p className="text-sm mt-1">
              Run a scan from{" "}
              <Link href="/submit" className="text-navy hover:underline">
                New Scan
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/adviser/report/${report.id}`}
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