import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

// Public, unauthenticated route, called from the register page before an
// account is created. Given a student ID, returns the registrar's name on
// file for that ID (if any) so the register page can show an "Is this you?"
// confirmation before submitting. The name is masked (see maskName below).
// /api/auth/register remains the source of
// truth and re-validates independently at final submit.
//
// Because it is public and returns a name, it is rate limited per IP so the
// ID space cannot be walked to collect names (Data Privacy Act exposure).
// 60 per 10 minutes leaves room for a whole computer lab sharing one campus
// IP, while capping a single client at 360 guesses per hour.
const LIMIT = 60;
const WINDOW_SEC = 600;
const MAX_ID_LENGTH = 20;

// The registrar's name is masked before it leaves the server, so a harvested
// response yields almost nothing while a real student still recognizes their
// own name. Each word keeps its first letter, e.g. "Juan D. Dela Cruz"
// becomes "J*** D. D*** C***". Single letter initials are left as is.
function maskName(name) {
  return String(name ?? "").replace(/[\p{L}\p{M}][\p{L}\p{M}'\u2019-]*/gu, (w) =>
    w.length <= 1 ? w : `${w[0]}***`
  );
}

export async function POST(request) {
  const ip = getClientIp(request);
  const { ok, retryAfter } = await rateLimit(`verify-id:${ip}`, {
    limit: LIMIT,
    windowSec: WINDOW_SEC,
  });

  if (!ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const studentId = String(body?.studentId ?? "").trim();

  if (!studentId || studentId.length > MAX_ID_LENGTH) {
    return NextResponse.json({ error: "A valid student ID is required." }, { status: 400 });
  }

  // One round trip instead of two sequential PostgREST calls.
  const { rows } = await getPool().query(
    `SELECT w.id_number, w.full_name, (sm.profile_id IS NOT NULL) AS already_registered
       FROM student_whitelist w
       LEFT JOIN student_metadata sm ON sm.id_number = w.id_number
      WHERE w.id_number = $1`,
    [studentId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    fullName: maskName(rows[0].full_name),
    idNumber: rows[0].id_number,
    alreadyRegistered: rows[0].already_registered,
  });
}
