import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { scenarios } from "@/lib/scenarios";
import { Turn } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function parseGeminiJSON(text: string) {
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
  }
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse JSON from Gemini response");
  }
}

export async function POST(req: Request) {
  try {
    const { scenarioId, history, intensityTimeSeries } = (await req.json()) as {
      scenarioId: string;
      history: Turn[];
      intensityTimeSeries: number[];
    };

    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    const studentTurns = history
      .filter((t) => t.speaker === "student")
      .map((t, i) => `[Turn ${i + 1}] ${t.text}`)
      .join("\n");

    const fullTranscript = history
      .map(
        (t) =>
          `${t.speaker === "student" ? "STUDENT" : `PATIENT (${t.emotion ?? "neutral"}, intensity ${t.intensity?.toFixed(2) ?? "?"})`}: ${t.text}`,
      )
      .join("\n");

    const intensitySummary =
      intensityTimeSeries.length > 0
        ? intensityTimeSeries
            .map((v, i) => `Turn ${i + 1}: ${v.toFixed(2)}`)
            .join(", ")
        : "No data";

    const gradingPrompt = `You are an expert clinical communication skills assessor. You are NOT roleplaying. Analyse the following healthcare student's conversation with an AI patient simulation and grade their performance.

SCENARIO: "${scenario.title}" — ${scenario.description}

PATIENT EMOTION INTENSITY OVER TIME (0=completely calm, 1=maximum distress):
${intensitySummary}

STUDENT TURNS (for analysis):
${studentTurns}

FULL CONVERSATION TRANSCRIPT:
${fullTranscript}

Grade the student. Return ONLY valid JSON, no other text:
{
  "scores": {
    "empathy": <integer 0-10>,
    "clarity": <integer 0-10>,
    "deescalation": <integer 0-10>
  },
  "summary": "<2-3 sentence plain-English overview of overall performance>",
  "strengths": ["<specific quoted or paraphrased student moment>", "<another strength>"],
  "improvements": [
    { "moment": "<quoted or paraphrased student statement that could be improved>", "suggestion": "<concrete, actionable improvement advice>" },
    { "moment": "...", "suggestion": "..." }
  ]
}

GRADING RUBRIC:
- empathy (0-10): Did the student acknowledge the patient's emotional state BEFORE offering information or solutions? Did they use validating language? Did they avoid dismissing or minimising the patient's feelings?
- clarity (0-10): Was communication jargon-free and structured? Were explanations easy to follow? Did the student check for understanding?
- deescalation (0-10): Use ONLY the intensity time series provided — do NOT re-infer from the transcript. If the patient's intensity trended clearly downward, score higher. If intensity stayed high or rose, score lower.

Provide 1-2 strengths and 2-3 specific, actionable improvements. Be constructive and educationally useful.`;

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
    const result = await model.generateContent(gradingPrompt);
    const rawText = result.response.text();

    const parsed = parseGeminiJSON(rawText);

    // Clamp scores 0-10
    for (const key of ["empathy", "clarity", "deescalation"] as const) {
      if (typeof parsed.scores?.[key] !== "number") parsed.scores[key] = 5;
      parsed.scores[key] = Math.max(
        0,
        Math.min(10, Math.round(parsed.scores[key])),
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[/api/feedback] error:", err);
    return NextResponse.json(
      { error: "Failed to generate feedback", details: String(err) },
      { status: 500 },
    );
  }
}
