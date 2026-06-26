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

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

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

function TermsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-sans font-semibold text-base text-foreground">
            Terms and Conditions
          </h2>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-foreground transition text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 text-sm text-slate-600 space-y-4">
          <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Placeholder — final Terms and Conditions text has not been drafted yet.
          </p>
          <p>
            By creating an account on Capstone Library, you agree to use this
            system solely for academic purposes related to the BSIS program at
            Makilala Institute of Science and Technology (MIST).
          </p>
          <p>
            Your personal information, including your name, email address, and
            student ID, is collected and stored in accordance with Republic Act
            No. 10173, the Data Privacy Act of 2012. Your data will only be used
            to operate and improve this system and will not be shared with third
            parties without your consent, except as required by law.
          </p>
          <p>
            Similarity scan results and AI-generated advisory content are
            provided for informational purposes only. They do not constitute
            academic evaluation or formal assessment. All final decisions
            regarding capstone topic selection remain with the student, their
            assigned adviser, and the institution.
          </p>
          <p>
            Misuse of the system, including submitting false information or
            attempting to circumvent access controls, may result in account
            suspension.
          </p>
          <p>
            These terms are subject to change. Continued use of the system
            following any update constitutes acceptance of the revised terms.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full bg-navy text-white text-sm font-medium py-2.5 rounded-lg hover:bg-navy-light transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [adviserId, setAdviserId] = useState("");
  const [advisers, setAdvisers] = useState([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
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

    if (!agreedToTerms) {
      setError("You must accept the Terms and Conditions to register.");
      return;
    }

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
        agreedToTerms,
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
    "w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition";

  const passwordInputClass =
    "w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 bg-slate-50 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition";

  return (
    <>
      {showTermsModal && <TermsModal onClose={() => setShowTermsModal(false)} />}

      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Back arrow */}
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-orange transition mb-6 group"
          >
            <ChevronLeftIcon />
            Back to sign in
          </a>

          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display text-3xl text-navy mb-1">Create an account</h1>
            <p className="text-sm text-slate-600">
              MIST · Bachelor of Science in Information Systems
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Orange accent strip */}
            <div className="h-1 bg-orange" />

            <div className="p-8">
              <form onSubmit={handleRegister} className="space-y-4">

                {/* Role selector */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Registering as
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
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-navy/40"
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
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Min. 8 characters"
                      className={passwordInputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className={passwordInputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
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
                        <span className="text-slate-600 font-normal">
                          (optional, you can set this later)
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

                {/* Terms and Conditions checkbox */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-navy cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-sm text-slate-600 leading-snug cursor-pointer">
                    I have read and agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-orange font-medium hover:underline"
                    >
                      Terms and Conditions
                    </button>
                  </label>
                </div>

                {/* Inline error */}
                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !agreedToTerms}
                  className="w-full bg-navy text-white text-sm font-medium py-2.5 rounded-lg hover:bg-navy-light transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <a href="/login" className="text-orange font-medium hover:underline">
                  Sign in
                </a>
              </p>
            </div>
          </div>

          {/* Adviser pending note */}
          {role === "capstone_adviser" && (
            <p className="mt-4 text-center text-xs text-slate-600 px-4">
              Adviser accounts require admin approval before access is granted.
              You will receive an email notification once your application is reviewed.
            </p>
          )}
        </div>
      </div>
    </>
  );
}