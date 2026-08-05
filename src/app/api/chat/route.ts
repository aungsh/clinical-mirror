import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { scenarios } from "@/lib/scenarios";
import { Turn } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function parseGeminiJSON(text: string) {
  // Strip markdown code fences if present
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
  }
  // Try direct parse
  try {
    return JSON.parse(clean);
  } catch {
    // Fallback: extract first JSON object
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse JSON from Gemini response");
  }
}

export async function POST(req: Request) {
  try {
    const { scenarioId, history, studentMessage } = (await req.json()) as {
      scenarioId: string;
      history: Turn[];
      studentMessage: string;
    };

    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: scenario.systemPrompt,
    });

    // Build Gemini chat history from existing turns.
    // Rules:
    //  1. Exclude the last turn (the new student message — sent via sendMessage instead).
    //  2. Drop any leading model/patient turns; Gemini requires history to start with 'user'.
    const priorTurns = history.slice(0, -1);

    // Find the first student turn index and start from there
    const firstUserIdx = priorTurns.findIndex((t: Turn) => t.speaker === 'student');
    const trimmedHistory = firstUserIdx >= 0 ? priorTurns.slice(firstUserIdx) : [];

    const chatHistory = trimmedHistory.map((turn: Turn) => ({
      role: turn.speaker === 'student' ? 'user' : 'model',
      parts: [
        {
          text:
            turn.speaker === 'patient'
              ? JSON.stringify({
                  reply: turn.text,
                  emotion: turn.emotion ?? 'neutral',
                  intensity: turn.intensity ?? 0.5,
                })
              : turn.text,
        },
      ],
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(studentMessage);
    const rawText = result.response.text();

    const parsed = parseGeminiJSON(rawText);

    // Validate and clamp
    const validEmotions = [
      "neutral",
      "sad",
      "angry",
      "anxious",
      "distressed",
      "relieved",
      "calm",
    ];
    if (!validEmotions.includes(parsed.emotion)) parsed.emotion = "neutral";
    if (typeof parsed.intensity !== "number") parsed.intensity = 0.5;
    parsed.intensity = Math.max(0, Math.min(1, parsed.intensity));

    return NextResponse.json({
      reply: parsed.reply ?? "...",
      emotion: parsed.emotion,
      intensity: parsed.intensity,
    });
  } catch (err) {
    console.error("[/api/chat] error:", err);
    return NextResponse.json(
      { error: "Failed to get response from AI", details: String(err) },
      { status: 500 },
    );
  }
}
