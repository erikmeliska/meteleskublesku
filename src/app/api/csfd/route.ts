import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { csfd } from "node-csfd-api";
import { parse } from "node-html-parser";

const SK_ORIGINS = ["slovensko", "československo"];

function isSlovakFilm(origins: string[]): boolean {
  return origins.some((o) => SK_ORIGINS.includes(o.toLowerCase()));
}

/**
 * Scrape poster + description from a CSFD domain (csfd.sk or csfd.cz)
 */
async function fetchFromCsfd(
  csfdId: number,
  domain: "csfd.sk" | "csfd.cz"
): Promise<{
  poster: string | null;
  description: string | null;
}> {
  try {
    const url =
      domain === "csfd.sk"
        ? `https://www.csfd.sk/film/${csfdId}/prehlad/`
        : `https://www.csfd.cz/film/${csfdId}/prehled/`;

    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return { poster: null, description: null };

    const html = await res.text();
    const root = parse(html);

    // Poster
    const posterImg = root.querySelectorAll("img").find((img) => {
      const src = img.getAttribute("src") || "";
      return src.includes("poster");
    });
    let poster: string | null = null;
    if (posterImg) {
      let src = posterImg.getAttribute("src") || "";
      src = src.replace(/w\d+/, "w360");
      if (src.startsWith("//")) src = `https:${src}`;
      poster = src;
    }

    // Description
    const descEl = root.querySelector(".plot-full");
    const description = descEl?.text?.trim() || null;

    return { poster, description };
  } catch {
    return { poster: null, description: null };
  }
}

/**
 * GET /api/csfd?query=... - Search CSFD for movies
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("query");
  if (!query?.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const results = await csfd.search(query);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movies = (results.movies || []).slice(0, 10).map((m: any) => ({
      csfdId: m.id,
      title: m.title,
      year: m.year,
      poster: m.poster,
      url: m.url,
      origins: m.origins,
      directors: m.creators?.directors?.map((d: { name: string }) => d.name) || [],
      actors: m.creators?.actors?.map((a: { name: string }) => a.name) || [],
    }));

    return NextResponse.json({ movies });
  } catch (error) {
    console.error("CSFD search error:", error);
    return NextResponse.json(
      { error: "CSFD search failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/csfd - Get full movie details by CSFD ID
 * Slovak/Czechoslovak films → csfd.sk (SK poster + SK description)
 * Czech/other films → csfd.cz (CZ poster + CZ description)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { csfdId, origins } = await request.json();
    if (!csfdId) {
      return NextResponse.json({ error: "Missing csfdId" }, { status: 400 });
    }

    const useSk = isSlovakFilm(origins || []);
    const domain = useSk ? "csfd.sk" : "csfd.cz";

    // Fetch structured data from library + poster/description from appropriate domain
    const [movieCz, scraped] = await Promise.all([
      csfd.movie(csfdId),
      fetchFromCsfd(csfdId, domain),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creators = movieCz.creators as any;

    // Use scraped description from the right domain, fallback to library
    const plot = scraped.description || movieCz.descriptions?.[0] || null;

    // Use scraped poster from the right domain, fallback to library
    const posterUrl = scraped.poster || movieCz.poster || null;

    return NextResponse.json({
      movie: {
        csfdId,
        title: movieCz.title,
        year: movieCz.year,
        director: creators?.directors?.map((d: { name: string }) => d.name).join(", ") || null,
        screenplay: creators?.writers?.map((w: { name: string }) => w.name).join(", ") || null,
        music: creators?.composers?.map((c: { name: string }) => c.name).join(", ") || null,
        cast: creators?.actors?.slice(0, 10).map((a: { name: string }) => a.name).join(", ") || null,
        plot,
        posterUrl,
        genres: movieCz.genres || [],
        origins: movieCz.origins || [],
      },
    });
  } catch (error) {
    console.error("CSFD detail error:", error);
    return NextResponse.json(
      { error: "CSFD detail fetch failed" },
      { status: 500 }
    );
  }
}
