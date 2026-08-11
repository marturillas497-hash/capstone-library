import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeFilterValue } from "@/lib/postgrest";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    const admin = createAdminClient();
    let query = admin
      .from("student_whitelist")
      .select("id, id_number, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (q) {
      const safe = sanitizeFilterValue(q);
      query = query.or(`id_number.ilike.%${safe}%,full_name.ilike.%${safe}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ entries: data });
  } catch (err) {
    console.error("[GET /api/admin/whitelist]", err);
    return NextResponse.json({ error: "Failed to fetch whitelist" }, { status: 500 });
  }
}

// Accepts { rows: [{ id_number, full_name }, ...] }, already parsed and
// reviewed by the user in the /admin/whitelist preview step. Re-validates
// server-side rather than trusting the client blindly, since this endpoint
// can be called directly regardless of what the UI enforces.
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : null;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const cleaned = [];
    const seen = new Set();
    for (const row of rows) {
      const id_number = typeof row.id_number === "string" ? row.id_number.trim() : "";
      const full_name = typeof row.full_name === "string" && row.full_name.trim() ? row.full_name.trim() : null;

      if (!id_number) {
        return NextResponse.json(
          { error: "One or more rows is missing a student ID. Fix the file and re-upload." },
          { status: 400 }
        );
      }
      if (seen.has(id_number)) {
        return NextResponse.json(
          { error: `Student ID ${id_number} appears more than once in this upload. Fix the file and re-upload.` },
          { status: 400 }
        );
      }
      seen.add(id_number);
      cleaned.push({ id_number, full_name });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("student_whitelist")
      .upsert(cleaned, { onConflict: "id_number" });

    if (error) throw error;

    return NextResponse.json({ ok: true, count: cleaned.length });
  } catch (err) {
    console.error("[POST /api/admin/whitelist]", err);
    return NextResponse.json({ error: "Failed to upload whitelist" }, { status: 500 });
  }
}