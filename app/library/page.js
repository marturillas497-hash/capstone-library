"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/shared/Navbar";
import AbstractModal from "@/components/shared/AbstractModal";
import { useEmbedding } from "@/components/shared/EmbeddingProvider";
import { Search } from "lucide-react";

const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);

export default function LibraryPage() {
  const supabase = createClient();
  const { getEmbedding, isReady } = useEmbedding();

  const [abstracts, setAbstracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAbstract, setSelectedAbstract] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [profile, setProfile] = useState({ role: null, fullName: "" });
  const searchTimeout = useRef(null);
  const lastSemanticQuery = useRef("");

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
      await fetchAll();
    }
    init();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data, error } = await supabase
      .from("abstracts")
      .select("id, title, abstract_text, authors, year, accession_id")
      .order("created_at", { ascending: false });
    if (!error) setAbstracts(data || []);
    setLoading(false);
  }

  const handleSearch = useCallback(async (query, year) => {
    const trimmed = query.trim();

    if (!trimmed) {
      await fetchAll();
      return;
    }

    const wordCount = trimmed.split(/\s+/).length;

    if (wordCount <= 2) {
      setLoading(true);
      let q = supabase
        .from("abstracts")
        .select("id, title, abstract_text, authors, year, accession_id")
        .or(`title.ilike.%${trimmed}%,authors.ilike.%${trimmed}%,abstract_text.ilike.%${trimmed}%`);
      if (year) q = q.eq("year", year);
      const { data } = await q.order("created_at", { ascending: false });
      setAbstracts(data || []);
      setLoading(false);
      return;
    }

    if (!isReady) return;
    if (lastSemanticQuery.current === trimmed && !year) return;
    lastSemanticQuery.current = trimmed;

    setSearchLoading(true);
    try {
      const embedding = await getEmbedding(trimmed);
      const res = await fetch("/api/library/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedding, year: year ? parseInt(year) : null }),
      });
      const json = await res.json();
      setAbstracts(json.results || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  }, [isReady, getEmbedding, supabase]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    const wordCount = trimmed.split(/\s+/).length;

    if (!trimmed) {
      fetchAll();
      return;
    }

    if (wordCount <= 2) {
      clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => handleSearch(searchQuery, yearFilter), 200);
    }
  }, [searchQuery, yearFilter]);

  function onSearchSubmit(e) {
    e.preventDefault();
    handleSearch(searchQuery, yearFilter);
  }

  function openModal(abstract) {
    setSelectedAbstract(abstract);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedAbstract(null);
  }

  function handleAbstractUpdated(updated) {
    setAbstracts((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
    setSelectedAbstract((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  }

  const displayedAbstracts = abstracts.filter((a) => {
    if (yearFilter && a.year !== parseInt(yearFilter)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.fullName} />
      <main className="max-w-7xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="mb-8 border-l-4 border-orange pl-4">
          <h1 className="font-display text-3xl text-foreground">Capstone Library</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Browse completed BSIS capstone studies. Use the accession ID to request the physical document from the librarian.
          </p>
        </div>

        <form onSubmit={onSearchSubmit} className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, or topic..."
            className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-foreground bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/30 placeholder:text-slate-400"
          />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-foreground bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
          >
            <option value="">All Years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={searchLoading || !searchQuery.trim()}
            className="flex items-center justify-center gap-2 bg-navy text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-navy-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" strokeWidth={1.75} />
            {searchLoading ? "Searching…" : "Search"}
          </button>
        </form>

        {searchQuery.trim().split(/\s+/).length >= 3 && !isReady && (
          <p className="text-sm text-amber-600 mb-4">
            Semantic search model is loading. Keyword search is active in the meantime.
          </p>
        )}

        {loading || searchLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse shadow-sm">
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-full mb-1" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : displayedAbstracts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg font-medium">No abstracts found</p>
            <p className="text-sm mt-1">Try adjusting your search or year filter.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-4">
              {displayedAbstracts.length} result{displayedAbstracts.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedAbstracts.map((abstract) => (
                <button
                  key={abstract.id}
                  onClick={() => openModal(abstract)}
                  className="text-left bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-navy/20 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {abstract.accession_id && (
                      <span className="text-xs font-mono text-navy bg-navy/5 px-2 py-0.5 rounded shrink-0">
                        {abstract.accession_id}
                      </span>
                    )}
                    {abstract.year && (
                      <span className="text-xs text-slate-400 shrink-0">{abstract.year}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm leading-snug mb-2 group-hover:text-navy transition-colors line-clamp-3">
                    {abstract.title}
                  </h3>
                  {abstract.authors && (
                    <p className="text-xs text-slate-500 mb-2 truncate">{abstract.authors}</p>
                  )}
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {abstract.abstract_text}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      {selectedAbstract && (
        <AbstractModal
          abstract={selectedAbstract}
          isOpen={modalOpen}
          onClose={closeModal}
          isAdmin={profile.role === "admin"}
          onUpdated={handleAbstractUpdated}
          trackView={profile.role === "student"}
        />
      )}
    </div>
  );
}