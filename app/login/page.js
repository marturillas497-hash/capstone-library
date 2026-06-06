"use client";

import { useState, useEffect, Suspense } from "react";
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    // Fetch role to redirect correctly
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-navy mb-1">
            Capstone Library
          </h1>
          <p className="text-sm text-foreground/50">
            MIST · Bachelor of Science in Information Systems
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="font-sans font-semibold text-lg text-foreground mb-6">
            Sign in to your account
          </h2>

          {/* Status / error message from middleware redirect */}
          {statusMessage && (
            <div
              className={`mb-5 px-4 py-3 rounded-lg text-sm ${
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
              />
            </div>

            {/* Inline error */}
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

          <p className="mt-5 text-center text-sm text-foreground/50">
            No account yet?{" "}
            <a
              href="/register"
              className="text-navy font-medium hover:underline"
            >
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
