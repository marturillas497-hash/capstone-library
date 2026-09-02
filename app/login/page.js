"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff, ScanLine, Lightbulb, BookOpen } from "lucide-react";

const STATUS_MESSAGES = {
  pending:
    "Your adviser account is pending admin approval. You will receive an email once reviewed.",
  rejected:
    "Your account application was not approved. Please contact the administrator.",
  suspended:
    "Your account has been suspended. Please contact the administrator.",
  registered:
    "Account created successfully. You can now log in.",
};

const FEATURES = [
  {
    iconColorClass: "text-gold",
    icon: ScanLine,
    label: "Semantic Similarity Detection",
  },
  {
    iconColorClass: "text-orange",
    icon: Lightbulb,
    label: "AI Advisory by Google Gemini",
  },
  {
    iconColorClass: "text-gold",
    icon: BookOpen,
    label: "BSIS Abstract Catalog",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inlineStatus, setInlineStatus] = useState(null);

  const statusKey = searchParams.get("status") || searchParams.get("error");
  const statusMessage = statusKey ? STATUS_MESSAGES[statusKey] : null;
  const isInfo = statusKey === "pending" || statusKey === "registered";

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (!profile) {
      setError("Account setup incomplete. Please contact the administrator.");
      setLoading(false);
      return;
    }

    if (profile.role === "capstone_adviser" && profile.status === "pending") {
      await supabase.auth.signOut();
      setInlineStatus({ message: STATUS_MESSAGES.pending, isInfo: true });
      setLoading(false);
      return;
    }

    if (profile.status === "rejected" || profile.status === "suspended") {
      await supabase.auth.signOut();
      setInlineStatus({ message: STATUS_MESSAGES[profile.status], isInfo: false });
      setLoading(false);
      return;
    }

    const homeMap = {
      admin: "/admin",
      capstone_adviser: "/adviser",
      student: "/dashboard",
    };

    router.push(homeMap[profile.role] ?? "/login");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* Mobile-only top banner */}
      <div className="lg:hidden bg-navy px-6 pt-8 pb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-orange" />
        <div className="flex items-center gap-3 mb-3">
          <img
            src="/mist-logo.png"
            alt="MIST"
            className="h-10 w-10 object-contain"
          />
          <div className="w-px h-8 bg-white/15" />
          <img
            src="/is-logo.png"
            alt="Information Systems"
            className="h-10 w-10 object-contain"
          />
        </div>
        <p className="text-white text-sm font-medium leading-snug">
          Makilala Institute of Science and Technology
        </p>
        <p className="text-orange text-xs leading-snug mt-0.5">
          Bachelor of Science in Information Systems
        </p>
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden bg-navy">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/[0.04] pointer-events-none" />

        {/* IS Orange accent strip */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-orange" />

        {/* Top section */}
        <div className="relative">

          {/* Dual logo row */}
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/mist-logo.png"
              alt="MIST"
              className="h-10 w-10 object-contain"
            />
            <div className="w-px h-8 bg-white/15" />
            <img
              src="/is-logo.png"
              alt="Information Systems"
              className="h-10 w-10 object-contain"
            />
          </div>

          {/* School + department names */}
          <p className="text-white/80 text-xs font-medium leading-snug mb-0.5">
            Makilala Institute of Science and Technology
          </p>
          <p className="text-orange text-[10px] leading-snug mb-7">
            Bachelor of Science in Information Systems
          </p>

          <h1 className="font-display text-4xl text-white mb-3 leading-tight">
            Capstone Library
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Validate your proposed capstone topics against the BSIS institutional
            library through semantic similarity detection and AI-powered advisory
            feedback.
          </p>
        </div>

        {/* Bottom: feature bullets */}
        <div className="relative space-y-3">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <f.icon className={`${f.iconColorClass} shrink-0 w-4 h-4`} strokeWidth={1.75} />
              <span className="text-white/70 text-sm">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 bg-slate-50">
        <div className="w-full max-w-sm bg-background rounded-2xl shadow-neo neo-transition p-8">

          <h2 className="font-display text-3xl text-foreground mb-1">
            Welcome back
          </h2>
          <p className="text-sm text-slate-600 mb-8">
            Sign in to your Capstone Library account
          </p>

          {(inlineStatus || statusMessage) && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg text-sm ${
                (inlineStatus?.isInfo ?? isInfo)
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {inlineStatus?.message ?? statusMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-background shadow-neo-inset border-none text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/20 transition neo-transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 rounded-lg bg-background shadow-neo-inset border-none text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/20 transition neo-transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white text-sm font-medium py-2.5 rounded-lg hover:bg-navy-light transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            No account yet?{" "}
            <a href="/register" className="text-orange font-medium hover:underline">
              Register here
            </a>
          </p>

        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}