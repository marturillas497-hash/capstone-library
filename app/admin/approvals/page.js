"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/shared/Navbar";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

export default function ApprovalsPage() {
  const supabase = createClient();
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [toast, setToast] = useState(null);
  const [profile, setProfile] = useState({ role: "admin", fullName: "" });

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();
        if (data) setProfile({ role: data.role, fullName: data.full_name });
      }
      await fetchPending();
    }
    init();
  }, []);

  async function fetchPending() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, created_at, status")
      .eq("role", "capstone_adviser")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setAdvisers(data || []);
    setLoading(false);
  }

  async function handleAction(adviserId, action) {
    setProcessing((p) => ({ ...p, [adviserId]: action }));
    try {
      const res = await fetch(`/api/admin/approvals/${adviserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setAdvisers((prev) => prev.filter((a) => a.id !== adviserId));
      showToast(action === "approved" ? "Adviser approved and notified." : "Application rejected.", action === "approved" ? "success" : "info");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setProcessing((p) => ({ ...p, [adviserId]: null }));
    }
  }

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.fullName} />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <PageHeader
          title="Adviser Applications"
          subtitle="Review and act on pending capstone adviser registrations."
          icon={Clock}
          iconBg="bg-orange"
        />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-xl p-5 animate-pulse shadow-sm">
                <div className="h-4 bg-slate-100 rounded w-48 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : advisers.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg font-medium">No pending applications</p>
            <p className="text-sm mt-1">All adviser applications have been reviewed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {advisers.map((adviser) => (
              <div
                key={adviser.id}
                className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-slate-700">{adviser.full_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Registered {formatDate(adviser.created_at)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(adviser.id, "approved")}
                    disabled={!!processing[adviser.id]}
                    className="inline-flex items-center gap-1.5 bg-navy text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-navy-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4" strokeWidth={1.75} />
                    {processing[adviser.id] === "approved" ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleAction(adviser.id, "rejected")}
                    disabled={!!processing[adviser.id]}
                    className="inline-flex items-center gap-1.5 bg-white text-red-600 border border-red-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4" strokeWidth={1.75} />
                    {processing[adviser.id] === "rejected" ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-lg text-white transition-all z-50
          ${toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-navy"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}