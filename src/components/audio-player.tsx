"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import { Play, Volume2, Share2, Check, Repeat, Link as LinkIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AudioTrack } from "@/types/movie";

interface AudioPlayerBarProps {
  tracks: AudioTrack[];
  initialTrackIndex?: number;
  movieId: string; // full mov_xxx id
  onImageNav?: (delta: number) => void;
}

function stripPrefix(id: string, prefix: string) {
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

function imgSrc(src: string) {
  return src.startsWith("http") ? src : `/api/media/image?path=${encodeURIComponent(src)}`;
}

export function AudioPlayerBar({
  tracks,
  initialTrackIndex = 0,
  movieId,
  onImageNav,
}: AudioPlayerBarProps) {
  const [currentIndex, setCurrentIndex] = useState(initialTrackIndex);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const playerRef = useRef<AudioPlayer>(null);

  const [highlightedIndex, setHighlightedIndex] = useState(initialTrackIndex);
  const trackListRef = useRef<HTMLDivElement>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const unlocked = useRef(false);

  const movieSlug = stripPrefix(movieId, "mov_");
  const currentTrack = tracks[currentIndex];
  const audioSrc = currentTrack?.url?.startsWith("http")
    ? currentTrack.url
    : `/api/media/audio?path=${encodeURIComponent(currentTrack?.url || "")}`;

  // Try autoplay on every src change
  useEffect(() => {
    if (!playerRef.current?.audio?.current) return;
    const audio = playerRef.current.audio.current;
    const wasUnlocked = unlocked.current || sessionStorage.getItem("audio-unlocked");

    const tryPlay = () => {
      audio.play().then(() => {
        unlocked.current = true;
        sessionStorage.setItem("audio-unlocked", "1");
        setNeedsInteraction(false);
      }).catch(() => {
        if (!wasUnlocked) {
          setNeedsInteraction(true);
        }
      });
    };

    if (audio.readyState >= 2) {
      tryPlay();
    } else {
      audio.addEventListener("canplay", tryPlay, { once: true });
    }

    return () => audio.removeEventListener("canplay", tryPlay);
  }, [audioSrc]);

  const handleUnlock = useCallback(() => {
    setNeedsInteraction(false);
    unlocked.current = true;
    sessionStorage.setItem("audio-unlocked", "1");
    playerRef.current?.audio?.current?.play();
  }, []);

  // Filter tracks by search
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks.map((t, i) => ({ track: t, originalIndex: i }));
    const q = searchQuery.toLowerCase();
    return tracks
      .map((t, i) => ({ track: t, originalIndex: i }))
      .filter(({ track }) => track.text.toLowerCase().includes(q));
  }, [tracks, searchQuery]);

  const clipUrl = useCallback(
    (track: AudioTrack) => `/movie/${movieSlug}/clip/${stripPrefix(track.id, "clip_")}`,
    [movieSlug]
  );

  const handleTrackSelect = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      const track = tracks[index];
      if (track) {
        window.history.replaceState({}, "", clipUrl(track));
      }
    },
    [tracks, clipUrl]
  );

  const handleClickNext = useCallback(() => {
    if (currentIndex < tracks.length - 1) {
      handleTrackSelect(currentIndex + 1);
    }
  }, [currentIndex, tracks.length, handleTrackSelect]);

  const handleClickPrevious = useCallback(() => {
    if (currentIndex > 0) {
      handleTrackSelect(currentIndex - 1);
    }
  }, [currentIndex, handleTrackSelect]);

  const handleEnded = useCallback(() => {
    if (autoAdvance && currentIndex < tracks.length - 1) {
      handleTrackSelect(currentIndex + 1);
    }
  }, [autoAdvance, currentIndex, tracks.length, handleTrackSelect]);

  const handleCopyLink = useCallback(
    async (track: AudioTrack, e: React.MouseEvent) => {
      e.stopPropagation();
      const url = track.shareHash
        ? `${window.location.origin}/clip/${track.shareHash}`
        : `${window.location.origin}${clipUrl(track)}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(track.id);
      setTimeout(() => setCopiedId(null), 2000);
    },
    [clipUrl]
  );

  // Keep highlighted in sync when track changes
  useEffect(() => {
    setHighlightedIndex(currentIndex);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, tracks.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleTrackSelect(highlightedIndex);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onImageNav?.(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onImageNav?.(1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tracks.length, highlightedIndex, handleTrackSelect, onImageNav]);

  // Scroll highlighted track into view
  useEffect(() => {
    const el = trackListRef.current?.querySelector(`[data-index="${highlightedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  if (!tracks.length) return null;

  return (
    <div className="flex flex-col">
      {/* Track list header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Audio nahrávky
          </h2>
          <span className="text-xs text-muted-foreground">({tracks.length})</span>
        </div>

        {/* Auto-advance toggle */}
        <button
          onClick={() => setAutoAdvance(!autoAdvance)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all",
            autoAdvance
              ? "bg-primary/15 text-primary"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
          title={autoAdvance ? "Automatické prehrávanie zapnuté" : "Automatické prehrávanie vypnuté"}
        >
          <Repeat className="h-3 w-3" />
          Auto
        </button>
      </div>

      {/* Search filter */}
      {tracks.length > 5 && (
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hľadať v nahrávkach..."
            className="w-full h-8 pl-9 pr-8 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Autoplay unlock prompt */}
      {needsInteraction && (
        <button
          onClick={handleUnlock}
          className="w-full mb-3 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center gap-3 hover:bg-primary/10 transition-all animate-fade-in"
        >
          <Play className="h-6 w-6 text-primary fill-primary" />
          <span className="text-sm font-medium text-primary">Klikni pre spustenie prehrávania</span>
        </button>
      )}

      {/* Inline player */}
      <div className="rounded-xl border bg-card/50 overflow-hidden mb-3">
        {/* Controls */}
        <AudioPlayer
          ref={playerRef}
          src={audioSrc}
          autoPlay
          autoPlayAfterSrcChange
          showJumpControls={true}
          showSkipControls={true}
          onClickNext={handleClickNext}
          onClickPrevious={handleClickPrevious}
          onEnded={handleEnded}
          customAdditionalControls={[]}
          layout="horizontal-reverse"
          className="!shadow-none !bg-transparent"
        />
        {/* Track name */}
        <div className="flex items-center justify-center gap-2 px-3 pb-1">
          <span className="text-xs text-muted-foreground truncate font-medium">
            {currentTrack?.text}
          </span>
          {currentTrack && (
            <button
              onClick={(e) => handleCopyLink(currentTrack, e)}
              className={cn(
                "p-1 rounded transition-all shrink-0",
                copiedId === currentTrack.id ? "text-green-600" : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
              title="Zdieľať"
            >
              {copiedId === currentTrack.id ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
            </button>
          )}
        </div>
        {/* Clip images - full width */}
        {currentTrack?.images && currentTrack.images.length > 0 && (
          <div className="grid grid-cols-3 gap-0.5">
            {currentTrack.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={imgSrc(img)} alt="" className="w-full aspect-video object-cover" loading="lazy" />
            ))}
          </div>
        )}
      </div>

      {/* Track list */}
      <div className="rounded-xl border bg-card/50 overflow-hidden" ref={trackListRef}>
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredTracks.map(({ track, originalIndex }, i) => (
            <div
              key={track.id}
              data-index={originalIndex}
              className={cn(
                "flex items-center transition-all border-l-3",
                originalIndex === currentIndex
                  ? "bg-primary/8 border-l-primary"
                  : originalIndex === highlightedIndex
                    ? "bg-accent/70 border-l-primary/50"
                    : "border-l-transparent hover:bg-accent/50",
                i !== filteredTracks.length - 1 && "border-b border-border/30"
              )}
            >
              <button
                onClick={() => handleTrackSelect(originalIndex)}
                className="flex-1 text-left px-4 py-3 text-sm flex items-center gap-3 min-w-0"
              >
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all",
                    originalIndex === currentIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {originalIndex === currentIndex ? (
                    <Play className="h-3 w-3 fill-current ml-0.5" />
                  ) : (
                    originalIndex + 1
                  )}
                </span>
                <span className={cn("truncate", originalIndex === currentIndex && "font-medium")}>
                  {track.text}
                </span>
              </button>

              <div className="flex items-center gap-1.5 pr-3 shrink-0">
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    originalIndex === currentIndex ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {track.length}
                </span>
                <button
                  onClick={(e) => handleCopyLink(track, e)}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    copiedId === track.id
                      ? "text-green-600"
                      : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted"
                  )}
                  title="Kopírovať odkaz"
                >
                  {copiedId === track.id ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : track.shareHash ? (
                    <Share2 className="h-3.5 w-3.5" />
                  ) : (
                    <LinkIcon className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
          {filteredTracks.length === 0 && searchQuery && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Žiadne výsledky pre &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
