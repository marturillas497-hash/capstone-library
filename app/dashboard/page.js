import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import { RISK_LABELS, RISK_COLORS } from "@/lib/risk";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student") redirect("/login");

  const { data: meta } = await supabase
    .from("student_metadata")
    .select("id_number, year_level, section")
    .eq("profile_id", user.id)
    .single();

  const { data: reports, count } = await supabase
    .from("similarity_reports")
    .select("id, input_title, similarity_score, risk_level, created_at", { count: "exact" })
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.full_name} />

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-3xl text-navy mb-1">
            Welcome, {profile.full_name.split(" ")[0]}
          </h1>
          <p className="text-sm text-slate-600">
            {meta?.id_number && `${meta.id_number} · `}
            {meta?.year_level && `${meta.year_level} `}
            {meta?.section && `— Section ${meta.section}`}
            {!meta?.year_level && !meta?.section && "BSIS Student"}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-600 mb-1">Total Scans</p>
            <p className="font-display text-3xl text-navy">{count ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-600 mb-1">Latest Risk</p>
            <p className="font-display text-3xl text-navy">
              {reports?.[0]?.risk_level ?? "—"}
            </p>
          </div>
          <div className="col-span-2 md:col-span-1 bg-navy rounded-xl p-4 flex flex-col justify-between">
            <p className="text-xs text-white mb-3">Ready to check your topic?</p>
            <a
              href="/submit"
              className="inline-block bg-gold text-navy text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gold-light transition text-center"
            >
              New Similarity Scan
            </a>
          </div>
        </div>

        {/* Recent reports */}
        <div>
          <h2 className="font-sans font-semibold text-foreground mb-4">
            Recent Scans
          </h2>

          {!reports || reports.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-slate-600 text-sm">
                No scans yet. Run your first similarity check to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <a
                  key={report.id}
                  href={`/dashboard/report/${report.id}`}
                  className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-navy/30 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {report.input_title}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {new Date(report.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    {report.risk_level && (
                      <span
                        className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${
                          RISK_COLORS[report.risk_level]
                        }`}
                      >
                        {RISK_LABELS[report.risk_level]}
                      </span>
                    )}
                  </div>
                  {report.similarity_score !== null && (
                    <p className="text-xs text-slate-600 mt-2">
                      Top match: {(report.similarity_score * 100).toFixed(1)}% similarity
                    </p>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
