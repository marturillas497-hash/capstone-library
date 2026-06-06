"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function capitalizeName(value) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [adviserId, setAdviserId] = useState("");
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAdvisers() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "capstone_adviser")
        .eq("status", "active")
        .order("full_name");
      setAdvisers(data ?? []);
    }
    fetchAdvisers();
  }, []);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        fullName,
        email,
        password,
        studentId: role === "student" ? studentId : undefined,
        adviserId: role === "student" && adviserId ? adviserId : undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    router.push(
      role === "student" ? "/login?status=registered" : "/login?status=pending"
    );
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-navy mb-1">Capstone Library</h1>
          <p className="text-sm text-foreground/50">
            MIST · Bachelor of Science in Information Systems
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="font-sans font-semibold text-lg text-foreground mb-6">
            Create an account
          </h2>

          <form onSubmit={handleRegister} className="space-y-4">

            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "student", label: "Student" },
                  { value: "capstone_adviser", label: "Capstone Adviser" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                      role === opt.value
                        ? "bg-navy text-white border-navy"
                        : "bg-slate-50 text-foreground/60 border-slate-200 hover:border-navy/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(capitalizeName(e.target.value))}
                required
                placeholder="Juan Dela Cruz"
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                className={inputClass}
              />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {/* Student-only fields */}
            {role === "student" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                    placeholder="e.g. 2316075"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Capstone Adviser{" "}
                    <span className="text-foreground/40 font-normal">
                      (optional — you can set this later)
                    </span>
                  </label>
                  <select
                    value={adviserId}
                    onChange={(e) => setAdviserId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">No adviser selected</option>
                    {advisers.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Inline error */}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white text-sm font-medium py-2.5 rounded-lg hover:bg-navy-light transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-foreground/50">
            Already have an account?{" "}
            <a href="/login" className="text-navy font-medium hover:underline">
              Sign in
            </a>
          </p>
        </div>

        {/* Adviser pending note */}
        {role === "capstone_adviser" && (
          <p className="mt-4 text-center text-xs text-foreground/40 px-4">
            Adviser accounts require admin approval before access is granted.
            You will receive an email notification once your application is reviewed.
          </p>
        )}
      </div>
    </div>
  );
}