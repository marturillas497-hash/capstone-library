import { NextResponse } from "next/server";

// POST /api/library/search
// Semantic library search via pgvector match_abstracts.
// Full implementation: Phase 4.
export async function POST(request) {
  return NextResponse.json({ message: "stub — not yet implemented" }, { status: 501 });
}
