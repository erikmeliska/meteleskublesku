import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock scraper
vi.mock("@/lib/scraper", () => ({
  getMovieList: vi.fn(),
  getMovie: vi.fn(),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userMovie: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "../movies/route";
import { GET as GET_BY_ID, PATCH } from "../movies/[id]/route";
import { getMovieList, getMovie } from "@/lib/scraper";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockGetMovieList = vi.mocked(getMovieList);
const mockGetMovie = vi.mocked(getMovie);
const mockAuth = vi.mocked(auth);

describe("GET /api/movies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns movie list on success", async () => {
    const movies = [
      { id: "1", title: "Movie 1", image: null, desc: [] },
    ];
    mockGetMovieList.mockResolvedValue(movies);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.movies).toEqual(movies);
  });

  it("returns 500 on error", async () => {
    mockGetMovieList.mockRejectedValue(new Error("Network error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch movie list");
  });
});

describe("GET /api/movies/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns movie when found", async () => {
    const movie = {
      id: "abc",
      title: "Test",
      image: null,
      desc: [],
      audio: [],
      images: [],
    };
    mockGetMovie.mockResolvedValue(movie);

    const request = new NextRequest("http://localhost/api/movies/abc");
    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: "abc" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.movie).toEqual(movie);
  });

  it("returns 404 when movie not found", async () => {
    mockGetMovie.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/movies/xxx");
    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: "xxx" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Movie not found");
  });

  it("returns 500 on error", async () => {
    mockGetMovie.mockRejectedValue(new Error("fail"));

    const request = new NextRequest("http://localhost/api/movies/abc");
    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(500);
  });
});

describe("PATCH /api/movies/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost/api/movies/abc", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when movie not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);
    vi.mocked(prisma.userMovie.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/movies/abc", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(404);
  });

  it("allows owner to update their movie", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } } as any);
    vi.mocked(prisma.userMovie.findUnique).mockResolvedValue({
      id: "abc",
      userId: "user1",
    } as any);
    vi.mocked(prisma.userMovie.update).mockResolvedValue({
      id: "abc",
      title: "New Title",
    } as any);

    const request = new NextRequest("http://localhost/api/movies/abc", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "abc" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.movie.title).toBe("New Title");
  });

  it("returns 403 when non-owner non-admin tries to update", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user2" } } as any);
    vi.mocked(prisma.userMovie.findUnique).mockResolvedValue({
      id: "abc",
      userId: "user1",
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: "user",
    } as any);

    const request = new NextRequest("http://localhost/api/movies/abc", {
      method: "PATCH",
      body: JSON.stringify({ title: "Hacked" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(403);
  });

  it("allows admin to update any movie", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1" } } as any);
    vi.mocked(prisma.userMovie.findUnique).mockResolvedValue({
      id: "abc",
      userId: "user1",
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: "admin",
    } as any);
    vi.mocked(prisma.userMovie.update).mockResolvedValue({
      id: "abc",
      title: "Admin Edit",
    } as any);

    const request = new NextRequest("http://localhost/api/movies/abc", {
      method: "PATCH",
      body: JSON.stringify({ title: "Admin Edit" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(200);
  });
});
