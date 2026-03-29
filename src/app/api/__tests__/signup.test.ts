import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
  },
}));

import { POST } from "../auth/signup/route";
import { prisma } from "@/lib/prisma";

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid email", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Test",
        email: "not-an-email",
        password: "12345678",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });

  it("returns 400 for short password", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Test",
        email: "test@example.com",
        password: "short",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for short name", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "A",
        email: "test@example.com",
        password: "12345678",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 409 when email already exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing",
      email: "test@example.com",
    } as any);

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        password: "12345678",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain("existuje");
  });

  it("creates user and returns 201 on success", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "new-user",
      name: "Test User",
      email: "test@example.com",
    } as any);

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        password: "securepassword",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Test User",
        email: "test@example.com",
        password: "hashed_password",
      },
    });
  });

  it("returns 500 when database throws", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        password: "12345678",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
