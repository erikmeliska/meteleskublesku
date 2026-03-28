import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse flexible time format to seconds.
 * Supports: "1:23:45.678", "23:45.678", "45.678", "45"
 */
export function parseTimeToSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

/**
 * Format seconds to human-readable time string.
 */
export function formatSecondsToTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 10);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}${ms > 0 ? `.${ms}` : ""}`;
}

/**
 * Extract movie title and year from combined string like "Title (1985)"
 */
export function parseMovieTitle(fullTitle: string): {
  title: string;
  year: string;
} {
  const match = fullTitle.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  if (match) {
    return { title: match[1].trim(), year: match[2] };
  }
  return { title: fullTitle.trim(), year: "" };
}
