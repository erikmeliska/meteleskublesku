import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMovie } from "@/lib/scraper";

/**
 * Parse "M:SS" or "H:MM:SS" to seconds
 */
function parseLengthToSeconds(length: string): number {
  const parts = length.split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

/**
 * POST /api/admin/update-durations
 * Backfill durations for legacy clips from scraper cache
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all legacy movies
  const legacyMovies = await prisma.userMovie.findMany({
    where: { videoId: { startsWith: "legacy-" } },
    select: { id: true, videoId: true },
  });

  let updated = 0;
  const errors: string[] = [];

  for (const movie of legacyMovies) {
    try {
      const legacyId = movie.videoId.replace("legacy-", "");
      const detail = await getMovie(legacyId);
      if (!detail?.audio?.length) continue;

      // Build URL → duration map
      const durationMap = new Map<string, number>();
      for (const track of detail.audio) {
        const dur = parseLengthToSeconds(track.length);
        if (dur > 0) durationMap.set(track.url, dur);
      }

      // Update clips matching this movie
      const clips = await prisma.userClip.findMany({
        where: { movieId: movie.id, duration: 0 },
        select: { id: true, audioPath: true },
      });

      for (const clip of clips) {
        const dur = durationMap.get(clip.audioPath);
        if (dur) {
          await prisma.userClip.update({
            where: { id: clip.id },
            data: { duration: dur },
          });
          updated++;
        }
      }

      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      errors.push(`${movie.id}: ${String(err)}`);
    }
  }

  // Invalidate clip caches after duration updates
  if (updated > 0) {
    revalidateTag("clips", "max");
  }

  return NextResponse.json({ updated, totalMovies: legacyMovies.length, errors: errors.slice(0, 10) });
}
