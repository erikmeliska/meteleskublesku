"use client";

import { useState, useRef, useCallback } from "react";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import { Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AudioTrack } from "@/types/movie";

interface AudioPlayerBarProps {
  tracks: AudioTrack[];
  initialTrackIndex?: number;
  movieId: string;
}

export function AudioPlayerBar({
  tracks,
  initialTrackIndex = 0,
  movieId,
}: AudioPlayerBarProps) {
  const [currentIndex, setCurrentIndex] = useState(initialTrackIndex);
  const playerRef = useRef<AudioPlayer>(null);

  const currentTrack = tracks[currentIndex];
  const audioSrc = `/api/media/audio?path=${encodeURIComponent(currentTrack?.url || "")}`;

  const handleTrackSelect = useCallback((index: number) => {
    setCurrentIndex(index);
    const url = new URL(window.location.href);
    url.searchParams.set("audio", String(index + 1));
    window.history.replaceState({}, "", url.toString());
  }, []);

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
    if (currentIndex < tracks.length - 1) {
      handleTrackSelect(currentIndex + 1);
    }
  }, [currentIndex, tracks.length, handleTrackSelect]);

  if (!tracks.length) return null;

  return (
    <div className="flex flex-col">
      {/* Track list header */}
      <div className="flex items-center gap-2 mb-3">
        <Volume2 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Audio nahrávky
        </h2>
        <span className="text-xs text-muted-foreground">
          ({tracks.length})
        </span>
      </div>

      {/* Track list */}
      <div className="rounded-xl border bg-card/50 overflow-hidden">
        <div className="max-h-80 overflow-y-auto pb-20">
          {tracks.map((track, index) => (
            <button
              key={track.url}
              onClick={() => handleTrackSelect(index)}
              className={cn(
                "w-full text-left px-4 py-3 text-sm flex items-center justify-between gap-3 transition-all border-l-3",
                index === currentIndex
                  ? "bg-primary/8 border-l-primary font-medium"
                  : "border-l-transparent hover:bg-accent/50",
                index !== tracks.length - 1 && "border-b border-border/30"
              )}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all",
                    index === currentIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/20"
                  )}
                >
                  {index === currentIndex ? (
                    <Play className="h-3 w-3 fill-current ml-0.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="truncate">{track.text}</span>
              </span>
              <span
                className={cn(
                  "text-xs shrink-0 tabular-nums",
                  index === currentIndex
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {track.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fixed bottom player bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t shadow-2xl">
        {/* Gradient accent line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />
        <div className="container px-0">
          <div className="text-xs text-center py-1.5 text-muted-foreground truncate px-4 font-medium">
            {currentTrack?.text}
          </div>
          <AudioPlayer
            ref={playerRef}
            src={audioSrc}
            autoPlay
            showJumpControls={true}
            showSkipControls={true}
            onClickNext={handleClickNext}
            onClickPrevious={handleClickPrevious}
            onEnded={handleEnded}
            customAdditionalControls={[]}
            layout="horizontal-reverse"
            className="!shadow-none !bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
