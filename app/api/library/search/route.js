import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPool } from "@/lib/db";

// POST /api/library/search
// Semantic library search via pgvector match_abstracts.
// Called when the user submits a 3+ word query on the /library page.
// The embedding is generated client-side and sent in the request body.
// Uses a direct pg connection — PostgREST cannot pass JS arrays as vector type.

export async function POST(request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const { embedding, matchCount = 10 } = body;

  if (!embedding || !Array.isArray(embedding)) {
    return NextResponse.json({ error: "Missing or invalid embedding." }, { status: 400 });
  }

  // Use a threshold of 0.3 for library search to filter out low-relevance noise.
  // This is different from /api/analyze which uses 0 to capture all matches
  // including weak GREEN ones for the full similarity report.
  const LIBRARY_SEARCH_THRESHOLD = 0.3;

  try {
    const pool = getPool();
    const vectorStr = `[${embedding.join(",")}]`;

    const result = await pool.query(
      `SELECT * FROM match_abstracts($1::vector, $2, $3)`,
      [vectorStr, LIBRARY_SEARCH_THRESHOLD, matchCount]
    );

    return NextResponse.json({ results: result.rows }, { status: 200 });
  } catch (err) {
    console.error("Library search error:", err);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}