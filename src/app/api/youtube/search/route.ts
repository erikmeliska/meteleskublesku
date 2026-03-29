import { NextRequest, NextResponse } from "next/server";
import YouTube from "youtube-sr";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter" },
      { status: 400 }
    );
  }

  try {
    const videos = await YouTube.search(query, { limit: 20, type: "video" });

    const items = videos.map((video) => ({
      type: "video",
      title: video.title || "",
      url: `https://www.youtube.com/watch?v=${video.id}`,
      bestThumbnail: {
        url: video.thumbnail?.url || null,
        width: video.thumbnail?.width || 0,
        height: video.thumbnail?.height || 0,
      },
      duration: video.durationFormatted || null,
      views: video.views || null,
      author: video.channel
        ? { name: video.channel.name || "", url: video.channel.url || "" }
        : null,
      uploadedAt: video.uploadedAt || null,
    }));

    return NextResponse.json({
      searchResults: {
        items,
        estimatedResults: items.length,
      },
    });
  } catch (error) {
    console.error("YouTube search error:", error);
    return NextResponse.json(
      { error: "YouTube search failed" },
      { status: 500 }
    );
  }
}
