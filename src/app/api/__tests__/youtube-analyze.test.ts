import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock gemini
vi.mock("@/lib/gemini", () => ({
  analyzeQuotesWithGemini: vi.fn(),
  parseVTT: vi.fn(),
}));

import { POST } from "../youtube/analyze/route";
import { analyzeQuotesWithGemini, parseVTT } from "@/lib/gemini";

const mockAnalyze = vi.mocked(analyzeQuotesWithGemini);
const mockParseVTT = vi.mocked(parseVTT);

describe("POST /api/youtube/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when subtitles are missing", async () => {
    const request = new NextRequest("http://localhost/api/youtube/analyze", {
      method: "POST",
      body: JSON.stringify({ videoTitle: "Test" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when videoTitle is missing", async () => {
    const request = new NextRequest("http://localhost/api/youtube/analyze", {
      method: "POST",
      body: JSON.stringify({ subtitles: "WEBVTT\n..." }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid subtitles format (object)", async () => {
    const request = new NextRequest("http://localhost/api/youtube/analyze", {
      method: "POST",
      body: JSON.stringify({
        subtitles: { invalid: true },
        videoTitle: "Test",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("parses VTT string subtitles and analyzes", async () => {
    const cues = [
      { startTime: 0, endTime: 5, text: "Hello" },
    ];
    const quotes = [
      { id: "q1", text: "Hello", startTime: 0, endTime: 5, confidence: 0.9 },
    ];

    mockParseVTT.mockReturnValue(cues);
    mockAnalyze.mockResolvedValue(quotes);

    const request = new NextRequest("http://localhost/api/youtube/analyze", {
      method: "POST",
      body: JSON.stringify({
        subtitles: "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello",
        videoTitle: "Test Movie",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toEqual(quotes);
    expect(data.totalCues).toBe(1);
    expect(data.quotesFound).toBe(1);
    expect(mockParseVTT).toHaveBeenCalled();
  });

  it("accepts pre-parsed cue array", async () => {
    const cues = [
      { startTime: 0, endTime: 5, text: "Hello" },
    ];
    const quotes = [
      { id: "q1", text: "Hello", startTime: 0, endTime: 5, confidence: 0.9 },
    ];

    mockAnalyze.mockResolvedValue(quotes);

    const request = new NextRequest("http://localhost/api/youtube/analyze", {
      method: "POST",
      body: JSON.stringify({
        subtitles: cues,
        videoTitle: "Test Movie",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toEqual(quotes);
    // parseVTT should NOT be called when array is provided
    expect(mockParseVTT).not.toHaveBeenCalled();
  });

  it("returns empty quotes when cues are empty", async () => {
    mockParseVTT.mockReturnValue([]);

    const request = new NextRequest("http://localhost/api/youtube/analyze", {
      method: "POST",
      body: JSON.stringify({
        subtitles: "WEBVTT\n\n",
        videoTitle: "Empty",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toEqual([]);
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it("returns 500 when Gemini analysis fails", async () => {
    mockParseVTT.mockReturnValue([
      { startTime: 0, endTime: 5, text: "Hello" },
    ]);
    mockAnalyze.mockRejectedValue(new Error("Gemini error"));

    const request = new NextRequest("http://localhost/api/youtube/analyze", {
      method: "POST",
      body: JSON.stringify({
        subtitles: "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello",
        videoTitle: "Test",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
