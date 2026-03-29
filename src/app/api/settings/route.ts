import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ytCookies: true },
  });

  return NextResponse.json({
    hasCookies: !!user?.ytCookies,
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ytCookies } = body;

  // Validate cookies format
  if (ytCookies && typeof ytCookies === "string" && ytCookies.trim()) {
    const lines = ytCookies.trim().split("\n");
    const hasHeader = lines.some(
      (l: string) => l.includes("Netscape HTTP Cookie File") || l.includes("HTTP Cookie File")
    );
    if (!hasHeader) {
      return NextResponse.json(
        { error: "Neplatný formát. Súbor musí začínať s '# Netscape HTTP Cookie File'" },
        { status: 400 }
      );
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { ytCookies: ytCookies?.trim() || null },
  });

  return NextResponse.json({ ok: true });
}
