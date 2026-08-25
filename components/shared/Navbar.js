"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Menu, X, LogOut } from "lucide-react";
import ChangePasswordModal from "./ChangePasswordModal";

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
    { href: "/admin/archive", label: "Add Abstract" },
    { href: "/admin/approvals", label: "Approvals" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/whitelist", label: "Whitelist" },
  ],
};

export default function Navbar({ role, fullName }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const links = NAV_LINKS[role] ?? [];

  function openSignOutModal() {
    setMenuOpen(false);
    setSignOutModalOpen(true);
  }

  function closeSignOutModal() {
    if (signingOut) return;
    setSignOutModalOpen(false);
  }

  async function confirmSignOut() {
    setSigningOut(true);
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
              onClick={() => setChangePasswordOpen(true)}
              className="text-sm font-medium text-white/50 hover:text-white transition"
            >
              Change Password
            </button>
            <button
              onClick={openSignOutModal}
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
              <X className="w-5 h-5" strokeWidth={1.75} />
            ) : (
              <Menu className="w-5 h-5" strokeWidth={1.75} />
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
              onClick={() => {
                setMenuOpen(false);
                setChangePasswordOpen(true);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Change Password
            </button>
            <button
              onClick={openSignOutModal}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-white/5 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Sign out confirmation modal */}
      {signOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeSignOutModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-500" strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-xl text-navy">Sign Out</h2>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to sign out of Capstone Library?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmSignOut}
                disabled={signingOut}
                className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
              <button
                onClick={closeSignOutModal}
                disabled={signingOut}
                className="flex-1 bg-slate-100 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </nav>
  );
}