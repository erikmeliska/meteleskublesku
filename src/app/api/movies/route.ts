import { NextResponse } from "next/server";
import { getMovieList } from "@/lib/scraper";

export async function GET() {
  try {
    const movies = await getMovieList();
    return NextResponse.json({ movies });
  } catch (error) {
    console.error("Failed to fetch movie list:", error);
    return NextResponse.json(
      { error: "Failed to fetch movie list" },
      { status: 500 }
    );
  }
}
