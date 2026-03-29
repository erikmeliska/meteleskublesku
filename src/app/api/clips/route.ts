import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function generateMovieId(): string {
  return `mov_${crypto.randomBytes(8).toString("base64url")}`;
}

function generateClipId(): string {
  return `clip_${crypto.randomBytes(8).toString("base64url")}`;
}

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
    const { clips, assignedMovieId } = body as {
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
      assignedMovieId?: string;
    };

    if (!clips?.length) {
      return NextResponse.json(
        { error: "No clips to save" },
        { status: 400 }
      );
    }

    // Determine movie ID: use assigned movie or create/find one
    const videoIds = [...new Set(clips.map((c) => c.videoId))];
    const movieIdMap = new Map<string, string>();

    if (assignedMovieId) {
      // Assign all clips to the specified existing movie
      for (const videoId of videoIds) {
        movieIdMap.set(videoId, assignedMovieId);
      }
    } else {
      // Create or find UserMovie for each unique videoId
      for (const videoId of videoIds) {
        const existing = await prisma.userMovie.findUnique({
          where: {
            userId_videoId: {
              userId: session.user.id,
              videoId,
            },
          },
        });

        if (existing) {
          movieIdMap.set(videoId, existing.id);
        } else {
          const clip = clips.find((c) => c.videoId === videoId)!;
          const movie = await prisma.userMovie.create({
            data: {
              id: generateMovieId(),
              userId: session.user.id,
              videoId,
              title: clip.filmTitle,
              thumbnail: clip.imageMiddle || null,
            },
          });
          movieIdMap.set(videoId, movie.id);
        }
      }
    }

    const savedClips = await Promise.all(
      clips.map(async (clip) => {
        const shareHash = crypto.randomBytes(8).toString("hex");
        const movieId = movieIdMap.get(clip.videoId)!;

        return prisma.userClip.create({
          data: {
            id: generateClipId(),
            userId: session.user!.id!,
            videoId: clip.videoId,
            movieId,
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

/**
 * DELETE /api/clips?id=clip_xxx - Delete a clip
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clipId = request.nextUrl.searchParams.get("id");
  if (!clipId) {
    return NextResponse.json({ error: "Missing clip id" }, { status: 400 });
  }

  const clip = await prisma.userClip.findUnique({ where: { id: clipId } });
  if (!clip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Owner or admin can delete
  if (clip.userId !== session.user.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.userClip.delete({ where: { id: clipId } });
  return NextResponse.json({ success: true });
}
