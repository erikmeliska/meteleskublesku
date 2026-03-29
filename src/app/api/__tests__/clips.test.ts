import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userClip: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    userMovie: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock crypto
vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue("random123"),
    }),
  },
}));

import { GET, POST, DELETE } from "../clips/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);

describe("GET /api/clips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns user clips", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);
    const clips = [
      { id: "clip_1", name: "Quote 1", userId: "user1" },
    ];
    vi.mocked(prisma.userClip.findMany).mockResolvedValue(clips as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.clips).toEqual(clips);
  });
});

describe("POST /api/clips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost/api/clips", {
      method: "POST",
      body: JSON.stringify({ clips: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when no clips provided", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);

    const request = new NextRequest("http://localhost/api/clips", {
      method: "POST",
      body: JSON.stringify({ clips: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("saves clips and creates movie when needed", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);
    vi.mocked(prisma.userMovie.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userMovie.create).mockResolvedValue({
      id: "mov_random123",
    } as any);
    vi.mocked(prisma.userClip.create).mockResolvedValue({
      id: "clip_random123",
      name: "Test quote",
    } as any);

    const request = new NextRequest("http://localhost/api/clips", {
      method: "POST",
      body: JSON.stringify({
        clips: [
          {
            videoId: "yt123",
            filmTitle: "Test Film",
            quoteText: "Famous quote",
            audioPath: "/audio/clip.mp3",
            beginTime: 10,
            endTime: 15,
            duration: 5,
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(1);
    expect(prisma.userMovie.create).toHaveBeenCalled();
    expect(prisma.userClip.create).toHaveBeenCalled();
  });

  it("uses assigned movie ID when provided", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);
    vi.mocked(prisma.userClip.create).mockResolvedValue({
      id: "clip_random123",
      movieId: "existing-movie",
    } as any);

    const request = new NextRequest("http://localhost/api/clips", {
      method: "POST",
      body: JSON.stringify({
        clips: [
          {
            videoId: "yt123",
            filmTitle: "Test",
            quoteText: "Quote",
            audioPath: "/a.mp3",
            beginTime: 0,
            endTime: 5,
            duration: 5,
          },
        ],
        assignedMovieId: "existing-movie",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    // Should NOT try to create a new movie
    expect(prisma.userMovie.create).not.toHaveBeenCalled();
    expect(prisma.userMovie.findUnique).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/clips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost/api/clips?id=clip_1", {
      method: "DELETE",
    });

    const response = await DELETE(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when no clip id provided", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);

    const request = new NextRequest("http://localhost/api/clips", {
      method: "DELETE",
    });

    const response = await DELETE(request);
    expect(response.status).toBe(400);
  });

  it("returns 404 when clip not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);
    vi.mocked(prisma.userClip.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/clips?id=clip_xxx", {
      method: "DELETE",
    });

    const response = await DELETE(request);
    expect(response.status).toBe(404);
  });

  it("allows owner to delete their clip", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);
    vi.mocked(prisma.userClip.findUnique).mockResolvedValue({
      id: "clip_1",
      userId: "user1",
    } as any);
    vi.mocked(prisma.userClip.delete).mockResolvedValue({} as any);

    const request = new NextRequest("http://localhost/api/clips?id=clip_1", {
      method: "DELETE",
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 403 when non-owner non-admin tries to delete", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user2" } } as any);
    vi.mocked(prisma.userClip.findUnique).mockResolvedValue({
      id: "clip_1",
      userId: "user1",
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: "user",
    } as any);

    const request = new NextRequest("http://localhost/api/clips?id=clip_1", {
      method: "DELETE",
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
  });

  it("allows admin to delete any clip", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1" } } as any);
    vi.mocked(prisma.userClip.findUnique).mockResolvedValue({
      id: "clip_1",
      userId: "user1",
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: "admin",
    } as any);
    vi.mocked(prisma.userClip.delete).mockResolvedValue({} as any);

    const request = new NextRequest("http://localhost/api/clips?id=clip_1", {
      method: "DELETE",
    });

    const response = await DELETE(request);
    expect(response.status).toBe(200);
  });
});
