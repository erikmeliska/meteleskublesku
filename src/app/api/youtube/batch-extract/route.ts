import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import ffmpeg from "fluent-ffmpeg";

const execFileAsync = promisify(execFile);
const CACHE_DIR = path.resolve(process.cwd(), ".cache/temp");

function getYtDlpPath(): string {
  return process.env.YT_DLP_PATH || "yt-dlp";
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

interface Segment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

/**
 * POST /api/youtube/batch-extract
 * Extracts multiple audio segments from a downloaded video
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, videoUrl, segments } = body as {
      videoId: string;
      videoUrl: string;
      segments: Segment[];
    };

    if (!videoId || !segments?.length) {
      return NextResponse.json(
        { error: "Missing videoId or segments" },
        { status: 400 }
      );
    }

    const videoDir = path.join(CACHE_DIR, videoId);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    // Step 1: Download video if not cached
    const videoPath = path.join(videoDir, "video.mp4");
    if (!fs.existsSync(videoPath)) {
      if (!videoUrl) {
        return NextResponse.json(
          { error: "Video not cached, provide videoUrl" },
          { status: 400 }
        );
      }

      const ytdlp = getYtDlpPath();
      await execFileAsync(ytdlp, [
        "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]",
        "--merge-output-format", "mp4",
        "-o", videoPath,
        videoUrl,
      ]);
    }

    // Step 2: Extract each segment
    const results: Array<{
      segmentId: string;
      audioPath: string;
      imageBegin: string;
      imageMiddle: string;
      imageEnd: string;
      duration: number;
      error?: string;
    }> = [];

    // Read subtitles if available
    const vttFiles = fs.readdirSync(videoDir).filter((f) => f.endsWith(".vtt"));
    let vttContent = "";
    if (vttFiles.length > 0) {
      vttContent = fs.readFileSync(path.join(videoDir, vttFiles[0]), "utf8");
    }

    for (const segment of segments) {
      try {
        const startSec = segment.startTime;
        const endSec = segment.endTime;
        const durationSec = endSec - startSec;

        if (durationSec <= 0 || durationSec > 300) {
          results.push({
            segmentId: segment.id,
            audioPath: "",
            imageBegin: "",
            imageMiddle: "",
            imageEnd: "",
            duration: 0,
            error: "Invalid time range",
          });
          continue;
        }

        // Extract audio
        const audioFile = `audio_${startSec.toFixed(1)}-${endSec.toFixed(1)}.mp3`;
        const audioPath = path.join(videoDir, audioFile);
        if (!fs.existsSync(audioPath)) {
          await ffmpegExtract(videoPath, startSec, durationSec, audioPath);
        }

        // Extract 3 frames
        const midSec = startSec + durationSec / 2;
        const frames = {
          begin: `img_${startSec.toFixed(1)}_begin.png`,
          middle: `img_${midSec.toFixed(1)}_middle.png`,
          end: `img_${endSec.toFixed(1)}_end.png`,
        };

        for (const [key, filename] of Object.entries(frames)) {
          const framePath = path.join(videoDir, filename);
          if (!fs.existsSync(framePath)) {
            const t = key === "begin" ? startSec : key === "middle" ? midSec : Math.max(startSec, endSec - 0.5);
            try {
              await ffmpegScreenshot(videoPath, t, framePath);
            } catch {
              // Frame extraction failed
            }
          }
        }

        results.push({
          segmentId: segment.id,
          audioPath: `temp/${videoId}/${audioFile}`,
          imageBegin: `temp/${videoId}/${frames.begin}`,
          imageMiddle: `temp/${videoId}/${frames.middle}`,
          imageEnd: `temp/${videoId}/${frames.end}`,
          duration: durationSec,
        });
      } catch (err) {
        results.push({
          segmentId: segment.id,
          audioPath: "",
          imageBegin: "",
          imageMiddle: "",
          imageEnd: "",
          duration: 0,
          error: String(err),
        });
      }
    }

    return NextResponse.json({
      videoId,
      results,
      totalSegments: segments.length,
      successfulSegments: results.filter((r) => !r.error).length,
    });
  } catch (error) {
    console.error("Batch extraction error:", error);
    return NextResponse.json(
      { error: "Batch extraction failed", details: String(error) },
      { status: 500 }
    );
  }
}
