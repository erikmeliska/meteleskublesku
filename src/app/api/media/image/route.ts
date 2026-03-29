import { NextRequest, NextResponse } from "next/server";
import { readBinaryCache, writeBinaryCache } from "@/lib/cache";

const OLD_URL = process.env.NEXT_PUBLIC_OLD_URL || "http://meteleskublesku.cz";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  const contentType = path.endsWith(".png") ? "image/png" : "image/jpeg";

  // Serve from cache
  const cached = readBinaryCache(path);
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Fetch from original server
  try {
    const response = await fetch(`${OLD_URL}/${path}`);
    if (!response.ok) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    writeBinaryCache(path, buffer);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
