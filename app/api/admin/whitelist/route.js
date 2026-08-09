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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const idCol = header.indexOf("id_number");
    const nameCol = header.indexOf("full_name");

    if (idCol === -1 || nameCol === -1) {
      return NextResponse.json(
        { error: "Upload rejected. The CSV file must include a header row with columns: id_number, full_name." },
        { status: 400 }
      );
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const id_number = cols[idCol];
      const full_name = cols[nameCol] || null;
      if (id_number) {
        rows.push({ id_number, full_name });
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("student_whitelist")
      .upsert(rows, { onConflict: "id_number" });

    if (error) throw error;

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    console.error("[POST /api/admin/whitelist]", err);
    return NextResponse.json({ error: "Failed to upload whitelist" }, { status: 500 });
  }
}
