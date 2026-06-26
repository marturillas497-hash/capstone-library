"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

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
    <nav className="bg-navy sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo + wordmark */}
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/mist-logo.png"
              alt="MIST"
              width={28}
              height={28}
              className="rounded-full"
            />
            <span className="font-display text-lg text-white leading-none">
              Capstone Library
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition relative ${
                  isActive(link.href)
                    ? "text-white"
                    : link.label === "New Scan"
                    ? "text-orange hover:text-orange-light"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gold rounded-full" />
                )}
              </a>
            ))}
          </div>

          {/* Desktop right: initials avatar + sign out */}
          <div className="hidden md:flex items-center gap-3">
            <div className="group flex items-center bg-gold rounded-full h-7 overflow-hidden max-w-[28px] hover:max-w-[200px] transition-[max-width] duration-300 ease-in-out cursor-default shrink-0">
              <span className="text-xs font-bold text-navy leading-none shrink-0 w-7 flex items-center justify-center">
                {fullName?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </span>
              <span className="text-xs font-semibold text-navy whitespace-nowrap pr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
                {fullName}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-red-400 hover:text-red-300 transition"
            >
              Sign out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
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
        <div className="md:hidden border-t border-white/10 bg-navy px-4 py-3 space-y-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive(link.href)
                  ? "bg-white/10 text-white"
                  : link.label === "New Scan"
                  ? "text-orange hover:bg-white/5"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </a>
          ))}

          <div className="pt-2 border-t border-white/10 mt-2">
            <div className="flex items-center gap-2.5 px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-navy leading-none">
                  {fullName?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </span>
              </div>
              <p className="text-xs text-white/60 truncate">{fullName}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-white/5 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}