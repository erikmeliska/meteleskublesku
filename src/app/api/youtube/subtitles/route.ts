import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { parseVTT } from "@/lib/gemini";
import { getYtDlpPath, withCookies, isCookieError } from "@/lib/ytdlp";

const execFileAsync = promisify(execFile);
const CACHE_DIR = path.resolve(process.cwd(), ".cache/temp");

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

/**
 * POST /api/youtube/subtitles
 * Downloads subtitles for a YouTube video and returns parsed cues + video info
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    const videoDir = path.join(CACHE_DIR, videoId);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    const ytdlp = getYtDlpPath();

    // Step 1: Get video info
    const infoArgs = await withCookies([
      "--dump-single-json",
      "--no-download",
      "--no-warnings",
      url,
    ]);
    const { stdout: infoJson } = await execFileAsync(ytdlp, infoArgs);
    const info = JSON.parse(infoJson);

    const videoInfo = {
      videoId: info.id,
      title: info.title,
      description: info.description || "",
      duration: info.duration,
      thumbnail: info.thumbnail,
      subtitleLanguages: Object.keys(info.subtitles || {}),
      autoSubtitleLanguages: Object.keys(info.automatic_captions || {}),
    };

    // Save video info
    fs.writeFileSync(
      path.join(videoDir, "info.json"),
      JSON.stringify(videoInfo, null, 2)
    );

    // Step 2: Download subtitles (prefer manual, fallback to auto)
    const hasManualSubs = videoInfo.subtitleLanguages.some((l: string) =>
      ["sk", "cs", "cs-CZ", "sk-SK"].includes(l)
    );
    const hasAutoSubs = videoInfo.autoSubtitleLanguages.some((l: string) =>
      ["sk", "cs", "cs-CZ", "sk-SK"].includes(l)
    );

    if (!hasManualSubs && !hasAutoSubs) {
      return NextResponse.json({
        videoInfo,
        subtitles: null,
        message: "Žiadne slovenské/české titulky nie sú k dispozícii",
      });
    }

    // Download subtitles
    const subArgs = await withCookies([
      hasManualSubs ? "--write-sub" : "--write-auto-sub",
      "--sub-lang", "sk,cs,cs-CZ,sk-SK",
      "--sub-format", "vtt",
      "--skip-download",
      "-o", path.join(videoDir, "%(id)s"),
      url,
    ]);

    try {
      await execFileAsync(ytdlp, subArgs);
    } catch {
      // Try with auto-subs if manual failed
      if (hasManualSubs && hasAutoSubs) {
        const fallbackArgs = await withCookies([
          "--write-auto-sub",
          "--sub-lang", "sk,cs,cs-CZ,sk-SK",
          "--sub-format", "vtt",
          "--skip-download",
          "-o", path.join(videoDir, "%(id)s"),
          url,
        ]);
        await execFileAsync(ytdlp, fallbackArgs);
      }
    }

    // Step 3: Parse subtitles
    const vttFiles = fs.readdirSync(videoDir).filter((f) => f.endsWith(".vtt"));

    if (vttFiles.length === 0) {
      return NextResponse.json({
        videoInfo,
        subtitles: null,
        message: "Titulky sa nepodarilo stiahnuť",
      });
    }

    const vttContent = fs.readFileSync(path.join(videoDir, vttFiles[0]), "utf8");
    const cues = parseVTT(vttContent);

    return NextResponse.json({
      videoInfo,
      subtitles: cues,
      subtitleFile: vttFiles[0],
      cueCount: cues.length,
    });
  } catch (error) {
    console.error("Subtitles error:", error);

    if (isCookieError(error)) {
      return NextResponse.json(
        {
          error: "YouTube vyžaduje prihlásenie",
          needsCookies: true,
          details: "Pre sťahovanie tohto videa sú potrebné YouTube cookies. Nastavte ich v Nastaveniach.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to download subtitles", details: String(error) },
      { status: 500 }
    );
  }
}
