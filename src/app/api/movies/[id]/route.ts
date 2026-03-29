import { NextRequest, NextResponse } from "next/server";
import { getMovie } from "@/lib/scraper";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const movie = await getMovie(id);
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    return NextResponse.json({ movie });
  } catch (error) {
    console.error(`Failed to fetch movie ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch movie" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/movies/[id] - Update movie fields
 * Owner can edit their own movies, admin can edit any movie
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, year, director, screenplay, music, cast, plot, thumbnail, posterUrl, csfdId } = body;

  const data = {
    ...(title !== undefined && { title: typeof title === "string" ? title.trim() : title }),
    ...(year !== undefined && { year }),
    ...(director !== undefined && { director }),
    ...(screenplay !== undefined && { screenplay }),
    ...(music !== undefined && { music }),
    ...(cast !== undefined && { cast }),
    ...(plot !== undefined && { plot }),
    ...(posterUrl !== undefined && { posterUrl }),
    ...(csfdId !== undefined && { csfdId }),
  };

  const movie = await prisma.userMovie.findUnique({ where: { id } });
  if (!movie) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Owner can edit their own, admin can edit any
  const isOwner = movie.userId === session.user.id;
  if (!isOwner) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const updated = await prisma.userMovie.update({
    where: { id },
    data: {
      ...data,
      ...(thumbnail !== undefined && { thumbnail }),
    },
  });
  return NextResponse.json({ movie: updated });
}
