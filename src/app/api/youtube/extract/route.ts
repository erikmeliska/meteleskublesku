import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import ffmpeg from "fluent-ffmpeg";
import { parseTimeToSeconds } from "@/lib/utils";

const execFileAsync = promisify(execFile);
const CACHE_DIR = path.resolve(process.cwd(), ".cache/temp");

function getYtDlpPath(): string {
  return process.env.YT_DLP_PATH || "yt-dlp";
}

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function ffmpegExtract(
  input: string,
  startSec: number,
  durationSec: number,
  output: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(startSec)
      .duration(durationSec)
      .audioCodec("libmp3lame")
      .audioBitrate(192)
      .noVideo()
      .output(output)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

function ffmpegScreenshot(
  input: string,
  timeSec: number,
  output: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .screenshots({
        timestamps: [timeSec],
        filename: path.basename(output),
        folder: path.dirname(output),
        size: "640x360",
      })
      .on("end", () => resolve())
      .on("error", reject);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, start, end, name, resolution = "720" } = body;

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

    // Get video info if no time range specified
    if (!start && !end) {
      const ytdlp = getYtDlpPath();
      const { stdout } = await execFileAsync(ytdlp, [
        "--dump-single-json",
        "--no-download",
        "--no-warnings",
        url,
      ]);
      const info = JSON.parse(stdout);
      return NextResponse.json({
        info: {
          videoId: info.id,
          title: info.title,
          description: info.description,
          duration: info.duration,
          thumbnail: info.thumbnail,
          subtitleLanguages: Object.keys(info.subtitles || {}),
          autoSubtitleLanguages: Object.keys(info.automatic_captions || {}),
        },
      });
    }

    const startSec = typeof start === "string" ? parseTimeToSeconds(start) : start;
    const endSec = typeof end === "string" ? parseTimeToSeconds(end) : end;
    const durationSec = endSec - startSec;

    if (durationSec <= 0 || durationSec > 300) {
      return NextResponse.json(
        { error: "Invalid time range (max 5 minutes)" },
        { status: 400 }
      );
    }

    // Download video if not cached
    const videoPath = path.join(videoDir, "video.mp4");
    if (!fs.existsSync(videoPath)) {
      const ytdlp = getYtDlpPath();
      await execFileAsync(ytdlp, [
        "-f",
        `bestvideo[height<=${resolution}]+bestaudio/best[height<=${resolution}]`,
        "--merge-output-format",
        "mp4",
        "-o",
        videoPath,
        url,
      ]);
    }

    // Download subtitles if not cached
    const subtitlePath = path.join(videoDir, `${videoId}.sk.vtt`);
    if (!fs.existsSync(subtitlePath)) {
      try {
        const ytdlp = getYtDlpPath();
        await execFileAsync(ytdlp, [
          "--write-auto-sub",
          "--write-sub",
          "--sub-lang",
          "sk,cs",
          "--sub-format",
          "vtt",
          "--skip-download",
          "-o",
          path.join(videoDir, "%(id)s"),
          url,
        ]);
      } catch {
        // Subtitles not available, continue without them
      }
    }

    // Extract audio segment
    const sampleName = name || `${startSec}-${endSec}`;
    const audioFile = `audio_${startSec}-${endSec}.mp3`;
    const audioPath = path.join(videoDir, audioFile);

    if (!fs.existsSync(audioPath)) {
      await ffmpegExtract(videoPath, startSec, durationSec, audioPath);
    }

    // Extract 3 frames: begin, middle, end
    const midSec = startSec + durationSec / 2;
    const frames = {
      begin: `image_${startSec}_begin.png`,
      middle: `image_${midSec}_middle.png`,
      end: `image_${endSec}_end.png`,
    };

    for (const [key, filename] of Object.entries(frames)) {
      const framePath = path.join(videoDir, filename);
      if (!fs.existsSync(framePath)) {
        const timeSec =
          key === "begin" ? startSec : key === "middle" ? midSec : endSec - 0.5;
        try {
          await ffmpegScreenshot(videoPath, timeSec, framePath);
        } catch {
          // Frame extraction failed, continue
        }
      }
    }

    // Parse subtitles for time range
    let subtitleText = "";
    const vttFiles = fs.readdirSync(videoDir).filter((f) => f.endsWith(".vtt"));
    if (vttFiles.length > 0) {
      try {
        const vttContent = fs.readFileSync(
          path.join(videoDir, vttFiles[0]),
          "utf8"
        );
        // Simple VTT parsing
        const lines = vttContent.split("\n");
        const subs: string[] = [];
        let currentStart = 0;
        let currentEnd = 0;

        for (let i = 0; i < lines.length; i++) {
          const timeMatch = lines[i].match(
            /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
          );
          if (timeMatch) {
            currentStart =
              parseInt(timeMatch[1]) * 3600 +
              parseInt(timeMatch[2]) * 60 +
              parseInt(timeMatch[3]) +
              parseInt(timeMatch[4]) / 1000;
            currentEnd =
              parseInt(timeMatch[5]) * 3600 +
              parseInt(timeMatch[6]) * 60 +
              parseInt(timeMatch[7]) +
              parseInt(timeMatch[8]) / 1000;

            if (currentStart >= startSec && currentEnd <= endSec + 1) {
              const textLines: string[] = [];
              for (let j = i + 1; j < lines.length && lines[j].trim(); j++) {
                const cleaned = lines[j].replace(/<[^>]*>/g, "").trim();
                if (cleaned) textLines.push(cleaned);
              }
              if (textLines.length > 0) subs.push(textLines.join(" "));
            }
          }
        }
        subtitleText = [...new Set(subs)].join("\n");
      } catch {
        // Subtitle parsing failed
      }
    }

    // Build metadata
    const metadataPath = path.join(videoDir, "metadata.json");
    let metadata: Record<string, unknown> = {};
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    }

    const sample = {
      begin: startSec,
      end: endSec,
      duration: durationSec,
      name: sampleName,
      audio: audioFile,
      images: frames,
      subtitles: subtitleText,
    };

    if (!metadata.samples) metadata.samples = [];
    const samples = metadata.samples as Array<{ begin: number; end: number }>;
    const existingIndex = samples.findIndex(
      (s) => s.begin === startSec && s.end === endSec
    );
    if (existingIndex >= 0) {
      samples[existingIndex] = sample;
    } else {
      samples.push(sample);
    }

    metadata.video_id = videoId;
    metadata.samples = samples;

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({ metadata, sample });
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      { error: "Extraction failed", details: String(error) },
      { status: 500 }
    );
  }
}
