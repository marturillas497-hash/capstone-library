"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label: "Semantic Similarity Detection",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    label: "AI Advisory by Google Gemini",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    label: "BSIS Capstone Archive",
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
      router.push("/login?status=pending");
      return;
    }

    if (profile.status === "rejected" || profile.status === "suspended") {
      router.push(`/login?error=${profile.status}`);
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
    <div className="min-h-screen flex">

      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden"
        style={{
          backgroundColor: "#003366",
          /*
            To add the school building photo later:
            backgroundImage: "url('/mist-building.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          */
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />

        {/* Top: logo + title + description grouped together */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/is-logo.png"
              alt="MIST"
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-white font-semibold text-sm leading-tight">MIST</p>
              <p className="text-white/50 text-xs leading-tight">
                Makilala Institute of Science and Technology
              </p>
            </div>
          </div>

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
              <span className="text-[#FFCC00] shrink-0">{f.icon}</span>
              <span className="text-white/70 text-sm">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 bg-slate-50">
        <div className="w-full max-w-sm">

          {/* Mobile-only header */}
          <div className="text-center mb-8 lg:hidden">
            <h1 className="font-display text-3xl text-navy mb-1">
              Capstone Library
            </h1>
            <p className="text-sm text-foreground/50">
              MIST · Bachelor of Science in Information Systems
            </p>
          </div>

          <h2 className="font-display text-3xl text-foreground mb-1">
            Welcome back
          </h2>
          <p className="text-sm text-foreground/50 mb-8">
            Sign in to your Capstone Library account
          </p>

          {statusMessage && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg text-sm ${
                isInfo
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {statusMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 bg-white text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-foreground/30 hover:text-foreground/60 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
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

          <p className="mt-6 text-center text-sm text-foreground/50">
            No account yet?{" "}
            <a href="/register" className="text-navy font-medium hover:underline">
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