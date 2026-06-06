"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/shared/Navbar";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["A", "B", "C", "D", "E"];

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [advisers, setAdvisers] = useState([]);
  const [yearLevel, setYearLevel] = useState("");
  const [section, setSection] = useState("");
  const [adviserId, setAdviserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, role, status")
        .eq("id", user.id)
        .single();

      const { data: m } = await supabase
        .from("student_metadata")
        .select("id_number, year_level, section, adviser_id")
        .eq("profile_id", user.id)
        .single();

      const { data: adviserList } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "capstone_adviser")
        .eq("status", "active")
        .order("full_name");

      setProfile({ ...prof, id: user.id });
      setMeta(m);
      setYearLevel(m?.year_level ?? "");
      setSection(m?.section ?? "");
      setAdviserId(m?.adviser_id ?? "");
      setAdvisers(adviserList ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const supabase = createClient();
    const prevAdviserId = meta?.adviser_id ?? null;
    const newAdviserId = adviserId || null;

    const { error: metaError } = await supabase
      .from("student_metadata")
      .update({
        year_level: yearLevel || null,
        section: section || null,
        adviser_id: newAdviserId,
      })
      .eq("profile_id", profile.id);

    if (metaError) {
      setError("Failed to save profile. Please try again.");
      setSaving(false);
      return;
    }

    // Retroactively update adviser_id on all reports if adviser changed
    if (newAdviserId !== prevAdviserId) {
      await fetch(`/api/students/${profile.id}/reports/adviser`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adviserId: newAdviserId }),
      });
    }

    setSuccess(true);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-foreground/40">Loading profile…</p>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition";

  const readonlyClass =
    "w-full px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 text-sm text-foreground/50 cursor-not-allowed";

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.full_name} />

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-navy mb-1">My Profile</h1>
          <p className="text-sm text-foreground/50">
            Update your year level, section, and assigned adviser.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <form onSubmit={handleSave} className="space-y-5">

            {/* Read-only fields */}
            <div>
              <label className="block text-sm font-medium text-foreground/50 mb-1">
                Full name
              </label>
              <div className={readonlyClass}>{profile.full_name}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/50 mb-1">
                Student ID
              </label>
              <div className={readonlyClass}>{meta?.id_number}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground/50 mb-1">
                  Role
                </label>
                <div className={readonlyClass}>Student</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/50 mb-1">
                  Status
                </label>
                <div className={readonlyClass + " capitalize"}>{profile.status}</div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Year Level
                </label>
                <select
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  {YEAR_LEVELS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Section
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Capstone Adviser
              </label>
              <select
                value={adviserId}
                onChange={(e) => setAdviserId(e.target.value)}
                className={inputClass}
              >
                <option value="">No adviser assigned</option>
                {advisers.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
              <p className="text-xs text-foreground/40 mt-1">
                Changing your adviser updates visibility on all your past reports.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && (
              <p className="text-sm text-green-600">Profile saved successfully.</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-navy text-white text-sm font-medium py-2.5 rounded-lg hover:bg-navy-light transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
