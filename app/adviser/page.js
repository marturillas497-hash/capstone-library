import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import Link from "next/link";

export default async function AdviserPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "capstone_adviser") redirect("/login");

  const { data: studentMeta } = await supabase
    .from("student_metadata")
    .select("profile_id, id_number, year_level, section")
    .eq("adviser_id", user.id);

  const profileIds = (studentMeta || []).map((s) => s.profile_id);
  let students = [];

  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);

    const { data: reports } = await supabase
      .from("similarity_reports")
      .select("student_id, created_at, risk_level")
      .in("student_id", profileIds)
      .order("created_at", { ascending: false });

    const profileMap = {};
    for (const p of profiles || []) profileMap[p.id] = p;

    const reportCountMap = {};
    const latestReportMap = {};
    const latestRiskMap = {};
    for (const r of reports || []) {
      if (!reportCountMap[r.student_id]) {
        reportCountMap[r.student_id] = 0;
        latestReportMap[r.student_id] = r.created_at;
        latestRiskMap[r.student_id] = r.risk_level;
      }
      reportCountMap[r.student_id]++;
    }

    students = (studentMeta || []).map((meta) => ({
      profile_id: meta.profile_id,
      full_name: profileMap[meta.profile_id]?.full_name || "Unknown",
      id_number: meta.id_number,
      year_level: meta.year_level,
      section: meta.section,
      report_count: reportCountMap[meta.profile_id] || 0,
      latest_report_at: latestReportMap[meta.profile_id] || null,
      latest_risk: latestRiskMap[meta.profile_id] || null,
    }));

    students.sort((a, b) => {
      if (!a.latest_report_at) return 1;
      if (!b.latest_report_at) return -1;
      return new Date(b.latest_report_at) - new Date(a.latest_report_at);
    });
  }

  const riskBadge = {
    RED: "bg-red-50 text-red-700 border-red-200",
    ORANGE: "bg-orange-50 text-orange-700 border-orange-200",
    YELLOW: "bg-yellow-50 text-yellow-700 border-yellow-200",
    GREEN: "bg-green-50 text-green-700 border-green-200",
  };

  const riskLabel = {
    RED: "Critical",
    ORANGE: "High",
    YELLOW: "Moderate",
    GREEN: "Low",
  };

  function formatDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.full_name} />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
            My Students
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Students who have assigned you as their capstone adviser.
          </p>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No students assigned yet</p>
            <p className="text-sm mt-1">Students will appear here once they select you as their adviser.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <Link
                key={student.profile_id}
                href={`/adviser/students/${student.profile_id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-navy/20 transition-all group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground group-hover:text-navy transition-colors">
                      {student.full_name}
                    </p>
                    {student.latest_risk && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${riskBadge[student.latest_risk]}`}>
                        {riskLabel[student.latest_risk]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[
                      student.id_number,
                      student.year_level,
                      student.section ? `Section ${student.section}` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {student.report_count} {student.report_count === 1 ? "scan" : "scans"}
                    </p>
                    {student.latest_report_at && (
                      <p className="text-xs text-gray-400">Last: {formatDate(student.latest_report_at)}</p>
                    )}
                  </div>
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
