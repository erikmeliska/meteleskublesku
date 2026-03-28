import { NextRequest, NextResponse } from "next/server";
import ytsr from "ytsr";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter" },
      { status: 400 }
    );
  }

  try {
    const results = await ytsr(query, { pages: 1, hl: "sk" });
    return NextResponse.json({ searchResults: results });
  } catch (error) {
    console.error("YouTube search error:", error);
    return NextResponse.json(
      { error: "YouTube search failed" },
      { status: 500 }
    );
  }
}
