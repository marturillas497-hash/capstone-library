"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/shared/Navbar";
import { useEmbedding } from "@/components/shared/EmbeddingProvider";
import Link from "next/link";
import { Plus, Pencil, BookOpen, X } from "lucide-react";

export default function AdminArchivePage() {
  const supabase = createClient();
  const { getEmbedding, isReady, isLoading: embeddingLoading } = useEmbedding();

  const [form, setForm] = useState({
    title: "",
    abstract_text: "",
    authors: "",
    year: "",
    accession_id: "",
    keywords: [],
  });
  const [lastAccession, setLastAccession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [recentAbstracts, setRecentAbstracts] = useState([]);
  const [profile, setProfile] = useState({ role: "admin", fullName: "" });

  // Tag input state
  const [allTags, setAllTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

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
      await fetchRecent();
      await fetchAllTags();
    }
    init();
  }, []);

  async function fetchRecent() {
    const { data } = await supabase
      .from("abstracts")
      .select("id, title, accession_id, year, authors")
      .order("created_at", { ascending: false })
      .limit(5);
    if (data && data.length > 0) {
      setRecentAbstracts(data);
      setLastAccession(data[0].accession_id || null);
    }
  }

  // Pulls the full distinct keyword set across the library to power the autocomplete dropdown
  async function fetchAllTags() {
    const { data } = await supabase.from("abstracts").select("keywords");
    if (data) {
      const set = new Set();
      data.forEach((row) => (row.keywords || []).forEach((kw) => set.add(kw)));
      setAllTags(Array.from(set).sort());
    }
  }

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
    setSuccess(false);
  }

  const tagSuggestions = useMemo(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed) return [];
    return allTags.filter(
      (kw) => kw.toLowerCase().includes(trimmed) && !form.keywords.includes(kw)
    );
  }, [tagInput, allTags, form.keywords]);

  function commitTag(tag) {
    const clean = tag.trim();
    if (!clean) return;
    setForm((f) =>
      f.keywords.includes(clean) ? f : { ...f, keywords: [...f.keywords, clean] }
    );
    setTagInput("");
    setTagDropdownOpen(false);
  }

  function removeTag(tag) {
    setForm((f) => ({ ...f, keywords: f.keywords.filter((t) => t !== tag) }));
  }

  function onTagInputKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagInput.trim()) commitTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && form.keywords.length > 0) {
      removeTag(form.keywords[form.keywords.length - 1]);
    } else if (e.key === "Escape") {
      setTagDropdownOpen(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.abstract_text.trim()) {
      setError("Title and abstract text are required.");
      return;
    }
    if (!isReady) {
      setError("Embedding model is still loading. Please wait a moment and try again.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const combined = `${form.title.trim()} ${form.abstract_text.trim()}`;
      const embedding = await getEmbedding(combined);

      const res = await fetch("/api/admin/abstracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          abstract_text: form.abstract_text.trim(),
          authors: form.authors.trim() || null,
          year: form.year ? parseInt(form.year) : null,
          accession_id: form.accession_id.trim() || null,
          keywords: form.keywords,
          embedding,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add abstract");

      setSuccess(true);
      setForm({ title: "", abstract_text: "", authors: "", year: "", accession_id: "", keywords: [] });
      await fetchRecent();
      await fetchAllTags();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.fullName} />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8 border-l-4 border-orange pl-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-navy">
              <Plus className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <h1 className="font-display text-3xl text-navy">Add to Archive</h1>
          </div>
          <p className="text-slate-500 mt-1 text-sm">
            Add a completed BSIS capstone study to the institutional library.
          </p>
        </div>

        {lastAccession && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 mb-6">
            Last accession ID on record, <span className="font-mono font-semibold">{lastAccession}</span>
          </div>
        )}

        {embeddingLoading && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700 mb-6">
            Embedding model is loading. The form is ready, but submission will wait until the model is ready.
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 mb-6">
            Abstract added successfully.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5 mb-10">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Capstone Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Full capstone project title"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/30"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Accession ID</label>
              <input
                name="accession_id"
                value={form.accession_id}
                onChange={handleChange}
                placeholder="e.g. BSIS-042"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Year Published</label>
              <input
                name="year"
                type="number"
                value={form.year}
                onChange={handleChange}
                placeholder="e.g. 2024"
                min="2000"
                max={new Date().getFullYear()}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Authors</label>
              <input
                name="authors"
                value={form.authors}
                onChange={handleChange}
                placeholder="Comma-separated names"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Abstract Text <span className="text-red-500">*</span>
            </label>
            <textarea
              name="abstract_text"
              value={form.abstract_text}
              onChange={handleChange}
              placeholder="Paste the full abstract here..."
              rows={8}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/30 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Keywords</label>
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-navy/30">
                {form.keywords.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 bg-navy text-white text-xs font-medium px-2.5 py-1 rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove ${tag}`}
                      className="text-white/70 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setTagDropdownOpen(true);
                  }}
                  onFocus={() => setTagDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setTagDropdownOpen(false), 150)}
                  onKeyDown={onTagInputKeyDown}
                  placeholder={form.keywords.length === 0 ? "Type a keyword, press Enter…" : ""}
                  className="flex-1 min-w-[120px] text-sm text-slate-700 bg-transparent focus:outline-none placeholder:text-slate-400 py-0.5"
                />
              </div>
              {tagDropdownOpen && tagSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-md max-h-48 overflow-y-auto">
                  {tagSuggestions.map((kw) => (
                    <li key={kw}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => commitTag(kw)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-navy/5 hover:text-navy transition-colors"
                      >
                        {kw}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Press Enter to add a keyword. Existing keywords will autocomplete as you type.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !isReady}
              className="bg-navy text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-navy-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Generating embedding..." : !isReady ? "Model loading..." : "Add to Archive"}
            </button>
          </div>
        </form>

        {recentAbstracts.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gold-dark" strokeWidth={1.75} />
              Recently Added
            </h2>
            <div className="space-y-2">
              {recentAbstracts.map((a) => (
                <Link
                  key={a.id}
                  href={`/admin/archive/${a.id}`}
                  className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-4 py-3 hover:border-navy/20 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate group-hover:text-navy transition-colors">
                      {a.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[a.accession_id, a.year, a.authors].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-navy shrink-0 ml-4">
                    <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Edit
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}