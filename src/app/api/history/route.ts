import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/history - Get user's video history
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await prisma.videoHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      videoId: true,
      videoTitle: true,
      videoUrl: true,
      thumbnail: true,
      duration: true,
      author: true,
      lastStep: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ history });
}

/**
 * POST /api/history - Save or update video history entry
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { videoId, videoTitle, videoUrl, thumbnail, duration, author, subtitleCues, quotes, lastStep } = body as {
      videoId: string;
      videoTitle: string;
      videoUrl: string;
      thumbnail?: string;
      duration?: string;
      author?: string;
      subtitleCues?: string;
      quotes?: string;
      lastStep: string;
    };

    if (!videoId || !videoTitle || !videoUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const entry = await prisma.videoHistory.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId,
        },
      },
      update: {
        videoTitle,
        videoUrl,
        thumbnail: thumbnail || "",
        duration: duration || "",
        author: author || "",
        ...(subtitleCues !== undefined && { subtitleCues }),
        ...(quotes !== undefined && { quotes }),
        lastStep,
      },
      create: {
        userId: session.user.id,
        videoId,
        videoTitle,
        videoUrl,
        thumbnail: thumbnail || "",
        duration: duration || "",
        author: author || "",
        subtitleCues: subtitleCues || null,
        quotes: quotes || null,
        lastStep,
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("History save error:", error);
    return NextResponse.json(
      { error: "Failed to save history", details: String(error) },
      { status: 500 }
    );
  }
}
