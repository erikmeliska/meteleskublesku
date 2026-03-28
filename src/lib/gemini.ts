/**
 * Gemini Flash 2.0 integration for subtitle analysis
 */

import type { GeminiQuote, SubtitleCue } from "@/types/hlasky";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

/**
 * Parse VTT subtitle file into structured cues
 */
export function parseVTT(vttContent: string): SubtitleCue[] {
  const lines = vttContent.split("\n");
  const cues: SubtitleCue[] = [];
  let i = 0;

  while (i < lines.length) {
    const timeMatch = lines[i].match(
      /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
    );

    if (timeMatch) {
      const startTime =
        parseInt(timeMatch[1]) * 3600 +
        parseInt(timeMatch[2]) * 60 +
        parseInt(timeMatch[3]) +
        parseInt(timeMatch[4]) / 1000;
      const endTime =
        parseInt(timeMatch[5]) * 3600 +
        parseInt(timeMatch[6]) * 60 +
        parseInt(timeMatch[7]) +
        parseInt(timeMatch[8]) / 1000;

      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim()) {
        const cleaned = lines[i].replace(/<[^>]*>/g, "").trim();
        if (cleaned) textLines.push(cleaned);
        i++;
      }

      if (textLines.length > 0) {
        const text = [...new Set(textLines)].join(" ");
        // Deduplicate consecutive identical cues
        const lastCue = cues[cues.length - 1];
        if (!lastCue || lastCue.text !== text) {
          cues.push({ startTime, endTime, text });
        } else {
          // Extend the end time of the previous cue
          lastCue.endTime = endTime;
        }
      }
    }
    i++;
  }

  return cues;
}

/**
 * Use Gemini to identify memorable film quotes from subtitles
 */
export async function analyzeQuotesWithGemini(
  subtitleCues: SubtitleCue[],
  videoTitle: string
): Promise<GeminiQuote[]> {
  const apiKey = getApiKey();

  // Format subtitles for Gemini
  const formattedSubs = subtitleCues
    .map((cue) => `[${formatTime(cue.startTime)} - ${formatTime(cue.endTime)}] ${cue.text}`)
    .join("\n");

  const prompt = `Analyzuj nasledujúce titulky z filmu/videa "${videoTitle}" a identifikuj najzaujímavejšie, najzábavnejšie a najpamätnejšie hlášky a citáty.

Pre každú hlášku uveď:
- Presný text hlášky
- Čas začiatku (startTime) a konca (endTime) v sekundách
- Meno postavy ak je zrejmé (character)
- Skóre istoty 0-1 (confidence) - ako veľmi je to zaujímavá/pamätná hláška

Zameraj sa na:
- Kultové hlášky, ktoré si ľudia pamätajú
- Vtipné momenty a dialógy
- Dramatické alebo emotívne repliky
- Slávne citáty z filmu
- Charakteristické frázy postáv

TITULKY:
${formattedSubs}

Odpovedz VÝHRADNE v JSON formáte - pole objektov:
[
  {
    "text": "presný text hlášky",
    "startTime": 123.45,
    "endTime": 128.90,
    "character": "meno postavy alebo null",
    "confidence": 0.95
  }
]

Vráť maximálne 30 najlepších hlášok, zoradených podľa confidence od najvyššej.
Ak nenájdeš žiadne zaujímavé hlášky, vráť prázdne pole [].
Odpovedz IBA JSON, žiadny iný text.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  try {
    const quotes: Array<{
      text: string;
      startTime: number;
      endTime: number;
      character?: string;
      confidence: number;
    }> = JSON.parse(text);

    return quotes.map((q, index) => ({
      id: `quote-${index}`,
      text: q.text,
      startTime: q.startTime,
      endTime: q.endTime,
      character: q.character || undefined,
      confidence: q.confidence,
    }));
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const quotes = JSON.parse(jsonMatch[0]);
      return quotes.map(
        (
          q: {
            text: string;
            startTime: number;
            endTime: number;
            character?: string;
            confidence: number;
          },
          index: number
        ) => ({
          id: `quote-${index}`,
          text: q.text,
          startTime: q.startTime,
          endTime: q.endTime,
          character: q.character || undefined,
          confidence: q.confidence,
        })
      );
    }
    throw new Error("Failed to parse Gemini response as JSON");
  }
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
