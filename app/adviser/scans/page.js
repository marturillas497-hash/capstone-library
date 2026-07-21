import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import { RISK_LABELS, RISK_BADGE as riskColor } from "@/lib/risk";
import Link from "next/link";
import { ScanLine, ChevronRight } from "lucide-react";

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
    .filter("student_id", "is", null)
    .order("created_at", { ascending: false });

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.full_name} />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8 border-l-4 border-orange pl-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-navy">
              <ScanLine className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <h1 className="font-display text-3xl text-navy">My Scans</h1>
          </div>
          <p className="text-slate-500 mt-1 text-sm">
            Similarity scans you have run through your adviser portal.
          </p>
        </div>

        {!reports || reports.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
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
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-100 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-navy/20 transition-all group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-navy transition-colors truncate">
                    {report.input_title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(report.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {report.similarity_score !== null && (
                    <span className="text-xs font-medium text-slate-500">
                      {(report.similarity_score * 100).toFixed(1)}%
                    </span>
                  )}
                  {report.risk_level && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${riskColor[report.risk_level]}`}>
                      {RISK_LABELS[report.risk_level]}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-navy transition-colors" strokeWidth={1.75} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}