import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPool } from "@/lib/db";
import { getRiskLevel } from "@/lib/risk";
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

async function generateAdvisory(inputTitle, inputDescription, matches, riskLevel) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const matchContext = matches
      .map(
        (m, i) =>
          `${i + 1}. Title: ${m.title}\n   Authors: ${m.authors ?? "Unknown"} (${m.year ?? "N/A"})\n   Abstract: ${m.abstract_text?.slice(0, 300)}…\n   Similarity: ${(m.similarity * 100).toFixed(1)}%`
      )
      .join("\n\n");

    const prompt = `You are an academic adviser for Bachelor of Science in Information Systems (BSIS) capstone projects at Makilala Institute of Science and Technology (MIST).

A student has proposed the following capstone topic:

Title: ${inputTitle}
Abstract/Problem Statement: ${inputDescription}

The system detected a similarity risk level of ${riskLevel} based on the following top matching studies already in the BSIS capstone library:

${matchContext}

Please provide a structured advisory with the following four sections:

1. VERDICT
A one to two sentence overall assessment of the proposal's uniqueness and viability.

2. CRITICAL ANALYSIS OF OVERLAP
Identify which specific aspects of the proposal overlap with existing studies. Be precise and academic.

3. PROPOSED UNIQUE TITLES (3 alternatives)
Suggest 3 alternative capstone titles that differentiate from existing studies while staying within the same general domain.

4. ALTERNATIVE RESEARCH DIRECTIONS
Suggest 2 to 3 specific directions the student could pivot toward to ensure a unique contribution to the BSIS capstone library.

Keep the tone professional, constructive, and encouraging. Format each section with its heading in uppercase followed by its content.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini error:", err);
    return generateFallbackAdvisory(riskLevel);
  }
}

function generateFallbackAdvisory(riskLevel) {
  const fallbacks = {
    RED: `VERDICT\nYour proposed topic shows critical similarity with existing BSIS capstone studies. A significant pivot is strongly recommended before proceeding.\n\nCRITICAL ANALYSIS OF OVERLAP\nThe system detected high conceptual overlap with one or more studies already completed in the BSIS program. The core problem statement and likely methodology may already be addressed.\n\nPROPOSED UNIQUE TITLES (3 alternatives)\n1. Consider adding a geographic or institutional scope modifier to your title.\n2. Focus on a specific underserved population or sector not covered by existing studies.\n3. Combine your domain with an emerging technology not yet explored in the library.\n\nALTERNATIVE RESEARCH DIRECTIONS\n- Investigate a related but unexplored sub-problem within the same domain.\n- Apply the same solution domain to a different industry or context.\n- Focus on evaluation, improvement, or extension of existing approaches rather than replication.`,
    ORANGE: `VERDICT\nYour proposed topic is in a well-explored area of the BSIS capstone library. Differentiation through scope, methodology, or focus is recommended.\n\nCRITICAL ANALYSIS OF OVERLAP\nThe system detected strong topical overlap with existing studies. While not a direct duplicate, the conceptual space is crowded.\n\nPROPOSED UNIQUE TITLES (3 alternatives)\n1. Narrow the scope to a specific location, organization, or demographic.\n2. Introduce a specific technology angle not present in existing studies.\n3. Reframe the study around a measurable outcome or performance metric.\n\nALTERNATIVE RESEARCH DIRECTIONS\n- Identify a gap in existing implementations and focus your study there.\n- Consider a comparative study that adds new analytical value.\n- Explore the integration of your domain with an adjacent emerging field.`,
    YELLOW: `VERDICT\nYour proposed topic shares themes with existing BSIS studies but shows enough distinction to proceed with refinement.\n\nCRITICAL ANALYSIS OF OVERLAP\nShared themes were detected but no direct duplication. Strengthening the unique angle of your methodology or scope will improve differentiation.\n\nPROPOSED UNIQUE TITLES (3 alternatives)\n1. Emphasize the unique methodology or framework in your title.\n2. Specify the target beneficiary or organization type more precisely.\n3. Highlight the specific problem dimension your study uniquely addresses.\n\nALTERNATIVE RESEARCH DIRECTIONS\n- Deepen the methodological rigor or introduce a mixed-methods approach.\n- Expand the scope to include underrepresented stakeholders.\n- Integrate a performance evaluation component not present in similar studies.`,
    GREEN: `VERDICT\nYour proposed topic appears conceptually distinct from existing BSIS capstone studies. You are on a strong path to a unique contribution.\n\nCRITICAL ANALYSIS OF OVERLAP\nNo significant overlap was detected. The topic occupies a relatively unexplored area of the BSIS capstone library.\n\nPROPOSED UNIQUE TITLES (3 alternatives)\n1. Your current title direction is strong. Consider making the scope or beneficiary more explicit.\n2. Add a methodological keyword to signal your approach clearly.\n3. Incorporate the specific context or setting for added precision.\n\nALTERNATIVE RESEARCH DIRECTIONS\n- Refine your problem statement to ensure it is measurable and scoped appropriately.\n- Consider how your study could be extended or replicated in future research.\n- Identify the specific deliverable (system, framework, model) your study will produce.`,
  };

  return fallbacks[riskLevel] ?? fallbacks.GREEN;
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

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

  // Check rate limit
  const remaining = await getRemainingScans(supabase, user.id, profile.role);
  if (remaining <= 0) {
    return NextResponse.json(
      { error: "You have reached your daily scan limit. Your scans will reset tomorrow." },
      { status: 429 }
    );
  }

  // Run pgvector similarity search via direct pg connection
  const pool = getPool();
  const vectorStr = `[${embedding.join(",")}]`;

  const matchResult = await pool.query(
    `SELECT * FROM match_abstracts($1::vector, $2, $3)`,
    [vectorStr, 0, 5]
  );

  const matches = matchResult.rows;
  const topScore = matches.length > 0 ? matches[0].similarity : 0;
  const riskLevel = getRiskLevel(topScore);

  // Generate AI advisory
  const advisory = await generateAdvisory(title, description, matches, riskLevel);

  // Determine student_id and adviser_id for the report
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

  // Save report
  const { data: report, error: reportError } = await admin
    .from("similarity_reports")
    .insert({
      student_id: studentId,
      adviser_id: adviserId,
      input_title: title,
      input_description: description,
      similarity_score: topScore,
      risk_level: riskLevel,
      ai_recommendations: advisory,
      results_json: matches,
    })
    .select("id")
    .single();

  if (reportError) {
    console.error("Report insert error:", reportError);
    return NextResponse.json({ error: "Failed to save report." }, { status: 500 });
  }

  return NextResponse.json({ reportId: report.id }, { status: 201 });
}
