import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("abstract_views")
    .insert({ abstract_id: id, viewer_id: user.id });

  if (error && error.code !== "23505") {
    console.error("View tracking error:", error);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}