/**
 * Gemini integration for subtitle analysis
 */

import { GoogleGenAI } from "@google/genai";
import type { GeminiQuote, SubtitleCue } from "@/types/hlasky";

const MODEL = "gemini-3-flash-preview";

function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey: key });
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
  const client = getClient();

  // Format subtitles for Gemini – times in raw seconds so the model returns seconds too
  const formattedSubs = subtitleCues
    .map((cue) => `[${cue.startTime.toFixed(1)}s - ${cue.endTime.toFixed(1)}s] ${cue.text}`)
    .join("\n");

  const prompt = `Analyzuj nasledujúce titulky z filmu/videa "${videoTitle}" a identifikuj najzaujímavejšie, najzábavnejšie a najpamätnejšie hlášky a citáty.

Časy v titulkoch sú v SEKUNDÁCH od začiatku videa (napr. 1791.0s = 29 minút a 51 sekúnd).

Pre každú hlášku uveď:
- Presný text hlášky
- Čas začiatku (startTime) a konca (endTime) - MUSIA byť v SEKUNDÁCH, rovnaký formát ako v titulkoch
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
    "startTime": 1791.0,
    "endTime": 1795.0,
    "character": "meno postavy alebo null",
    "confidence": 0.95
  }
]

DÔLEŽITÉ PRAVIDLÁ:
- startTime a endTime MUSIA byť v sekundách (celé číslo alebo desatinné). Príklad: 29. minúta a 51. sekunda = 1791.0, NIE 29.51.
- Použi PRESNE tie časy, ktoré sú uvedené v titulkoch pri danej hlášky.
- Vráť maximálne 30 najlepších hlášok, zoradených podľa confidence od najvyššej.
- NIKDY neopakuj rovnakú hlášku viackrát. Každá hláška musí byť unikátna - iný text ALEBO iný čas.
- Ak nenájdeš žiadne zaujímavé hlášky, vráť prázdne pole [].
- Odpovedz IBA JSON, žiadny iný text.`;

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  console.log("Gemini raw response (first 500 chars):", text.substring(0, 500));

  // Clean up: strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // Try to find and parse the JSON array
  const jsonStr = cleaned.startsWith("[") ? cleaned : cleaned.match(/\[[\s\S]*\]/)?.[0];

  if (!jsonStr) {
    throw new Error("Failed to parse Gemini response as JSON");
  }

  let quotes: Array<{
    text: string;
    startTime: number;
    endTime: number;
    character?: string;
    confidence: number;
  }>;

  try {
    quotes = JSON.parse(jsonStr);
  } catch {
    // Truncated JSON - try to salvage complete objects
    const objectPattern = /\{[^{}]*"text"\s*:\s*"[^"]*"[^{}]*\}/g;
    const matches = jsonStr.match(objectPattern);
    if (!matches || matches.length === 0) {
      throw new Error("Failed to parse Gemini response as JSON");
    }
    console.log(`Gemini JSON was truncated, salvaged ${matches.length} complete objects`);
    quotes = matches.map((m) => JSON.parse(m));
  }

  const mapped = quotes.map((q, index) => ({
    id: `quote-${index}`,
    text: q.text,
    startTime: q.startTime,
    endTime: q.endTime,
    character: q.character || undefined,
    confidence: q.confidence,
  }));
  return deduplicateQuotes(mapped);
}

function deduplicateQuotes(quotes: GeminiQuote[]): GeminiQuote[] {
  const seen = new Set<string>();
  return quotes.filter((q) => {
    const key = q.text.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
