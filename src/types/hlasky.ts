/**
 * Types for the Gemini-powered quote extraction flow
 */

/** A quote identified by Gemini from subtitles */
export interface GeminiQuote {
  id: string;
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  character?: string;
  confidence: number; // 0-1
}

/** Subtitle cue from VTT parsing */
export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
}

/** Video info returned after URL analysis */
export interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  subtitleLanguages: string[];
  autoSubtitleLanguages: string[];
}

/** User-adjusted segment ready for extraction */
export interface ExtractionSegment {
  id: string;
  quoteId: string;
  text: string;
  startTime: number;
  endTime: number;
  character?: string;
  status: "pending" | "extracting" | "done" | "error";
  error?: string;
}

/** Batch extraction job */
export interface ExtractionJob {
  id: string;
  videoId: string;
  videoTitle: string;
  segments: ExtractionSegment[];
  totalSegments: number;
  completedSegments: number;
  status: "pending" | "running" | "done" | "error";
  createdAt: string;
}

/** Result of a single segment extraction */
export interface ExtractionResult {
  segmentId: string;
  audioPath: string;
  imageBegin: string;
  imageMiddle: string;
  imageEnd: string;
  subtitles: string;
  duration: number;
}

/** Saved clip data */
export interface SavedClip {
  id: string;
  videoId: string;
  filmTitle: string;
  quoteText: string;
  audioPath: string;
  imageBegin: string;
  imageMiddle: string;
  imageEnd: string;
  startTime: number;
  endTime: number;
  duration: number;
  subtitles: string;
  isPublic: boolean;
  shareHash?: string;
  createdAt: string;
}

/** Flow state for the extraction wizard */
export type FlowStep =
  | "search"       // Find YouTube video
  | "analyze"      // Downloading subtitles + Gemini analysis
  | "quotes"       // Browse & select quotes
  | "editor"       // Fine-tune a single quote
  | "review"       // Review all marked segments
  | "extracting"   // Batch extraction in progress
  | "done";        // All done, view results
