import { NextRequest, NextResponse } from "next/server";
import { getMovie } from "@/lib/scraper";

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
