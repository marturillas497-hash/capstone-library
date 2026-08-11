import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Given a batch of id_number values from a CSV a user is about to upload,
// returns whichever of those ids already exist in student_whitelist, with
// their current full_name. The client uses this to classify each row as
// new, an overwrite (name would change), or unchanged (already correct)
// before the user confirms the upload. Read-only, nothing is written here.
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

    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ existing: [] });
    }

    // Cap defensively, this is a preview check, not a bulk export.
    const safeIds = ids.slice(0, 2000);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("student_whitelist")
      .select("id_number, full_name")
      .in("id_number", safeIds);

    if (error) throw error;

    return NextResponse.json({ existing: data || [] });
  } catch (err) {
    console.error("[POST /api/admin/whitelist/check]", err);
    return NextResponse.json({ error: "Failed to check whitelist" }, { status: 500 });
  }
}