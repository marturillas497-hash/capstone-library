import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/abstracts/[id]/view
// Records a student abstract view event. ON CONFLICT DO NOTHING via upsert
// with ignoreDuplicates, matching the abstract_views_abstract_viewer_unique
// index on (abstract_id, viewer_id). Only student views are recorded;
// admin and capstone_adviser inserts are blocked at the RLS policy level
// (views_insert_student), so a non-student call here will simply no-op.
export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("abstract_views")
    .upsert(
      { abstract_id: id, viewer_id: user.id },
      { onConflict: "abstract_id,viewer_id", ignoreDuplicates: true }
    );

  if (error) {
    console.error("View tracking error:", error);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}