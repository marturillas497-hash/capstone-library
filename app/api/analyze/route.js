import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPool } from "@/lib/db";
import { getRiskLevel } from "@/lib/risk";
import { buildFallbackAdvisoryText } from "@/lib/advisory";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DAILY_LIMIT = 5;

async function getRemainingScans(supabase, userId, role) {
  const pool = getPool();

  let result;
  if (role === "student") {
    result = await pool.query(
      `SELECT COUNT(*) FROM similarity_reports
       WHERE student_id = $1
         AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila'`,
      [userId]
    );
  } else {
    result = await pool.query(
      `SELECT COUNT(*) FROM similarity_reports
       WHERE adviser_id = $1
         AND student_id IS NULL
         AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila'`,
      [userId]
    );
  }

  const used = parseInt(result.rows[0].count, 10);
  return DAILY_LIMIT - used;
}

// Per-risk-level guidance injected into the prompt. Keeping this as data
// rather than four full prompt variants is what makes the risk-aware
// behavior maintainable — one sentence to edit per band, not four prompts.
const VERDICT_GUIDANCE = {
  RED: "State plainly that this topic is too similar to existing studies to move forward as it is currently scoped. If the student still wants to pursue this exact idea after reading the analysis below, tell them directly that their next step is a conversation with their capstone adviser.",
  ORANGE: "State that the topic is viable but needs a specific pivot — a narrower function, a different beneficiary, or a different scope — to stand apart from what already exists.",
  YELLOW: "State that the topic can move forward with one clear change: a more specific function, beneficiary, or record type not yet covered by similar studies.",
  GREEN: "State that the topic is distinct from the existing library. Focus entirely on making the scope more concrete. Do not mention duplication or overlap, since none was found.",
};

const OVERLAP_GUIDANCE = {
  GREEN: "No meaningful overlap was found. Say this clearly in one or two sentences. You may mention the closest study shown below only to note that you checked, not as a warning.",
  DEFAULT: "Explain in plain, simple language which specific parts of the proposal overlap with the studies shown below. Name each matching study by its exact title, accession ID, and similarity score.",
};

function buildMatchContext(matches, riskLevel) {
  // GREEN scores mean nothing shown is a meaningful overlap — passing all 5
  // as if they were invites Gemini to manufacture a false overlap analysis.
  const relevant = riskLevel === "GREEN" ? matches.slice(0, 2) : matches;
  return relevant
    .map(
      (m, i) =>
        `${i + 1}. Title: ${m.title}\n   Accession ID: ${m.accession_id ?? "N/A"}\n   Authors: ${m.authors ?? "Unknown"} (${m.year ?? "N/A"})\n   Abstract: ${m.abstract_text?.slice(0, 300)}...\n   Similarity: ${(m.similarity * 100).toFixed(1)}%`
    )
    .join("\n\n");
}

// Strips markdown Gemini was told not to use but may emit anyway. Defense in
// depth alongside the prompt instruction — see PRD Section 21 note on why
// both layers are kept rather than relying on the prompt alone.
function sanitizeAdvisoryText(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .trim();
}

async function generateAdvisory(inputTitle, inputDescription, matches, riskLevel) {
  const GEMINI_TIMEOUT_MS = 25000;
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const matchContext = buildMatchContext(matches, riskLevel);
    const overlapInstruction = OVERLAP_GUIDANCE[riskLevel] ?? OVERLAP_GUIDANCE.DEFAULT;
    const verdictInstruction = VERDICT_GUIDANCE[riskLevel] ?? VERDICT_GUIDANCE.GREEN;

    const prompt = `You are an academic adviser for Bachelor of Science in Information Systems (BSIS) capstone projects at Makilala Institute of Science and Technology (MIST) in Makilala, North Cotabato, Philippines.

A student has proposed the following capstone topic:

Title: ${inputTitle}
Abstract/Problem Statement: ${inputDescription}

The system found a similarity risk level of ${riskLevel} based on these studies in the BSIS capstone library:

${matchContext}

GLOBAL RULES — apply to everything you write below:
- Use exactly these four section headings, uppercase, in this order: VERDICT, CRITICAL ANALYSIS OF OVERLAP, PROPOSED UNIQUE TITLES, ALTERNATIVE RESEARCH DIRECTIONS.
- Plain conversational English throughout, like an adviser talking to their own advisee one-on-one. No academic jargon, no citation-style language. Contractions are fine.
- Plain text only. No markdown, asterisks, bold text, bullet points, section numbers, greeting, or sign-off.
- Address the student directly as you/your, never third person.
- No hedging language anywhere (e.g. may, might, perhaps, could potentially, you might also, could consider). Every statement is direct and confident.
- Silently identify the core system type of the proposal in one short phrase (e.g. a document request and status tracking system, an inventory management system). Do not print this phrase. Every title and direction below must be that same core system type, applied differently as instructed per section. No exceptions.
- Never name a specific real organization. Describe the organization only by general type (e.g. "a small barangay office," "a local convenience store," "a rural health unit") — never a proper name.
- Every organization type and scenario must be realistic for a small city or municipality in the Makilala or Kidapawan area of North Cotabato, Philippines. Do not suggest anything that would not plausibly exist or apply there (e.g. no snow, no large-city-only infrastructure, no industries absent from the area).
- Even though the organization is generic, the system's function must stay specific and concrete — one defined problem, one defined output, one defined user group. A vague organization does not mean a vague system.

VERDICT
Exactly two sentences. ${verdictInstruction}

CRITICAL ANALYSIS OF OVERLAP
${overlapInstruction} Discuss the highest-scoring matches first, in descending order of similarity, so your analysis lines up with what the student sees listed first elsewhere on the page. Write as if explaining to a college student, not an academic reviewer. Maximum 5 sentences total.

PROPOSED UNIQUE TITLES
Exactly 3 titles, one per line, numbered 1, 2, and 3. No description, label, or sub-header before or after any title. Each title: 12-15 words, describes one system with one clear purpose (never a feasibility study, analysis, assessment, or review), and follows its specific rule below:
1. Same core system type, but scoped to a narrower or different specific function or record type than what the matched studies cover.
2. Same core system type, applied to a different sector or beneficiary group.
3. Same core system type, with exactly one AI feature added as the system's core differentiator. Only one technology may appear in this title.

ALTERNATIVE RESEARCH DIRECTIONS
Exactly 3 directions, one per line, numbered 1, 2, and 3 in the same style as the titles above — this numbering is for structure only and will not be shown to the student, so do not refer to the numbers in the text itself. Each is a direct statement of what the student can build — not a suggestion — applied to a different function, beneficiary, or record type not yet covered by the matched studies. Maximum 2 sentences per direction, written as flowing prose. No headers or bullets.`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini request timed out")), GEMINI_TIMEOUT_MS)
      ),
    ]);
    return { text: sanitizeAdvisoryText(result.response.text()), usedFallback: false };
  } catch (err) {
    console.error("Gemini error:", err);
    return { text: generateFallbackAdvisory(riskLevel), usedFallback: true };
  }
}

const FALLBACK_MESSAGES = {
  RED: "This topic scores very high on similarity, which usually means one or more studies below already cover close to the same idea. Review the matches and consider a real pivot in function or beneficiary. If you still want to pursue this exact idea after reviewing them, your next step is talking directly with your capstone adviser.",
  ORANGE: "This topic overlaps strongly with existing studies in the library. Review the matches below and look for a narrower function or a different beneficiary group to set your proposal apart.",
  YELLOW: "This topic shares some themes with existing studies but isn't a clear duplicate. Review the matches below and see what specific angle would make your proposal stand fully on its own.",
  GREEN: "This topic doesn't show significant overlap with existing studies. The matches below are shown for reference, not as a warning.",
};

function generateFallbackAdvisory(riskLevel) {
  const message = FALLBACK_MESSAGES[riskLevel] ?? FALLBACK_MESSAGES.GREEN;
  return buildFallbackAdvisoryText(
    `${message} Our AI reviewer didn't respond in time to write a full analysis for your specific topic — please try running the scan again in a few minutes for a complete advisory.`
  );
}

export async function POST(request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["student", "capstone_adviser"].includes(profile.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, embedding } = body;

  if (!title || !description || !embedding || !Array.isArray(embedding)) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const remaining = await getRemainingScans(supabase, user.id, profile.role);
  if (remaining <= 0) {
    return NextResponse.json(
      { error: "You have reached your daily scan limit. Your scans will reset tomorrow." },
      { status: 429 }
    );
  }

  const pool = getPool();
  const vectorStr = `[${embedding.join(",")}]`;

  const matchResult = await pool.query(
    `SELECT * FROM match_abstracts($1::vector, $2, $3)`,
    [vectorStr, 0, 5]
  );

  const matches = matchResult.rows;
  const topScore = matches.length > 0 ? matches[0].similarity : 0;
  const riskLevel = getRiskLevel(topScore);

  const advisory = await generateAdvisory(title, description, matches, riskLevel);

  let studentId = null;
  let adviserId = null;

  if (profile.role === "student") {
    studentId = user.id;
    const { data: meta } = await supabase
      .from("student_metadata")
      .select("adviser_id")
      .eq("profile_id", user.id)
      .single();
    adviserId = meta?.adviser_id ?? null;
  } else {
    adviserId = user.id;
  }

  const { data: report, error: reportError } = await supabase
    .from("similarity_reports")
    .insert({
      student_id: studentId,
      adviser_id: adviserId,
      input_title: title,
      input_description: description,
      similarity_score: topScore,
      risk_level: riskLevel,
      ai_recommendations: advisory.text,
      results_json: matches,
    })
    .select("id")
    .single();

  if (reportError) {
    console.error("Report insert error:", reportError);
    return NextResponse.json({ error: "Failed to save report." }, { status: 500 });
  }

  return NextResponse.json(
    { reportId: report.id, usedFallback: advisory.usedFallback },
    { status: 201 }
  );
}