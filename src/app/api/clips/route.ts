import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * GET /api/clips - Get user's clips
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clips = await prisma.userClip.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ clips });
}

/**
 * POST /api/clips - Save extracted clips
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clips } = body as {
      clips: Array<{
        videoId: string;
        filmTitle: string;
        quoteText: string;
        audioPath: string;
        imageBegin?: string;
        imageMiddle?: string;
        imageEnd?: string;
        beginTime: number;
        endTime: number;
        duration: number;
        subtitles?: string;
        source?: string;
      }>;
    };

    if (!clips?.length) {
      return NextResponse.json(
        { error: "No clips to save" },
        { status: 400 }
      );
    }

    const savedClips = await Promise.all(
      clips.map(async (clip) => {
        const shareHash = crypto.randomBytes(8).toString("hex");

        return prisma.userClip.create({
          data: {
            userId: session.user!.id!,
            videoId: clip.videoId,
            name: clip.quoteText.slice(0, 100),
            filmTitle: clip.filmTitle,
            quoteText: clip.quoteText,
            audioPath: clip.audioPath,
            imageBegin: clip.imageBegin,
            imageMiddle: clip.imageMiddle,
            imageEnd: clip.imageEnd,
            beginTime: clip.beginTime,
            endTime: clip.endTime,
            duration: clip.duration,
            subtitles: clip.subtitles,
            source: clip.source || "gemini",
            shareHash,
          },
        });
      })
    );

    return NextResponse.json({
      savedClips,
      count: savedClips.length,
    });
  } catch (error) {
    console.error("Save clips error:", error);
    return NextResponse.json(
      { error: "Failed to save clips", details: String(error) },
      { status: 500 }
    );
  }
}
