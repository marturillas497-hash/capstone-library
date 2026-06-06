"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/shared/Navbar";

export default function AnalyticsPage() {
  const supabase = createClient();
  const [stats, setStats] = useState({ totalViews: 0, viewsThisWeek: 0 });
  const [topAll, setTopAll] = useState([]);
  const [topWeek, setTopWeek] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
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
      await fetchAnalytics();
    }
    init();
  }, []);

  async function fetchAnalytics() {
    setLoading(true);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [totalRes, weekRes, historyRes] = await Promise.all([
      supabase.from("abstract_views").select("id", { count: "exact", head: true }),
      supabase.from("abstract_views").select("id", { count: "exact", head: true }).gte("viewed_at", weekAgo),
      supabase
        .from("abstract_views")
        .select("viewed_at, viewer_id, abstract_id, abstracts(title), profiles(full_name), student_metadata(id_number)")
        .order("viewed_at", { ascending: false })
        .limit(50),
    ]);

    setStats({
      totalViews: totalRes.count || 0,
      viewsThisWeek: weekRes.count || 0,
    });

    setHistory(historyRes.data || []);

    const allViews = await supabase
      .from("abstract_views")
      .select("abstract_id, abstracts(title)");

    if (allViews.data) {
      const countMap = {};
      for (const row of allViews.data) {
        const key = row.abstract_id;
        if (!countMap[key]) countMap[key] = { abstract_id: key, title: row.abstracts?.title || "Unknown", count: 0 };
        countMap[key].count++;
      }
      const sorted = Object.values(countMap).sort((a, b) => b.count - a.count);
      setTopAll(sorted.slice(0, 10));
    }

    const weekViews = await supabase
      .from("abstract_views")
      .select("abstract_id, abstracts(title)")
      .gte("viewed_at", weekAgo);

    if (weekViews.data) {
      const countMap = {};
      for (const row of weekViews.data) {
        const key = row.abstract_id;
        if (!countMap[key]) countMap[key] = { abstract_id: key, title: row.abstracts?.title || "Unknown", count: 0 };
        countMap[key].count++;
      }
      const sorted = Object.values(countMap).sort((a, b) => b.count - a.count);
      setTopWeek(sorted.slice(0, 5));
    }

    setLoading(false);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.fullName} />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Analytics
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Abstract view activity across the capstone library.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          {[
            { label: "Total Abstract Views", value: stats.totalViews },
            { label: "Views This Week", value: stats.viewsThisWeek },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              {loading ? (
                <div className="h-8 bg-gray-100 rounded w-16 animate-pulse mb-1" />
              ) : (
                <div className="text-3xl font-bold text-foreground mb-1">{card.value}</div>
              )}
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Top 10 Most Viewed (All Time)</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : topAll.length === 0 ? (
              <p className="text-sm text-gray-400">No view data yet.</p>
            ) : (
              <ol className="space-y-2">
                {topAll.map((item, i) => (
                  <li key={item.abstract_id} className="flex items-start gap-3 text-sm">
                    <span className="text-xs font-bold text-gray-400 w-5 shrink-0 pt-0.5">{i + 1}</span>
                    <span className="flex-1 text-foreground leading-snug line-clamp-2">{item.title}</span>
                    <span className="text-xs font-semibold text-navy shrink-0">{item.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Top 5 Trending This Week</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : topWeek.length === 0 ? (
              <p className="text-sm text-gray-400">No views recorded this week.</p>
            ) : (
              <ol className="space-y-2">
                {topWeek.map((item, i) => (
                  <li key={item.abstract_id} className="flex items-start gap-3 text-sm">
                    <span className="text-xs font-bold text-gold w-5 shrink-0 pt-0.5">{i + 1}</span>
                    <span className="flex-1 text-foreground leading-snug line-clamp-2">{item.title}</span>
                    <span className="text-xs font-semibold text-navy shrink-0">{item.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-foreground">View History (Last 50)</h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-2">
              {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="px-6 py-10 text-sm text-gray-400">No view history yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-6 py-3 font-medium">Student</th>
                    <th className="text-left px-6 py-3 font-medium">ID Number</th>
                    <th className="text-left px-6 py-3 font-medium">Abstract</th>
                    <th className="text-right px-6 py-3 font-medium">Viewed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((row, i) => (
                    <tr key={`${row.abstract_id}-${row.viewed_at}-${i}`} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-foreground">{row.profiles?.full_name || "Unknown"}</td>
                      <td className="px-6 py-3 font-mono text-gray-500 text-xs">{row.student_metadata?.id_number || ""}</td>
                      <td className="px-6 py-3 text-gray-600 max-w-xs truncate">{row.abstracts?.title || "Unknown"}</td>
                      <td className="px-6 py-3 text-gray-400 text-xs text-right whitespace-nowrap">{formatDate(row.viewed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
