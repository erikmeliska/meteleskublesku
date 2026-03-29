"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search,
  Sparkles,
  MessageSquareQuote,
  Scissors,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Play,
  Pause,
  Check,
  X,
  AlertCircle,
  Film,
  Clock,
  Download,
  Volume2,
  Youtube,
  Wand2,
  RefreshCw,
  History,
  Plus,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/youtube-player";
import { TimelineSlider } from "@/components/timeline-slider";
import { cn } from "@/lib/utils";
import { formatSecondsToTime } from "@/lib/utils";
import type {
  FlowStep,
  GeminiQuote,
  VideoInfo,
  ExtractionSegment,
  SubtitleCue,
} from "@/types/hlasky";

interface VideoResult {
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  author: string;
  videoId: string;
}

interface HistoryEntry {
  id: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  thumbnail: string;
  duration: string;
  author: string;
  lastStep: string;
  updatedAt: string;
}

const STEPS: { key: FlowStep; label: string; icon: React.ReactNode }[] = [
  { key: "search", label: "Nájsť video", icon: <Search className="h-4 w-4" /> },
  { key: "analyze", label: "Analýza", icon: <Sparkles className="h-4 w-4" /> },
  { key: "quotes", label: "Hlášky", icon: <MessageSquareQuote className="h-4 w-4" /> },
  { key: "review", label: "Kontrola", icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: "extracting", label: "Extrakcia", icon: <Scissors className="h-4 w-4" /> },
  { key: "done", label: "Hotovo", icon: <Check className="h-4 w-4" /> },
];

export function QuoteExtractionFlow() {
  // Flow state
  const [step, setStep] = useState<FlowStep>("search");

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VideoResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Video state
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);

  // Analysis state
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [quotes, setQuotes] = useState<GeminiQuote[]>([]);

  // Segment editing
  const [segments, setSegments] = useState<ExtractionSegment[]>([]);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const editorPlayerRef = useRef<YouTubePlayerHandle>(null);
  const manualPlayerRef = useRef<YouTubePlayerHandle>(null);

  // Manual clip state
  const [manualStart, setManualStart] = useState(0);
  const [manualEnd, setManualEnd] = useState(10);
  const [manualText, setManualText] = useState("");

  // Extraction state
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionResults, setExtractionResults] = useState<
    Array<{
      segmentId: string;
      audioPath: string;
      imageBegin?: string;
      imageMiddle?: string;
      imageEnd?: string;
      duration?: number;
      error?: string;
    }>
  >([]);
  const [saving, setSaving] = useState(false);

  // Movie assignment state
  const [assignedMovieId, setAssignedMovieId] = useState<string | null>(null);
  const [assignedMovieTitle, setAssignedMovieTitle] = useState<string | null>(null);
  const [movieMatches, setMovieMatches] = useState<Array<{ id: string; title: string; posterUrl: string | null; year: number | null }>>([]);
  const [movieMatchLoading, setMovieMatchLoading] = useState(false);

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Error state
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // ──────────── HISTORY ────────────

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      // silently fail
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveHistory = useCallback(
    async (params: {
      videoId: string;
      videoTitle: string;
      videoUrl: string;
      thumbnail?: string;
      duration?: string;
      author?: string;
      subtitleCues?: SubtitleCue[];
      quotes?: GeminiQuote[];
      lastStep: string;
    }) => {
      try {
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            subtitleCues: params.subtitleCues ? JSON.stringify(params.subtitleCues) : undefined,
            quotes: params.quotes ? JSON.stringify(params.quotes) : undefined,
          }),
        });
        loadHistory();
      } catch {
        // silently fail
      }
    },
    [loadHistory]
  );

  const handleResumeFromHistory = useCallback(
    async (entry: HistoryEntry) => {
      setError(null);
      setStep("analyze");
      setAnalyzeLoading(true);

      const video: VideoResult = {
        title: entry.videoTitle,
        url: entry.videoUrl,
        thumbnail: entry.thumbnail,
        duration: entry.duration,
        author: entry.author,
        videoId: entry.videoId,
      };
      setSelectedVideo(video);

      try {
        // Load full history entry
        setAnalyzeStatus("Načítavam uložené dáta...");
        const res = await fetch(`/api/history/${entry.videoId}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        const fullEntry = data.entry;
        const cachedCues: SubtitleCue[] = fullEntry.subtitleCues
          ? JSON.parse(fullEntry.subtitleCues)
          : null;
        const cachedQuotes: GeminiQuote[] = fullEntry.quotes
          ? JSON.parse(fullEntry.quotes)
          : null;

        setVideoInfo({
          videoId: entry.videoId,
          title: entry.videoTitle,
          description: "",
          duration: 0,
          thumbnail: entry.thumbnail,
          subtitleLanguages: [],
          autoSubtitleLanguages: [],
        });

        if (cachedQuotes && cachedCues) {
          // Resume to quotes
          setSubtitleCues(cachedCues);
          setQuotes(cachedQuotes);
          setAnalyzeLoading(false);
          setStep("quotes");
        } else if (cachedCues) {
          // Have subtitles, run Gemini
          setSubtitleCues(cachedCues);
          setAnalyzeStatus("AI analyzuje hlášky...");
          const analyzeRes = await fetch("/api/youtube/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subtitles: cachedCues,
              videoTitle: entry.videoTitle,
            }),
          });
          const analyzeData = await analyzeRes.json();
          if (analyzeData.error) throw new Error(analyzeData.error);

          const newQuotes = analyzeData.quotes || [];
          setQuotes(newQuotes);

          await saveHistory({
            videoId: entry.videoId,
            videoTitle: entry.videoTitle,
            videoUrl: entry.videoUrl,
            thumbnail: entry.thumbnail,
            duration: entry.duration,
            author: entry.author,
            quotes: newQuotes,
            lastStep: "quotes",
          });

          setAnalyzeLoading(false);
          setStep("quotes");
        } else {
          // No subtitles/quotes cached → manual mode
          setAnalyzeLoading(false);
          setStep("manual");
        }
      } catch (err) {
        setAnalyzeLoading(false);
        setError(String(err instanceof Error ? err.message : err));
        setStep("search");
      }
    },
    [saveHistory]
  );

  const handleRefreshQuotes = useCallback(async () => {
    if (!videoInfo || subtitleCues.length === 0) return;

    setStep("analyze");
    setAnalyzeLoading(true);
    setAnalyzeStatus("AI analyzuje hlášky odznova...");
    setError(null);

    try {
      const analyzeRes = await fetch("/api/youtube/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtitles: subtitleCues,
          videoTitle: videoInfo.title,
        }),
      });
      const analyzeData = await analyzeRes.json();
      if (analyzeData.error) throw new Error(analyzeData.error);

      const newQuotes = analyzeData.quotes || [];
      setQuotes(newQuotes);
      setSegments([]);

      if (selectedVideo) {
        await saveHistory({
          videoId: videoInfo.videoId,
          videoTitle: videoInfo.title,
          videoUrl: selectedVideo.url,
          thumbnail: selectedVideo.thumbnail,
          duration: selectedVideo.duration,
          author: selectedVideo.author,
          quotes: newQuotes,
          lastStep: "quotes",
        });
      }

      setAnalyzeLoading(false);
      setStep("quotes");
    } catch (err) {
      setAnalyzeLoading(false);
      setError(String(err instanceof Error ? err.message : err));
      setStep("quotes");
    }
  }, [videoInfo, subtitleCues, selectedVideo, saveHistory]);

  // ──────────── SEARCH ────────────

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearchLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      const items =
        data.searchResults?.items
          ?.filter((item: Record<string, string>) => item.type === "video")
          .map(
            (item: {
              title: string;
              url: string;
              bestThumbnail?: { url: string };
              duration: string;
              author?: { name: string };
            }) => ({
              title: item.title,
              url: item.url,
              thumbnail: item.bestThumbnail?.url || "",
              duration: item.duration,
              author: item.author?.name || "",
              videoId: new URL(item.url).searchParams.get("v") || "",
            })
          ) || [];
      setSearchResults(items);
    } catch {
      setError("Vyhľadávanie zlyhalo");
      setSearchResults([]);
    }
    setSearchLoading(false);
  }, [query]);

  // ──────────── ANALYZE ────────────

  const handleSelectVideo = useCallback(async (video: VideoResult) => {
    setSelectedVideo(video);
    setStep("analyze");
    setAnalyzeLoading(true);
    setError(null);

    try {
      // Step 1: Download subtitles
      setAnalyzeStatus("Sťahujem titulky...");
      const subsRes = await fetch("/api/youtube/subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video.url }),
      });
      const subsData = await subsRes.json();

      if (subsData.error) {
        if (subsData.needsCookies) {
          throw new Error("YouTube vyžaduje prihlásenie. Nastavte YouTube cookies v Nastaveniach (/settings).");
        }
        throw new Error(subsData.error);
      }

      setVideoInfo(subsData.videoInfo);

      if (!subsData.subtitles) {
        // No subtitles → save to history and go to manual mode
        await saveHistory({
          videoId: video.videoId,
          videoTitle: subsData.videoInfo.title,
          videoUrl: video.url,
          thumbnail: video.thumbnail,
          duration: video.duration,
          author: video.author,
          lastStep: "subtitles",
        });
        setAnalyzeLoading(false);
        setStep("manual");
        return;
      }

      setSubtitleCues(subsData.subtitles);

      // Save to history after subtitles download
      await saveHistory({
        videoId: video.videoId,
        videoTitle: subsData.videoInfo.title,
        videoUrl: video.url,
        thumbnail: video.thumbnail,
        duration: video.duration,
        author: video.author,
        subtitleCues: subsData.subtitles,
        lastStep: "subtitles",
      });

      // Step 2: Gemini analysis
      setAnalyzeStatus("AI analyzuje hlášky...");
      const analyzeRes = await fetch("/api/youtube/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtitles: subsData.subtitles,
          videoTitle: subsData.videoInfo.title,
        }),
      });
      const analyzeData = await analyzeRes.json();

      if (analyzeData.error) {
        throw new Error(analyzeData.error);
      }

      const newQuotes = analyzeData.quotes || [];
      setQuotes(newQuotes);

      // Save to history after Gemini analysis
      await saveHistory({
        videoId: video.videoId,
        videoTitle: subsData.videoInfo.title,
        videoUrl: video.url,
        thumbnail: video.thumbnail,
        duration: video.duration,
        author: video.author,
        quotes: newQuotes,
        lastStep: "quotes",
      });

      setAnalyzeLoading(false);
      setStep("quotes");
    } catch (err) {
      setAnalyzeLoading(false);
      setError(String(err instanceof Error ? err.message : err));
      setStep("search");
    }
  }, [saveHistory]);

  // ──────────── QUOTES SELECTION ────────────

  const toggleQuoteSelection = useCallback(
    (quote: GeminiQuote) => {
      setSegments((prev) => {
        const exists = prev.find((s) => s.quoteId === quote.id);
        if (exists) {
          return prev.filter((s) => s.quoteId !== quote.id);
        }
        return [
          ...prev,
          {
            id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            quoteId: quote.id,
            text: quote.text,
            startTime: quote.startTime,
            endTime: quote.endTime,
            character: quote.character,
            status: "pending" as const,
          },
        ];
      });
    },
    []
  );

  const isQuoteSelected = useCallback(
    (quoteId: string) => segments.some((s) => s.quoteId === quoteId),
    [segments]
  );

  // ──────────── SEGMENT EDITOR ────────────

  const editingSegment = segments.find((s) => s.id === editingSegmentId);

  const updateSegmentTimes = useCallback(
    (start: number, end: number) => {
      if (!editingSegmentId) return;
      setSegments((prev) =>
        prev.map((s) =>
          s.id === editingSegmentId ? { ...s, startTime: start, endTime: end } : s
        )
      );
    },
    [editingSegmentId]
  );

  // ──────────── MOVIE ASSIGNMENT ────────────

  const searchMovieMatches = useCallback(async (title: string) => {
    if (!title.trim()) return;
    setMovieMatchLoading(true);
    try {
      // Extract likely movie name from video title (remove year, quality tags etc.)
      const cleanTitle = title
        .replace(/\(\d{4}\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/(720p|1080p|HD|CZ|SK|dabing|titulky|celý film|cely film)/gi, "")
        .trim();
      const searchTerms = cleanTitle.split(/\s+/).slice(0, 4).join(" ");

      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(searchTerms)}`);
      const data = await res.json();
      setMovieMatches(data.movies || []);
    } catch {
      setMovieMatches([]);
    }
    setMovieMatchLoading(false);
  }, []);

  // Auto-search when entering review step
  useEffect(() => {
    if (step === "review" && videoInfo && !assignedMovieId && movieMatches.length === 0) {
      searchMovieMatches(videoInfo.title);
    }
  }, [step, videoInfo, assignedMovieId, movieMatches.length, searchMovieMatches]);

  // ──────────── BATCH EXTRACTION ────────────

  const handleBatchExtract = useCallback(async () => {
    if (!selectedVideo || !videoInfo || segments.length === 0) return;

    setStep("extracting");
    setExtractionProgress(0);
    setError(null);

    try {
      const res = await fetch("/api/youtube/batch-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: videoInfo.videoId,
          videoUrl: selectedVideo.url,
          segments: segments.map((s) => ({
            id: s.id,
            text: s.text,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        }),
      });

      const data = await res.json();

      if (data.error) {
        if (data.needsCookies) {
          throw new Error("YouTube vyžaduje prihlásenie. Nastavte YouTube cookies v Nastaveniach (/settings).");
        }
        throw new Error(data.error);
      }

      setExtractionResults(data.results || []);
      setExtractionProgress(100);

      // Update segment statuses
      setSegments((prev) =>
        prev.map((s) => {
          const result = data.results?.find(
            (r: { segmentId: string; error?: string }) => r.segmentId === s.id
          );
          return {
            ...s,
            status: result?.error ? ("error" as const) : ("done" as const),
            error: result?.error,
          };
        })
      );

      setStep("done");
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setStep("review");
    }
  }, [selectedVideo, videoInfo, segments]);

  // ──────────── SAVE CLIPS ────────────

  const handleSaveClips = useCallback(async () => {
    if (!videoInfo || extractionResults.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const clipsToSave = segments
        .filter((s) => s.status === "done")
        .map((s) => {
          const result = extractionResults.find((r) => r.segmentId === s.id);
          return {
            videoId: videoInfo.videoId,
            filmTitle: videoInfo.title,
            quoteText: s.text,
            audioPath: result?.audioPath || "",
            imageBegin: result?.imageBegin || undefined,
            imageMiddle: result?.imageMiddle || undefined,
            imageEnd: result?.imageEnd || undefined,
            beginTime: s.startTime,
            endTime: s.endTime,
            duration: s.endTime - s.startTime,
            source: "gemini",
          };
        })
        .filter((c) => c.audioPath);

      const res = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clips: clipsToSave,
          assignedMovieId: assignedMovieId || undefined,
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Success!
      setSaving(false);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setSaving(false);
    }
  }, [videoInfo, segments, extractionResults]);

  // ──────────── RENDER ────────────

  return (
    <div className="container py-6 max-w-5xl">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2 animate-fade-in">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center shrink-0">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all",
                i < stepIndex
                  ? "bg-primary/15 text-primary"
                  : i === stepIndex
                    ? "gradient-primary text-white shadow-md"
                    : "bg-muted/50 text-muted-foreground"
              )}
            >
              {i < stepIndex ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                s.icon
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-6 h-0.5 mx-0.5",
                  i < stepIndex ? "bg-primary/30" : "bg-muted/50"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <Card className="mb-6 border-destructive/50 bg-destructive/5 animate-fade-in">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Nastala chyba</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══════════ STEP: SEARCH ═══════════ */}
      {step === "search" && (
        <div className="animate-fade-in">
          {/* Hero header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Film className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Extrahovať hlášky z filmu
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Nájdite video na YouTube, AI identifikuje najlepšie hlášky
              a vy si vyberiete, ktoré chcete uložiť.
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
              <Input
                placeholder="Hľadať video na YouTube... napr. 'Pelíšky celý film'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-14 rounded-full text-base border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 bg-card"
              />
              <Button
                onClick={handleSearch}
                disabled={searchLoading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full gradient-primary text-white h-10 px-6"
              >
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-1.5" />
                    Hľadať
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((video, i) => (
                <Card
                  key={i}
                  className="cursor-pointer card-hover group overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                  onClick={() => handleSelectVideo(video)}
                >
                  <div className="relative aspect-video overflow-hidden">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Film className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all">
                        <Wand2 className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    {video.duration && (
                      <Badge className="absolute bottom-2 right-2 bg-black/70 text-white border-0 text-[10px]">
                        <Clock className="h-3 w-3 mr-1" />
                        {video.duration}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 leading-snug">
                      {video.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {video.author}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Video history */}
          {history.length > 0 && searchResults.length === 0 && (
            <div className="mt-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Posledné videá</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((entry, i) => (
                  <Card
                    key={entry.id}
                    className="cursor-pointer card-hover group overflow-hidden animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => handleResumeFromHistory(entry)}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      {entry.thumbnail ? (
                        <img
                          src={entry.thumbnail}
                          alt={entry.videoTitle}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Film className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all">
                          <Play className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <Badge className="absolute top-2 left-2 bg-primary/90 text-white border-0 text-[10px]">
                        {entry.lastStep === "quotes" ? "Hlášky hotové" : "Titulky stiahnuté"}
                      </Badge>
                      {entry.duration && (
                        <Badge className="absolute bottom-2 right-2 bg-black/70 text-white border-0 text-[10px]">
                          <Clock className="h-3 w-3 mr-1" />
                          {entry.duration}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 leading-snug">
                        {entry.videoTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {entry.author}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ STEP: ANALYZE ═══════════ */}
      {step === "analyze" && (
        <div className="animate-fade-in max-w-lg mx-auto text-center py-16">
          <div className="animate-float inline-block mb-6">
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Analyzujem video</h2>
          <p className="text-muted-foreground mb-6">{analyzeStatus}</p>
          <div className="max-w-xs mx-auto">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-shimmer" style={{ width: "70%" }} />
            </div>
          </div>
          {selectedVideo && (
            <p className="text-xs text-muted-foreground mt-4 truncate px-4">
              {selectedVideo.title}
            </p>
          )}
        </div>
      )}

      {/* ═══════════ STEP: QUOTES ═══════════ */}
      {step === "quotes" && (
        <div className="animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("search")}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Späť
              </Button>
              <h2 className="text-xl font-bold">
                Nájdené hlášky
                <Badge variant="secondary" className="ml-2">
                  {quotes.length}
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {videoInfo?.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("manual")}
                title="Pridať klipy manuálne"
              >
                <Plus className="h-4 w-4 mr-1" />
                Manuálne
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshQuotes}
                title="Znovu analyzovať hlášky"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button
                onClick={() => setStep("review")}
                disabled={segments.length === 0}
                className="gradient-primary text-white"
              >
                Pokračovať
                <ArrowRight className="h-4 w-4 ml-1" />
                {segments.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 bg-white/20 text-white">
                    {segments.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Two-column: quotes list + video preview */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Quote list */}
            <div className="lg:col-span-3">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-2 pr-3">
                  {quotes.map((quote, i) => {
                    const selected = isQuoteSelected(quote.id);
                    return (
                      <Card
                        key={quote.id}
                        className={cn(
                          "cursor-pointer transition-all animate-fade-in border-2",
                          selected
                            ? "border-primary/50 bg-primary/5 shadow-sm"
                            : "border-transparent hover:border-primary/20 hover:bg-accent/30"
                        )}
                        style={{ animationDelay: `${i * 30}ms` }}
                        onClick={() => toggleQuoteSelection(quote)}
                      >
                        <CardContent className="p-4 flex items-start gap-3">
                          <Checkbox
                            checked={selected}
                            className="mt-0.5 shrink-0"
                            onCheckedChange={() => toggleQuoteSelection(quote)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-relaxed">
                              &ldquo;{quote.text}&rdquo;
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {quote.character && (
                                <span className="flex items-center gap-1">
                                  <Film className="h-3 w-3" />
                                  {quote.character}
                                </span>
                              )}
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="h-3 w-3" />
                                {formatSecondsToTime(quote.startTime)} – {formatSecondsToTime(quote.endTime)}
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  quote.confidence > 0.8
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : quote.confidence > 0.5
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "bg-muted"
                                )}
                              >
                                {Math.round(quote.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Video preview */}
            <div className="lg:col-span-2">
              <div className="sticky top-24">
                {videoInfo && (
                  <YouTubePlayer
                    videoId={videoInfo.videoId}
                    onReady={(d) => setVideoDuration(d)}
                    onTimeUpdate={setPlayerCurrentTime}
                  />
                )}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground text-center">
                    Kliknite na hlášku pre výber. Označené hlášky budú extrahované.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ STEP: MANUAL ═══════════ */}
      {step === "manual" && videoInfo && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("search")}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Späť
              </Button>
              <h2 className="text-xl font-bold">Manuálne pridávanie klipov</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {videoInfo.title}
              </p>
            </div>
            {segments.length > 0 && (
              <Button
                onClick={() => setStep("review")}
                className="gradient-primary text-white"
              >
                Pokračovať
                <ArrowRight className="h-4 w-4 ml-1" />
                <Badge variant="secondary" className="ml-1.5 bg-white/20 text-white">
                  {segments.length}
                </Badge>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video player */}
            <div>
              <YouTubePlayer
                ref={manualPlayerRef}
                videoId={videoInfo.videoId}
                startTime={manualStart}
                endTime={manualEnd}
                onTimeUpdate={setPlayerCurrentTime}
                onReady={(d) => {
                  setVideoDuration(d);
                  setManualEnd(Math.min(10, d));
                }}
              />
            </div>

            {/* Add clip controls */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Nový klip
                  </h3>

                  {/* Jump to time */}
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Skočiť na čas
                    </label>
                    <Input
                      placeholder="napr. 45, 1:23, 1:02:30"
                      className="h-8 text-sm font-mono"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (!val) return;
                        // Parse time: "45" = 45s, "1:23" = 83s, "1:02:30" = 3750s
                        const parts = val.split(":").map(Number);
                        let sec = 0;
                        if (parts.length === 1) sec = parts[0];
                        else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
                        else if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                        if (isNaN(sec) || sec < 0) return;
                        const capped = Math.min(sec, videoDuration > 0 ? videoDuration : sec);
                        setManualStart(capped);
                        setManualEnd(Math.min(capped + 10, videoDuration > 0 ? videoDuration : capped + 10));
                        manualPlayerRef.current?.seekTo(capped);
                        (e.target as HTMLInputElement).value = "";
                      }}
                    />
                  </div>

                  {/* Timeline */}
                  <TimelineSlider
                    startTime={manualStart}
                    endTime={manualEnd}
                    duration={videoDuration}
                    currentTime={playerCurrentTime}
                    onChange={(s, e) => {
                      setManualStart(s);
                      setManualEnd(e);
                    }}
                    onStartChange={(t) => manualPlayerRef.current?.seekTo(t)}
                  />

                  {/* Text input */}
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1.5">
                      <Type className="h-3 w-3" />
                      Text hlášky
                    </label>
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Napíšte text hlášky..."
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
                      rows={2}
                    />
                  </div>

                  {/* Add button */}
                  {manualEnd - manualStart > 300 && (
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Maximálna dĺžka klipu je 5 minút ({formatSecondsToTime(300)})
                    </p>
                  )}
                  <Button
                    onClick={() => {
                      if (manualEnd <= manualStart) return;
                      if (manualEnd - manualStart > 300) return;
                      setSegments((prev) => [
                        ...prev,
                        {
                          id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                          quoteId: `manual-${Date.now()}`,
                          text: manualText.trim() || `Klip ${formatSecondsToTime(manualStart)} – ${formatSecondsToTime(manualEnd)}`,
                          startTime: manualStart,
                          endTime: manualEnd,
                          status: "pending" as const,
                        },
                      ]);
                      // Reset for next clip - start from where this one ended
                      setManualStart(manualEnd);
                      setManualEnd(Math.min(manualEnd + 10, videoDuration));
                      setManualText("");
                      manualPlayerRef.current?.seekTo(manualEnd);
                    }}
                    disabled={manualEnd <= manualStart || manualEnd - manualStart > 300}
                    className="w-full gradient-primary text-white"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Pridať klip
                  </Button>
                </CardContent>
              </Card>

              {/* Added segments list */}
              {segments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Pridané klipy ({segments.length})
                  </h4>
                  {segments.map((seg, i) => (
                    <Card key={seg.id} className="animate-fade-in">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">&ldquo;{seg.text}&rdquo;</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {formatSecondsToTime(seg.startTime)} – {formatSecondsToTime(seg.endTime)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSegments((prev) => prev.filter((s) => s.id !== seg.id))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ STEP: EDITOR (inline in quotes) ═══════════ */}
      {step === "editor" && editingSegment && videoInfo && (
        <div className="animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingSegmentId(null);
              setStep("quotes");
            }}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Späť na hlášky
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video player */}
            <div>
              <YouTubePlayer
                ref={editorPlayerRef}
                videoId={videoInfo.videoId}
                startTime={editingSegment.startTime}
                endTime={editingSegment.endTime}
                onTimeUpdate={setPlayerCurrentTime}
                onReady={(d) => setVideoDuration(d)}
                autoPlay
              />
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-1">Upraviť segment</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    &ldquo;{editingSegment.text}&rdquo;
                  </p>

                  <TimelineSlider
                    startTime={editingSegment.startTime}
                    endTime={editingSegment.endTime}
                    duration={videoDuration}
                    currentTime={playerCurrentTime}
                    onChange={updateSegmentTimes}
                    onStartChange={(t) => editorPlayerRef.current?.seekTo(t)}
                  />

                  <div className="flex gap-2 mt-6">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setEditingSegmentId(null);
                        setStep("quotes");
                      }}
                    >
                      Zrušiť
                    </Button>
                    <Button
                      className="flex-1 gradient-primary text-white"
                      onClick={() => {
                        setEditingSegmentId(null);
                        setStep("quotes");
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Uložiť zmeny
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ STEP: REVIEW ═══════════ */}
      {step === "review" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(subtitleCues.length > 0 ? "quotes" : "manual")}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Späť
              </Button>
              <h2 className="text-xl font-bold">
                Kontrola pred extrakciou
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {segments.length} {segments.length === 1 ? "segment" : segments.length < 5 ? "segmenty" : "segmentov"} na extrakciu
              </p>
            </div>
            <div className="text-right">
              {segments.some((s) => s.endTime - s.startTime > 300) && (
                <p className="text-xs text-destructive mb-2 flex items-center justify-end gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Niektoré klipy prekračujú max 5 minút
                </p>
              )}
              <Button
                onClick={handleBatchExtract}
                disabled={segments.length === 0 || segments.some((s) => s.endTime - s.startTime > 300)}
                className="gradient-primary text-white"
                size="lg"
              >
                <Scissors className="h-4 w-4 mr-2" />
                Extrahovať všetky
              </Button>
            </div>
          </div>

          {/* Movie assignment */}
          <Card className="mb-6 animate-fade-in">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Film className="h-4 w-4 text-primary" />
                Priradiť k filmu
              </h3>

              {assignedMovieId ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{assignedMovieTitle}</p>
                    <p className="text-xs text-muted-foreground">Klipy budú priradené k tomuto filmu</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAssignedMovieId(null);
                      setAssignedMovieTitle(null);
                      if (videoInfo) searchMovieMatches(videoInfo.title);
                    }}
                  >
                    Zmeniť
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Search input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Hľadať film v databáze..."
                      defaultValue={videoInfo?.title || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length >= 2) searchMovieMatches(val);
                      }}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Matches */}
                  {movieMatchLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Hľadám...
                    </div>
                  ) : movieMatches.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {movieMatches.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setAssignedMovieId(m.id);
                            setAssignedMovieTitle(m.title);
                          }}
                          className="w-full text-left p-2.5 rounded-lg border hover:border-primary/40 hover:bg-accent/30 transition-all flex items-center gap-3"
                        >
                          {m.posterUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.posterUrl.startsWith("http") ? m.posterUrl : `/api/media/image?path=${encodeURIComponent(m.posterUrl)}`}
                              alt=""
                              className="w-8 h-11 object-cover rounded shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.title}</p>
                            {m.year && <p className="text-xs text-muted-foreground">{m.year}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Žiadne zhody. Klipy budú uložené ako nový film.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {segments.map((segment, i) => (
              <Card key={segment.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">&ldquo;{segment.text}&rdquo;</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {segment.character && <span>{segment.character}</span>}
                      <span className="font-mono">
                        {formatSecondsToTime(segment.startTime)} – {formatSecondsToTime(segment.endTime)}
                      </span>
                      <span className={segment.endTime - segment.startTime > 300 ? "text-destructive font-medium" : ""}>
                        ({formatSecondsToTime(segment.endTime - segment.startTime)})
                        {segment.endTime - segment.startTime > 300 && " — príliš dlhý!"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSegmentId(segment.id);
                        setStep("editor");
                      }}
                    >
                      <Scissors className="h-3.5 w-3.5 mr-1" />
                      Upraviť
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSegments((prev) => prev.filter((s) => s.id !== segment.id));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ STEP: EXTRACTING ═══════════ */}
      {step === "extracting" && (
        <div className="animate-fade-in max-w-lg mx-auto text-center py-16">
          <div className="animate-float inline-block mb-6">
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
              <Scissors className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Extrahujem audio</h2>
          <p className="text-muted-foreground mb-6">
            Spracúvam {segments.length} {segments.length === 1 ? "segment" : segments.length < 5 ? "segmenty" : "segmentov"}...
          </p>
          <div className="max-w-sm mx-auto">
            <Progress value={extractionProgress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {Math.round(extractionProgress)}%
            </p>
          </div>
        </div>
      )}

      {/* ═══════════ STEP: DONE ═══════════ */}
      {step === "done" && (
        <div className="animate-fade-in">
          <div className="text-center py-12 mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Extrakcia dokončená!</h2>
            <p className="text-muted-foreground">
              {extractionResults.filter((r) => !r.error).length} z {segments.length} segmentov úspešne extrahovaných
            </p>
          </div>

          {/* Results list */}
          <div className="space-y-3 max-w-2xl mx-auto mb-8">
            {segments.map((segment, i) => {
              const result = extractionResults.find((r) => r.segmentId === segment.id);
              const success = result && !result.error;

              return (
                <Card
                  key={segment.id}
                  className={cn(
                    "animate-fade-in",
                    success ? "border-green-200 dark:border-green-800/50" : "border-destructive/30"
                  )}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        success
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-destructive/10"
                      )}
                    >
                      {success ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        &ldquo;{segment.text}&rdquo;
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatSecondsToTime(segment.startTime)} – {formatSecondsToTime(segment.endTime)}
                        {!success && result?.error && (
                          <span className="text-destructive ml-2">
                            {result.error === "Invalid time range"
                              ? "— Klip je príliš dlhý (max 5 minút)"
                              : `— ${result.error}`}
                          </span>
                        )}
                      </p>
                    </div>
                    {success && result?.audioPath && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/api/media/audio?path=${encodeURIComponent(result.audioPath)}`} target="_blank">
                          <Volume2 className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={handleSaveClips}
              disabled={saving || extractionResults.filter((r) => !r.error).length === 0}
              className="gradient-primary text-white"
              size="lg"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Uložiť do mojich filmov
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setStep("search");
                setSearchResults([]);
                setSelectedVideo(null);
                setVideoInfo(null);
                setQuotes([]);
                setSegments([]);
                setExtractionResults([]);
                setQuery("");
                setError(null);
              }}
            >
              Extrahovať ďalšie
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
