"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/shared/Navbar";

export default function WhitelistPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState({ role: "admin", fullName: "" });
  const fileRef = useRef(null);
  const searchTimeout = useRef(null);

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
      await fetchEntries("");
    }
    init();
  }, []);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchEntries(query), 300);
  }, [query]);

  async function fetchEntries(q) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/whitelist?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setEntries(json.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setUploadResult(`${json.count} record${json.count !== 1 ? "s" : ""} uploaded successfully.`);
      await fetchEntries(query);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Student Whitelist
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage the pre-registration access control list. Only whitelisted student IDs can register.
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Upload CSV</h2>
          <p className="text-xs text-gray-500 mb-4">
            Required columns: <span className="font-mono">id_number</span>, <span className="font-mono">full_name</span>.
            A header row is required. Duplicate IDs will update the existing record.
          </p>

          {uploadResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-700 mb-4">
              {uploadResult}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleUpload}
              disabled={uploading}
              className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy file:text-white hover:file:bg-navy-dark file:cursor-pointer disabled:opacity-50"
            />
            {uploading && <span className="text-sm text-gray-400">Uploading...</span>}
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student ID or name..."
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-foreground bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-lg px-4 py-3 animate-pulse h-12" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base font-medium">No entries found</p>
            <p className="text-sm mt-1">Upload a CSV to populate the whitelist.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <span className="col-span-4">Student ID</span>
              <span className="col-span-5">Name</span>
              <span className="col-span-3 text-right">Added</span>
            </div>
            <div className="divide-y divide-gray-50">
              {entries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-12 px-4 py-3 text-sm items-center">
                  <span className="col-span-4 font-mono text-foreground">{entry.id_number}</span>
                  <span className="col-span-5 text-gray-600 truncate">{entry.full_name || <span className="text-gray-300 italic">unnamed</span>}</span>
                  <span className="col-span-3 text-xs text-gray-400 text-right">{formatDate(entry.created_at)}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
              {entries.length} entr{entries.length !== 1 ? "ies" : "y"} shown
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
