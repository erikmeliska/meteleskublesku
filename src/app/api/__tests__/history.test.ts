import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    videoHistory: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, POST } from "../history/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);

describe("GET /api/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns user history", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);
    const history = [
      { id: "h1", videoId: "yt1", videoTitle: "Video 1" },
    ];
    vi.mocked(prisma.videoHistory.findMany).mockResolvedValue(history as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.history).toEqual(history);
    expect(prisma.videoHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user1" },
        orderBy: { updatedAt: "desc" },
      })
    );
  });
});

describe("POST /api/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost/api/history", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when required fields missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);

    const request = new NextRequest("http://localhost/api/history", {
      method: "POST",
      body: JSON.stringify({ videoId: "yt1" }), // missing videoTitle and videoUrl
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("upserts history entry on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);
    const entry = {
      id: "h1",
      videoId: "yt1",
      videoTitle: "Test Video",
      videoUrl: "https://youtube.com/watch?v=yt1",
      lastStep: "analyze",
    };
    vi.mocked(prisma.videoHistory.upsert).mockResolvedValue(entry as any);

    const request = new NextRequest("http://localhost/api/history", {
      method: "POST",
      body: JSON.stringify({
        videoId: "yt1",
        videoTitle: "Test Video",
        videoUrl: "https://youtube.com/watch?v=yt1",
        lastStep: "analyze",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.entry).toEqual(entry);
    expect(prisma.videoHistory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_videoId: {
            userId: "user1",
            videoId: "yt1",
          },
        },
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);
    vi.mocked(prisma.videoHistory.upsert).mockRejectedValue(
      new Error("DB error")
    );

    const request = new NextRequest("http://localhost/api/history", {
      method: "POST",
      body: JSON.stringify({
        videoId: "yt1",
        videoTitle: "Test",
        videoUrl: "https://youtube.com/watch?v=yt1",
        lastStep: "search",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
