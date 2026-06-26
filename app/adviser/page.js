import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import StudentList from "./StudentList";

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

  const totalScans = students.reduce((sum, s) => sum + s.report_count, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.full_name} />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8 border-l-4 border-orange pl-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-foreground">My Students</h1>
            {students.length > 0 && (
              <span className="text-sm font-semibold text-white bg-navy rounded-full px-2.5 py-0.5">
                {students.length}
              </span>
            )}
          </div>
          <p className="text-slate-600 mt-1 text-sm">
            Students who have assigned you as their capstone adviser.
          </p>
          {students.length > 0 && (
            <p className="text-slate-600 text-xs mt-2">
              {totalScans} total {totalScans === 1 ? "scan" : "scans"}
            </p>
          )}
        </div>
        <StudentList students={students} />
      </main>
    </div>
  );
}