import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
          `${i + 1}. Title: ${m.title}\n   Accession ID: ${m.accession_id ?? "N/A"}\n   Authors: ${m.authors ?? "Unknown"} (${m.year ?? "N/A"})\n   Abstract: ${m.abstract_text?.slice(0, 300)}...\n   Similarity: ${(m.similarity * 100).toFixed(1)}%`
      )
      .join("\n\n");

    const prompt = `You are an academic adviser for Bachelor of Science in Information Systems (BSIS) capstone projects at Makilala Institute of Science and Technology (MIST) in Makilala, North Cotabato, Philippines.

A student has proposed the following capstone topic:

Title: ${inputTitle}
Abstract/Problem Statement: ${inputDescription}

The system found a similarity risk level of ${riskLevel} based on these existing studies in the BSIS capstone library:

${matchContext}

Write a structured advisory using exactly these four section headings in uppercase. Do not use markdown, asterisks, bold text, or bullet points. Do not open with a greeting. Do not close with a signature or closing remark. Write in plain text only. Do not number the sections.

VERDICT
Write exactly two sentences. Address the student directly using you and your, never refer to them in third person. Be direct. State whether the proposal can move forward and what the student specifically needs to change or improve. Do not use hedging words like may, perhaps, might, could potentially, or you might also.

CRITICAL ANALYSIS OF OVERLAP
Explain in plain and simple language which specific parts of the student's proposal are too similar to existing studies in the library. Name each matching study by its exact title and include its accession ID and similarity score. Address the student directly using you and your. Write as if you are explaining to a college student, not an academic reviewer. Keep it concise and easy to understand.

Before writing the next two sections, silently identify the core system type of the student's proposal in one short phrase, for example a document request and status tracking system, an inventory management system, or a job order and maintenance request system. Do not write this phrase in your output. Every title and every direction you write must be that exact same core system type applied to a different specific organization or a different specific record type. This rule has no exceptions.

PROPOSED UNIQUE TITLES
Suggest exactly 3 alternative capstone titles. Every title must be the same core system type as the student's proposal. Do not suggest a title from a different system type no matter how related it seems.

Each title must describe a system, a web-based application, or a platform. Do not suggest a feasibility study, an analysis, an assessment, or a review.
Each title must name exactly one specific and realistic organization. Use names like Barangay Poblacion Makilala, Kidapawan City Rural Health Unit 1, or Makilala National High School. Do not use category names like rural barangays, local government units, or North Cotabato organizations.
The organizations named must be realistic for the Makilala, Kidapawan, or nearby North Cotabato area in the Philippines.
The third title must include AI as a core feature of the system. Only one technology may be featured in a title. Do not combine multiple technologies. The AI feature must still be the same core system type as the student's proposal applied to a specific local organization.
Each title must be 12 to 15 words maximum.
Each title must describe one system with one clear purpose. Do not chain multiple features or modules into the title.

Write each title on its own line numbered 1, 2, and 3. Do not add any description, label, or explanation after the title. Do not add a sub-header or category name before any title.

ALTERNATIVE RESEARCH DIRECTIONS
Suggest exactly 3 directions the student can explore. Every direction must be the same core system type as the student's proposal applied to a different specific organization, a different specific record type, or a different specific document category not yet covered in the library. Do not suggest a direction from a different system type entirely. Do not use hedging words like might, may, perhaps, could consider, or you might also. Every direction must be written as a direct statement of what the student can build, not a suggestion. Write each direction as one short paragraph in plain and simple language. Do not add a sub-header, label, or title before any paragraph. Do not use bullet points or numbering.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini error:", err);
    return generateFallbackAdvisory(riskLevel);
  }
}

function generateFallbackAdvisory(riskLevel) {
  const fallbacks = {
    RED: `VERDICT
Your proposed topic is too similar to studies already in the BSIS capstone library and cannot move forward without a major change in direction. You need to pick a significantly different problem or organization before submitting again.

CRITICAL ANALYSIS OF OVERLAP
The system detected very high similarity between your proposal and one or more existing studies in the library. The core idea, the main features, and the general approach of your proposal appear to already be covered by a previous capstone in the BSIS program.

PROPOSED UNIQUE TITLES
1. Consider a system for a specific organization in Makilala or Kidapawan that no existing study has addressed.
2. Focus on a specific group of beneficiaries in North Cotabato that is not yet represented in the library.
3. Build an AI-assisted version of a system in your domain, scoped to one specific institution in the area.

ALTERNATIVE RESEARCH DIRECTIONS
Look for a related problem within the same topic area that has not been studied yet in the BSIS program. A small but specific change in scope or in the target organization can make a significant difference in how your proposal is evaluated.

Focus on a different type of organization in Makilala or Kidapawan. The same kind of system built for a distinct and specifically named institution can count as a new and valid contribution to the library.

Make AI a core feature of your system rather than a general add-on. This can set your study apart from existing work that relies only on traditional approaches and has not yet been explored in this domain.`,

    ORANGE: `VERDICT
Your proposed topic overlaps strongly with existing studies in the library and needs a more specific scope before it can move forward. Narrowing your focus to one specific organization or one specific function will make your proposal distinct enough to proceed.

CRITICAL ANALYSIS OF OVERLAP
The system found strong similarities between your proposal and several existing capstone studies in the BSIS library. Your topic is in a well-covered area and the main features of your proposal have already been built and documented in previous studies.

PROPOSED UNIQUE TITLES
1. Narrow your scope to one specific and named organization in Makilala or Kidapawan that is not mentioned in any existing study.
2. Focus on a specific type of transaction or record in your domain that no existing study has covered yet.
3. Redesign your system around AI-assisted decision making, scoped to one specific institution in North Cotabato.

ALTERNATIVE RESEARCH DIRECTIONS
Identify a gap in how the existing similar studies handled their systems and make that gap the focus of your study. Addressing a known limitation with a new and specific approach is a valid and distinct contribution to the library.

Shift your scope to a specific community, sector, or institution in North Cotabato that is not represented in any existing BSIS capstone. A locally grounded study with a named organization will stand apart from more general existing work.

Build an AI feature into your system that solves a specific pain point your domain that the existing studies did not address. Keep the AI feature tied to one clear function and name the exact institution it will serve.`,

    YELLOW: `VERDICT
Your proposed topic shares some themes with existing studies but is different enough to move forward with minor revisions. You need to make your scope more specific and name the exact organization your system will serve before submitting.

CRITICAL ANALYSIS OF OVERLAP
The system found moderate similarities between your proposal and a few existing studies in the BSIS library. The overlap is not a direct duplicate but the general idea has been explored before, and your proposal needs a clearer angle to stand on its own.

PROPOSED UNIQUE TITLES
1. Add the name of a specific organization in Makilala or Kidapawan to your current title to make the scope immediately clear.
2. Focus on a specific record type or transaction within your domain that the similar studies did not cover.
3. Introduce AI as a core feature of your system and name the specific institution in North Cotabato it is built for.

ALTERNATIVE RESEARCH DIRECTIONS
Strengthen your proposal by naming the exact organization your system will serve. A system built for one specific barangay, school, or health unit is more clearly distinct than a system described for a general category of organizations.

Look at what the similar studies did not cover and make that the center of your proposal. Even a small unexplored angle within the same domain can become a strong and defensible capstone topic.

Add an AI component that directly addresses the main problem your system is solving. This gives your study a forward-looking angle that most existing studies in the library do not have and keeps it from blending in with earlier work.`,

    GREEN: `VERDICT
Your proposed topic appears to be distinct from existing BSIS capstone studies and you are in a good position to move forward. Focus now on making your scope more specific by naming the exact organization your system will serve.

CRITICAL ANALYSIS OF OVERLAP
The system did not find any significant overlap between your proposal and existing studies in the library. Your topic covers an area that has not been explored yet in the BSIS capstone program, which gives you a strong starting point.

PROPOSED UNIQUE TITLES
1. Your current direction is strong. Add the name of a specific organization in Makilala or Kidapawan to make the scope concrete and defensible.
2. Identify the most important record or transaction your system will handle and build the title around that specific function.
3. Build an AI-assisted version of your system scoped to one specific institution in North Cotabato for an even stronger and more forward-looking proposal.

ALTERNATIVE RESEARCH DIRECTIONS
Make your problem statement more specific by naming the exact organization your system will serve. A clearly scoped study is easier to defend during your panel presentation and more useful to future BSIS students looking for related work.

Think about what output or record your system will produce and make that the center of your title and abstract. The more specific your deliverable, the stronger your proposal becomes and the less likely it is to overlap with future submissions.

Add AI as a core feature if it fits naturally into the problem you are solving. This can give your study a distinct advantage and set it apart from earlier work in the library.`,
  };

  return fallbacks[riskLevel] ?? fallbacks.GREEN;
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