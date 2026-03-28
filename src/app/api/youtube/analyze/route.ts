import { NextRequest, NextResponse } from "next/server";
import { analyzeQuotesWithGemini, parseVTT } from "@/lib/gemini";
import type { SubtitleCue } from "@/types/hlasky";

/**
 * POST /api/youtube/analyze
 * Uses Gemini Flash 2.0 to identify memorable quotes from subtitles
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subtitles, videoTitle } = body;

    if (!subtitles || !videoTitle) {
      return NextResponse.json(
        { error: "Missing subtitles or videoTitle" },
        { status: 400 }
      );
    }

    let cues: SubtitleCue[];

    // Accept either pre-parsed cues or raw VTT text
    if (typeof subtitles === "string") {
      cues = parseVTT(subtitles);
    } else if (Array.isArray(subtitles)) {
      cues = subtitles;
    } else {
      return NextResponse.json(
        { error: "Invalid subtitles format" },
        { status: 400 }
      );
    }

    if (cues.length === 0) {
      return NextResponse.json({
        quotes: [],
        message: "Žiadne titulky na analýzu",
      });
    }

    const quotes = await analyzeQuotesWithGemini(cues, videoTitle);

    return NextResponse.json({
      quotes,
      totalCues: cues.length,
      quotesFound: quotes.length,
    });
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return NextResponse.json(
      { error: "AI analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}
