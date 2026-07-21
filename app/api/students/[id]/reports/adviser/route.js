import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Only the student whose ID matches can trigger this
  if (user.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json();
  const { adviserId } = body;

  const admin = createAdminClient();

  if (adviserId) {
    const { data: adviserProfile } = await admin
      .from("profiles")
      .select("role, status")
      .eq("id", adviserId)
      .single();

    const isValidAdviser =
      adviserProfile?.role === "capstone_adviser" && adviserProfile?.status === "active";

    if (!isValidAdviser) {
      return NextResponse.json({ error: "Invalid adviser selected." }, { status: 400 });
    }
  }

  const { error } = await admin
    .from("similarity_reports")
    .update({ adviser_id: adviserId ?? null })
    .eq("student_id", id);

  if (error) {
    console.error("Retroactive adviser update error:", error);
    return NextResponse.json({ error: "Failed to update reports." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}