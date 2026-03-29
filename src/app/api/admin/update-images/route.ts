import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMovie } from "@/lib/scraper";

/**
 * POST /api/admin/update-images
 * Backfill images for legacy movies that were imported without them
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

  const legacyMovies = await prisma.userMovie.findMany({
    where: {
      videoId: { startsWith: "legacy-" },
      images: null,
    },
  });

  console.log(`Updating images for ${legacyMovies.length} movies...`);
  let updated = 0;
  const errors: string[] = [];

  for (const movie of legacyMovies) {
    try {
      const legacyId = movie.videoId.replace("legacy-", "");
      const detail = await getMovie(legacyId);
      if (!detail || !detail.images.length) continue;

      await prisma.userMovie.update({
        where: { id: movie.id },
        data: {
          images: JSON.stringify(detail.images),
          thumbnail: movie.thumbnail || detail.images[0]?.url || null,
        },
      });
      updated++;
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      errors.push(`${movie.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ updated, errors: errors.slice(0, 10), totalErrors: errors.length });
}
