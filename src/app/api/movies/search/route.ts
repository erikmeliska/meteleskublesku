import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/movies/search?q=... - Search movies in DB by title
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ movies: [] });
  }

  const movies = await prisma.userMovie.findMany({
    where: {
      title: { contains: query },
    },
    select: {
      id: true,
      title: true,
      year: true,
      posterUrl: true,
      thumbnail: true,
    },
    take: 10,
    orderBy: { title: "asc" },
  });

  return NextResponse.json({
    movies: movies.map((m) => ({
      id: m.id,
      title: m.title,
      year: m.year,
      posterUrl: m.posterUrl || m.thumbnail,
    })),
  });
}
