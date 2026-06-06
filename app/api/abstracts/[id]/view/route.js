import { NextResponse } from "next/server";

// POST /api/abstracts/[id]/view
// Records a student abstract view event. ON CONFLICT DO NOTHING.
// Full implementation: Phase 4.
export async function POST(request, { params }) {
  return NextResponse.json({ message: "stub — not yet implemented" }, { status: 501 });
}
