import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Public route, called from /login when the identifier has no "@".
// Resolves a student ID to the account's email and signs in on the server, so
// the email address never reaches the browser (returning it would let anyone
// harvest student emails by guessing 7-digit IDs). Session cookies are set by
// the server client's setAll; the browser client picks them up afterward.
//
// Every failure path returns the same 401 so a caller cannot tell a missing
// ID from a wrong password. Role and status checks stay in the login page,
// exactly as they do for the email path.
const FAIL = () =>
  NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return FAIL();
  }

  const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!studentId || !password || studentId.length > 32 || password.length > 128) {
    return FAIL();
  }

  const admin = createAdminClient();

  const { data: student } = await admin
    .from("student_metadata")
    .select("profile_id")
    .eq("id_number", studentId)
    .maybeSingle();

  if (!student) return FAIL();

  const { data: authData, error: lookupError } = await admin.auth.admin.getUserById(
    student.profile_id
  );
  const email = authData?.user?.email;

  if (lookupError || !email) return FAIL();

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) return FAIL();

  return NextResponse.json({ ok: true });
}