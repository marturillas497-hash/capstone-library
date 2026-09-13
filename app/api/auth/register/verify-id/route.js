import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, unauthenticated route — called from the register page before an
// account is created. Given a student ID, returns the registrar's name on
// file for that ID (if any) so the register page can show an "Is this you?"
// confirmation before submitting. This intentionally duplicates the two
// lookups already performed inside /api/auth/register (whitelist existence +
// already-registered check); that route remains the source of truth and
// re-validates both independently at final submit, this route only exists to
// surface the same information earlier in the flow for confirmation.
export async function POST(request) {
  const body = await request.json();
  const studentId = (body?.studentId ?? "").trim();

  if (!studentId) {
    return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: whitelisted } = await admin
    .from("student_whitelist")
    .select("id_number, full_name")
    .eq("id_number", studentId)
    .single();

  if (!whitelisted) {
    return NextResponse.json({ found: false });
  }

  const { data: existing } = await admin
    .from("student_metadata")
    .select("id_number")
    .eq("id_number", studentId)
    .single();

  return NextResponse.json({
    found: true,
    fullName: whitelisted.full_name,
    idNumber: whitelisted.id_number,
    alreadyRegistered: !!existing,
  });
}