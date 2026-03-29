import { describe, it, expect, vi, beforeEach } from "vitest";

// Create controllable mock for generateContent
const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

import { parseVTT, analyzeQuotesWithGemini } from "../gemini";

describe("parseVTT", () => {
  it("parses a simple VTT file with one cue", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello world`;

    const cues = parseVTT(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0]).toEqual({
      startTime: 1,
      endTime: 4,
      text: "Hello world",
    });
  });

  it("parses multiple cues", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
First line

00:00:05.000 --> 00:00:08.000
Second line`;

    const cues = parseVTT(vtt);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe("First line");
    expect(cues[1].text).toBe("Second line");
  });

  it("parses timestamps with hours correctly", () => {
    const vtt = `WEBVTT

01:23:45.678 --> 02:00:00.000
Long video cue`;

    const cues = parseVTT(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0].startTime).toBeCloseTo(1 * 3600 + 23 * 60 + 45 + 0.678);
    expect(cues[0].endTime).toBe(2 * 3600);
  });

  it("strips HTML tags from cue text", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
<b>Bold</b> and <i>italic</i> text`;

    const cues = parseVTT(vtt);
    expect(cues[0].text).toBe("Bold and italic text");
  });

  it("joins multi-line cues into single text", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Line one
Line two`;

    const cues = parseVTT(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Line one Line two");
  });

  it("deduplicates consecutive identical cues by extending endTime", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Same text

00:00:04.000 --> 00:00:07.000
Same text`;

    const cues = parseVTT(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0].startTime).toBe(1);
    expect(cues[0].endTime).toBe(7);
    expect(cues[0].text).toBe("Same text");
  });

  it("does not deduplicate non-consecutive identical cues", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Same text

00:00:04.000 --> 00:00:07.000
Different text

00:00:07.000 --> 00:00:10.000
Same text`;

    const cues = parseVTT(vtt);
    expect(cues).toHaveLength(3);
  });

  it("deduplicates identical lines within a single cue", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Repeated
Repeated`;

    const cues = parseVTT(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Repeated");
  });

  it("returns empty array for empty input", () => {
    expect(parseVTT("")).toEqual([]);
    expect(parseVTT("WEBVTT\n\n")).toEqual([]);
  });

  it("skips cues with only empty/whitespace text lines", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000



00:00:05.000 --> 00:00:08.000
Real text`;

    const cues = parseVTT(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Real text");
  });

  it("handles cue numbering (numeric identifiers before timestamps)", () => {
    const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
First

2
00:00:05.000 --> 00:00:08.000
Second`;

    const cues = parseVTT(vtt);
    expect(cues.length).toBeGreaterThanOrEqual(2);
    expect(cues.some((c) => c.text === "First")).toBe(true);
    expect(cues.some((c) => c.text === "Second")).toBe(true);
  });
});

describe("analyzeQuotesWithGemini", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("requires GEMINI_API_KEY to be set", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(
      analyzeQuotesWithGemini(
        [{ startTime: 0, endTime: 1, text: "test" }],
        "Test Movie"
      )
    ).rejects.toThrow("GEMINI_API_KEY is not set");
  });

  it("parses Gemini JSON response and deduplicates quotes", async () => {
    const mockResponse = JSON.stringify([
      { text: "Hello", startTime: 1, endTime: 3, character: "John", confidence: 0.9 },
      { text: "Hello", startTime: 5, endTime: 7, character: "John", confidence: 0.8 },
      { text: "World", startTime: 10, endTime: 12, character: null, confidence: 0.7 },
    ]);

    mockGenerateContent.mockResolvedValue({ text: mockResponse });

    const result = await analyzeQuotesWithGemini(
      [{ startTime: 0, endTime: 15, text: "some subtitle" }],
      "Test Movie"
    );

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Hello");
    expect(result[1].text).toBe("World");
    expect(result[0].id).toBe("quote-0");
  });

  it("handles markdown-wrapped JSON response", async () => {
    const jsonPayload = JSON.stringify([
      { text: "Quote", startTime: 1, endTime: 3, confidence: 0.9 },
    ]);
    mockGenerateContent.mockResolvedValue({ text: "```json\n" + jsonPayload + "\n```" });

    const result = await analyzeQuotesWithGemini(
      [{ startTime: 0, endTime: 5, text: "sub" }],
      "Movie"
    );

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Quote");
  });

  it("throws on empty response", async () => {
    mockGenerateContent.mockResolvedValue({ text: null });

    await expect(
      analyzeQuotesWithGemini(
        [{ startTime: 0, endTime: 1, text: "test" }],
        "Movie"
      )
    ).rejects.toThrow("Empty response from Gemini");
  });
});
