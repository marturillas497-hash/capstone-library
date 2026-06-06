"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/shared/Navbar";
import Link from "next/link";

export default function AdminPage() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    students: 0,
    abstracts: 0,
    pendingAdvisers: 0,
    reports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ role: "admin", fullName: "" });

  useEffect(() => {
    async function fetchAll() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();
        if (data) setProfile({ role: data.role, fullName: data.full_name });
      }

      const [students, abstracts, pending, reports] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("abstracts").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "capstone_adviser").eq("status", "pending"),
        supabase.from("similarity_reports").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        students: students.count || 0,
        abstracts: abstracts.count || 0,
        pendingAdvisers: pending.count || 0,
        reports: reports.count || 0,
      });
      setLoading(false);
    }
    fetchAll();
  }, []);

  const statCards = [
    { label: "Registered Students", value: stats.students, icon: "👤" },
    { label: "Library Abstracts", value: stats.abstracts, icon: "📚" },
    { label: "Pending Adviser Applications", value: stats.pendingAdvisers, icon: "⏳", alert: stats.pendingAdvisers > 0 },
    { label: "Total Similarity Reports", value: stats.reports, icon: "📊" },
  ];

  const quickActions = [
    { label: "Add Abstract", href: "/admin/archive", description: "Add a new capstone study to the library", icon: "➕" },
    { label: "Review Applications", href: "/admin/approvals", description: "Approve or reject pending adviser accounts", icon: "✅", badge: stats.pendingAdvisers > 0 ? stats.pendingAdvisers : null },
    { label: "View Analytics", href: "/admin/analytics", description: "Abstract views, trending studies, view history", icon: "📈" },
    { label: "Manage Whitelist", href: "/admin/whitelist", description: "Upload student IDs from registrar CSV", icon: "📋" },
    { label: "Browse Library", href: "/library", description: "View and edit the capstone catalog", icon: "🔍" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.fullName} />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Admin Dashboard
          </h1>
          <p className="text-gray-500 mt-1 text-sm">System overview and quick actions.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`bg-white rounded-xl border shadow-sm p-5 ${card.alert ? "border-amber-300" : "border-gray-100"}`}
            >
              <div className="text-2xl mb-2">{card.icon}</div>
              {loading ? (
                <div className="h-7 bg-gray-100 rounded w-12 mb-1 animate-pulse" />
              ) : (
                <div className={`text-3xl font-bold mb-1 ${card.alert ? "text-amber-600" : "text-foreground"}`}>
                  {card.value}
                </div>
              )}
              <p className="text-xs text-gray-500 leading-snug">{card.label}</p>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-navy/20 transition-all group flex items-start gap-4"
            >
              <span className="text-2xl shrink-0">{action.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground group-hover:text-navy transition-colors">
                    {action.label}
                  </span>
                  {action.badge && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {action.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}