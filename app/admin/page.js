"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/shared/Navbar";
import Link from "next/link";
import { Users, BookOpen, Clock, BarChart3, Plus, CheckCircle, TrendingUp, ShieldCheck, Search, LayoutDashboard } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

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

  const hasAlert = stats.pendingAdvisers > 0;

  const statCards = [
    {
      label: "Registered Students",
      value: stats.students,
      Icon: Users,
      iconBg: "bg-navy",
      iconColor: "text-white",
    },
    {
      label: "Library Abstracts",
      value: stats.abstracts,
      Icon: BookOpen,
      iconBg: "bg-gold",
      iconColor: "text-navy",
    },
    {
      label: "Pending Adviser Applications",
      value: stats.pendingAdvisers,
      Icon: Clock,
      iconBg: hasAlert ? "bg-orange" : "bg-slate-100",
      iconColor: hasAlert ? "text-white" : "text-slate-400",
      alert: hasAlert,
    },
    {
      label: "Total Similarity Reports",
      value: stats.reports,
      Icon: BarChart3,
      iconBg: "bg-navy",
      iconColor: "text-white",
    },
  ];

  const quickActions = [
    {
      label: "Add Abstract",
      href: "/admin/archive",
      description: "Add a new capstone study to the library",
      Icon: Plus,
      iconBg: "bg-navy",
      iconColor: "text-white",
    },
    {
      label: "Review Applications",
      href: "/admin/approvals",
      description: "Approve or reject pending adviser accounts",
      Icon: CheckCircle,
      iconBg: hasAlert ? "bg-orange" : "bg-navy",
      iconColor: "text-white",
      badge: hasAlert ? stats.pendingAdvisers : null,
    },
    {
      label: "View Analytics",
      href: "/admin/analytics",
      description: "Abstract views, trending studies, view history",
      Icon: TrendingUp,
      iconBg: "bg-navy",
      iconColor: "text-white",
    },
    {
      label: "Manage Whitelist",
      href: "/admin/whitelist",
      description: "Upload student IDs from registrar CSV",
      Icon: ShieldCheck,
      iconBg: "bg-gold",
      iconColor: "text-navy",
    },
    {
      label: "Browse Library",
      href: "/library",
      description: "View and edit the capstone catalog",
      Icon: Search,
      iconBg: "bg-gold",
      iconColor: "text-navy",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={profile.role} fullName={profile.fullName} />
      <main className="max-w-6xl mx-auto px-4 py-10">

        <PageHeader
          title="Admin Dashboard"
          subtitle="System overview and quick actions."
          icon={LayoutDashboard}
          iconBg="bg-navy"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((card) => {
            const { Icon } = card;
            return (
              <div
                key={card.label}
                className={`bg-white rounded-xl border shadow-sm p-5 transition-colors ${
                  card.alert ? "border-orange/30" : "border-gray-100"
                }`}
              >
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${card.iconBg}`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} strokeWidth={1.75} />
                </div>
                {loading ? (
                  <div className="h-8 bg-gray-100 rounded w-14 mb-1 animate-pulse" />
                ) : (
                  <div className={`text-3xl font-bold mb-1 ${card.alert ? "text-orange" : "text-foreground"}`}>
                    {card.value}
                  </div>
                )}
                <p className="text-xs text-slate-500 leading-snug">{card.label}</p>
              </div>
            );
          })}
        </div>

        <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const { Icon } = action;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-navy/20 transition-all group flex items-start gap-4"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${action.iconBg}`}>
                  <Icon className={`w-5 h-5 ${action.iconColor}`} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground group-hover:text-navy transition-colors">
                      {action.label}
                    </span>
                    {action.badge && (
                      <span className="bg-orange/10 text-orange text-xs font-semibold px-2 py-0.5 rounded-full">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}