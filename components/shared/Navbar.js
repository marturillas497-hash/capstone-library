"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = {
  student: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/library", label: "Library" },
    { href: "/submit", label: "New Scan" },
    { href: "/profile", label: "Profile" },
  ],
  capstone_adviser: [
    { href: "/adviser", label: "My Students" },
    { href: "/adviser/scans", label: "My Scans" },
    { href: "/library", label: "Library" },
    { href: "/submit", label: "New Scan" },
  ],
  admin: [
    { href: "/admin", label: "Dashboard" },
    { href: "/library", label: "Library" },
    { href: "/admin/approvals", label: "Approvals" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/whitelist", label: "Whitelist" },
  ],
};

export default function Navbar({ role, fullName }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = NAV_LINKS[role] ?? [];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href) {
    if (href === "/dashboard" || href === "/admin" || href === "/adviser") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <a href="/" className="font-display text-lg text-navy shrink-0">
            Capstone Library
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive(link.href)
                    ? "bg-navy/5 text-navy"
                    : "text-foreground/60 hover:text-foreground hover:bg-slate-50"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-foreground/50 truncate max-w-[160px]">
              {fullName}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-red-500 hover:text-red-600 transition"
            >
              Sign out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-foreground/60 hover:bg-slate-50 transition"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive(link.href)
                  ? "bg-navy/5 text-navy"
                  : "text-foreground/60 hover:text-foreground hover:bg-slate-50"
              }`}
            >
              {link.label}
            </a>
          ))}

          <div className="pt-2 border-t border-slate-100 mt-2">
            <p className="px-3 py-1 text-xs text-foreground/40 truncate">{fullName}</p>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}