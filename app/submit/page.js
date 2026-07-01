"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEmbedding } from "@/components/shared/EmbeddingProvider";
import Navbar from "@/components/shared/Navbar";
import { ScanLine, Loader2 } from "lucide-react";

const DAILY_LIMIT = 5;

async function fetchScansUsedToday(supabase, userId, role) {
  const startOfDayPHT = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
  );
  startOfDayPHT.setHours(0, 0, 0, 0);

  let query = supabase
    .from("similarity_reports")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfDayPHT.toISOString());

  if (role === "student") {
    query = query.eq("student_id", userId);
  } else {
    // .is() silently fails through PostgREST on this project — always use .filter()
    query = query.eq("adviser_id", userId).filter("student_id", "is", null);
  }

  const { count } = await query;
  return count ?? 0;
}

export default function SubmitPage() {
  const router = useRouter();
  const { isReady, isLoading: modelLoading, getEmbedding } = useEmbedding();

  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scansLeft, setScansLeft] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      setProfile(prof);
      setUserId(user.id);

      if (prof) {
        const used = await fetchScansUsedToday(supabase, user.id, prof.role);
        setScansLeft(Math.max(0, DAILY_LIMIT - used));
      }
    }
    loadProfile();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!isReady) {
      setError("The embedding model is still loading. Please wait a moment and try again.");
      return;
    }

    if (scansLeft === 0) {
      setError("You have reached your daily scan limit. Your scans will reset tomorrow.");
      return;
    }

    setLoading(true);
    setStatus("Generating embedding…");

    try {
      const combined = `${title.trim()} ${description.trim()}`;
      const embedding = await getEmbedding(combined);

      setStatus("Running similarity scan…");

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          embedding,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        setStatus("");
        return;
      }

      setScansLeft((prev) => Math.max(0, (prev ?? 1) - 1));

      const reportPath =
        profile?.role === "capstone_adviser"
          ? `/adviser/report/${data.reportId}`
          : `/dashboard/report/${data.reportId}`;

      router.push(reportPath);
    } catch (err) {
      console.error(err);
      setError("Failed to generate embedding. Please try again.");
      setLoading(false);
      setStatus("");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {profile && <Navbar role={profile.role} fullName={profile.full_name} />}

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-8 border-l-4 border-orange pl-4">
          <h1 className="font-display text-3xl text-navy mb-1">New Similarity Scan</h1>
          <p className="text-sm text-slate-500">
            Enter your proposed capstone title and abstract to check for conceptual overlap
            with existing BSIS studies.
          </p>
        </div>

        {/* Model status */}
        {modelLoading && (
          <div className="mb-5 flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-200 rounded-lg px-4 py-3">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            Initializing embedding model in the background…
          </div>
        )}
        {isReady && (
          <div className="mb-5 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
            Embedding model ready
          </div>
        )}

        {/* Scans remaining */}
        {scansLeft !== null && (
          <div className="mb-5 text-sm text-slate-500">
            {scansLeft > 0
              ? `${scansLeft} of ${DAILY_LIMIT} scans remaining today`
              : "Daily scan limit reached. Resets at 12:00 AM Philippine Standard Time."}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Proposed Capstone Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Automated Attendance Monitoring System Using Face Recognition"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Abstract or Problem Statement
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={7}
                placeholder="Describe your proposed study, its objectives, and the problem it aims to address…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {loading && status && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="inline-block w-2 h-2 rounded-full bg-navy animate-pulse shrink-0" />
                {status}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isReady || scansLeft === 0}
              className="w-full flex items-center justify-center gap-2 bg-navy text-white text-sm font-medium py-2.5 rounded-lg hover:bg-navy-light transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ScanLine className="w-4 h-4" strokeWidth={1.75} />
              )}
              {loading ? "Running scan…" : "Run Semantic Scan"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-xs text-slate-400 text-center px-4">
          Scans are limited to {DAILY_LIMIT} per calendar day and reset at 12:00 AM
          Philippine Standard Time. This tool performs semantic similarity detection,
          not plagiarism checking.
        </p>
      </main>
    </div>
  );
}