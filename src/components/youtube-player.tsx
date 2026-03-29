"use client";

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
}

interface YouTubePlayerProps {
  videoId: string;
  startTime?: number;
  endTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onReady?: (duration: number) => void;
  autoPlay?: boolean;
  className?: string;
}

let apiLoaded = false;
let apiLoading = false;
const apiCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve();

  return new Promise((resolve) => {
    if (apiLoading) {
      apiCallbacks.push(resolve);
      return;
    }

    apiLoading = true;
    apiCallbacks.push(resolve);

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      apiCallbacks.forEach((cb) => cb());
      apiCallbacks.length = 0;
    };
  });
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer(
    {
      videoId,
      startTime = 0,
      endTime,
      onTimeUpdate,
      onReady,
      autoPlay = false,
      className = "",
    },
    ref
  ) {
    const playerRef = useRef<YTPlayer | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const containerIdRef = useRef(`yt-player-${Math.random().toString(36).slice(2)}`);
    const [isPlaying, setIsPlaying] = useState(false);

    const startTimeRef = useRef(startTime);
    const endTimeRef = useRef(endTime);

    // Keep refs in sync
    useEffect(() => {
      startTimeRef.current = startTime;
      endTimeRef.current = endTime;
    }, [startTime, endTime]);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current) {
          playerRef.current.seekTo(seconds, true);
          playerRef.current.playVideo();
        }
      },
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
    }));

    // Time tracking interval
    const startTracking = useCallback(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        if (!playerRef.current) return;

        const currentTime = playerRef.current.getCurrentTime();
        onTimeUpdate?.(currentTime);

        // Pause at endTime instead of looping
        if (endTimeRef.current && currentTime >= endTimeRef.current) {
          playerRef.current.pauseVideo();
        }
      }, 100);
    }, [onTimeUpdate]);

    const stopTracking = useCallback(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, []);

    // Initialize player
    useEffect(() => {
      let mounted = true;

      async function init() {
        await loadYouTubeAPI();
        if (!mounted) return;

        // Destroy previous player
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }

        playerRef.current = new window.YT.Player(containerIdRef.current, {
          videoId,
          playerVars: {
            autoplay: autoPlay ? 1 : 0,
            start: Math.floor(startTime),
            modestbranding: 1,
            rel: 0,
            fs: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              const duration = event.target.getDuration();
              onReady?.(duration);
              if (autoPlay) {
                event.target.seekTo(startTime, true);
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                startTracking();
              } else {
                setIsPlaying(false);
                stopTracking();
              }
            },
          },
        });
      }

      init();

      return () => {
        mounted = false;
        stopTracking();
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {
            /* ignore */
          }
          playerRef.current = null;
        }
      };
    }, [videoId]); // Only re-init on videoId change

    // Seek to startTime when it changes and not playing
    useEffect(() => {
      if (playerRef.current && !isPlaying) {
        playerRef.current.seekTo(startTime, true);
      }
    }, [startTime, isPlaying]);

    return (
      <div className={className}>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-black">
          <div id={containerIdRef.current} className="absolute inset-0 w-full h-full" />
        </div>
      </div>
    );
  }
);
