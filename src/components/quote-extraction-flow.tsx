"use client";

import { useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { YouTubePlayer } from "@/components/youtube-player";
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

  // Extraction state
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionResults, setExtractionResults] = useState<
    Array<{ segmentId: string; audioPath: string; error?: string }>
  >([]);
  const [saving, setSaving] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

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
        throw new Error(subsData.error);
      }

      setVideoInfo(subsData.videoInfo);

      if (!subsData.subtitles) {
        setAnalyzeLoading(false);
        setError(subsData.message || "Titulky nie sú k dispozícii. Skúste iné video.");
        setStep("search");
        return;
      }

      setSubtitleCues(subsData.subtitles);

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

      setQuotes(analyzeData.quotes || []);
      setAnalyzeLoading(false);
      setStep("quotes");
    } catch (err) {
      setAnalyzeLoading(false);
      setError(String(err instanceof Error ? err.message : err));
      setStep("search");
    }
  }, []);

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
        body: JSON.stringify({ clips: clipsToSave }),
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
                onClick={() => setStep("quotes")}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Späť na hlášky
              </Button>
              <h2 className="text-xl font-bold">
                Kontrola pred extrakciou
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {segments.length} {segments.length === 1 ? "segment" : segments.length < 5 ? "segmenty" : "segmentov"} na extrakciu
              </p>
            </div>
            <Button
              onClick={handleBatchExtract}
              disabled={segments.length === 0}
              className="gradient-primary text-white"
              size="lg"
            >
              <Scissors className="h-4 w-4 mr-2" />
              Extrahovať všetky
            </Button>
          </div>

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
                      <span>
                        ({formatSecondsToTime(segment.endTime - segment.startTime)})
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
