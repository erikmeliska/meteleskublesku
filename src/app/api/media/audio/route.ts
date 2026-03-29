import { NextRequest, NextResponse } from "next/server";
import { readBinaryCache, writeBinaryCache } from "@/lib/cache";

const OLD_URL = process.env.NEXT_PUBLIC_OLD_URL || "http://meteleskublesku.cz";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Get or fetch the full buffer
  let buffer = readBinaryCache(path);
  if (!buffer) {
    try {
      const response = await fetch(`${OLD_URL}/${path}`);
      if (!response.ok) {
        return NextResponse.json({ error: "Audio not found" }, { status: 404 });
      }
      buffer = Buffer.from(await response.arrayBuffer());
      writeBinaryCache(path, buffer);
    } catch {
      return NextResponse.json({ error: "Audio not found" }, { status: 404 });
    }
  }

  const total = buffer.length;
  const rangeHeader = request.headers.get("range");

  // Support range requests for seekable audio
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1]);
      const end = match[2] ? parseInt(match[2]) : total - 1;
      const chunk = buffer.subarray(start, end + 1);

      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(chunk.length),
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
