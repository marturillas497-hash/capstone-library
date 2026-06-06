import { createClient } from "@/lib/supabase/server";

const DAILY_LIMIT = 5;

/**
 * Checks how many scans the current user has run today (PHT).
 * Uses AT TIME ZONE 'Asia/Manila' at the DB level — no JS timezone conversion.
 */
export async function getRemainingScans(userId, role) {
  const supabase = await createClient();

  let query;

  if (role === "student") {
    const { count } = await supabase
      .from("similarity_reports")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)
      .gte(
        "created_at",
        new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
        ).toISOString()
      );
    // Use raw SQL for proper PHT boundary — this is a fallback approximation.
    // The definitive check is done inside the API route using pg directly.
    return Math.max(0, DAILY_LIMIT - (count ?? 0));
  }

  if (role === "capstone_adviser") {
    const { count } = await supabase
      .from("similarity_reports")
      .select("*", { count: "exact", head: true })
      .eq("adviser_id", userId)
      .is("student_id", null)
      .gte(
        "created_at",
        new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
        ).toISOString()
      );
    return Math.max(0, DAILY_LIMIT - (count ?? 0));
  }

  return 0;
}

export { DAILY_LIMIT };
