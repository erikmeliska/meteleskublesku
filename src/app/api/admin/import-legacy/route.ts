import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMovieList, getMovie } from "@/lib/scraper";
import { parseMovieTitle } from "@/lib/utils";
import crypto from "crypto";

function generateMovieId(): string {
  return `mov_${crypto.randomBytes(8).toString("base64url")}`;
}

function generateClipId(): string {
  return `clip_${crypto.randomBytes(8).toString("base64url")}`;
}

/**
 * POST /api/admin/import-legacy
 * One-time import of all legacy scraped movies into UserMovie + UserClip
 * Admin only
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

  try {
    // Create or find legacy user
    let legacyUser = await prisma.user.findFirst({
      where: { email: "legacy@meteleskublesku.cz" },
    });

    if (!legacyUser) {
      legacyUser = await prisma.user.create({
        data: {
          id: "legacy-meteleskublesku",
          email: "legacy@meteleskublesku.cz",
          name: "Meteleskublesku Legacy",
          role: "legacy",
        },
      });
    }

    // Fetch all legacy movies
    const movieList = await getMovieList();
    console.log(`Importing ${movieList.length} legacy movies...`);

    let moviesImported = 0;
    let clipsImported = 0;
    const errors: string[] = [];

    for (const item of movieList) {
      try {
        // Check if already imported (by legacy videoId = legacy-{id})
        const legacyVideoId = `legacy-${item.id}`;
        const existing = await prisma.userMovie.findUnique({
          where: { userId_videoId: { userId: legacyUser.id, videoId: legacyVideoId } },
        });
        if (existing) continue;

        // Fetch full movie details
        const detail = await getMovie(item.id);
        if (!detail) {
          errors.push(`Failed to fetch: ${item.id}`);
          continue;
        }

        const { title, year } = parseMovieTitle(detail.title);
        const yearNum = year ? parseInt(year) : null;

        // Extract metadata from desc
        const extractField = (prefix: string): string | null => {
          const line = detail.desc.find((d) => d.startsWith(prefix));
          return line ? line.replace(prefix, "").trim() : null;
        };

        const movieId = generateMovieId();

        // Create UserMovie
        await prisma.userMovie.create({
          data: {
            id: movieId,
            userId: legacyUser.id,
            videoId: legacyVideoId,
            title: title,
            year: yearNum,
            director: extractField("Režie:"),
            screenplay: extractField("Scénář:"),
            music: extractField("Hudba:"),
            cast: extractField("Hrají:"),
            thumbnail: detail.images[0]?.url || null,
            images: detail.images.length > 0 ? JSON.stringify(detail.images) : null,
          },
        });
        moviesImported++;

        // Create UserClips for each audio track
        for (const track of detail.audio) {
          const shareHash = crypto.randomBytes(8).toString("hex");
          await prisma.userClip.create({
            data: {
              id: generateClipId(),
              userId: legacyUser.id,
              movieId,
              videoId: legacyVideoId,
              name: track.text.slice(0, 100),
              filmTitle: title,
              quoteText: track.text,
              audioPath: track.url,
              beginTime: 0,
              endTime: 0,
              duration: 0,
              source: "legacy",
              shareHash,
            },
          });
          clipsImported++;
        }

        // Throttle to avoid overloading the old server
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        errors.push(`${item.id}: ${String(err)}`);
      }
    }

    // Invalidate all caches after bulk import
    revalidateTag("movies", "max");
    revalidateTag("clips", "max");

    return NextResponse.json({
      success: true,
      legacyUserId: legacyUser.id,
      moviesImported,
      clipsImported,
      errors: errors.slice(0, 20),
      totalErrors: errors.length,
    });
  } catch (error) {
    console.error("Legacy import error:", error);
    return NextResponse.json(
      { error: "Import failed", details: String(error) },
      { status: 500 }
    );
  }
}
