"use client";

import { useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { formatSecondsToTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TimelineSliderProps {
  startTime: number;
  endTime: number;
  duration: number;
  currentTime?: number;
  onChange: (start: number, end: number) => void;
  className?: string;
}

export function TimelineSlider({
  startTime,
  endTime,
  duration,
  currentTime,
  onChange,
  className,
}: TimelineSliderProps) {
  const handleValueChange = useCallback(
    (values: number[]) => {
      onChange(values[0], values[1]);
    },
    [onChange]
  );

  const segmentDuration = endTime - startTime;
  const progressPercent = currentTime
    ? Math.min(100, Math.max(0, ((currentTime - startTime) / segmentDuration) * 100))
    : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Time labels */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-mono font-medium">
            {formatSecondsToTime(startTime)}
          </span>
          <span className="text-muted-foreground">od</span>
        </div>
        <div className="text-center">
          <span className="text-muted-foreground">
            Trvanie:{" "}
            <span className="font-mono font-medium text-foreground">
              {formatSecondsToTime(segmentDuration)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">do</span>
          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-mono font-medium">
            {formatSecondsToTime(endTime)}
          </span>
        </div>
      </div>

      {/* Dual-thumb slider */}
      <div className="relative">
        {/* Playback progress indicator */}
        {currentTime !== undefined && currentTime >= startTime && currentTime <= endTime && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-amber-500 z-10 rounded-full shadow-sm pointer-events-none transition-all duration-100"
            style={{
              left: `${((currentTime - 0) / duration) * 100}%`,
            }}
          />
        )}

        <Slider
          value={[startTime, endTime]}
          min={0}
          max={duration}
          step={0.1}
          onValueChange={handleValueChange}
          className="py-2"
        />
      </div>

      {/* Progress bar for current segment playback */}
      {currentTime !== undefined && (
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Fine-tune buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(Math.max(0, startTime - 0.5), endTime)}
            className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
            title="Začiatok -0.5s"
          >
            ← 0.5s
          </button>
          <button
            onClick={() => onChange(Math.min(endTime - 0.5, startTime + 0.5), endTime)}
            className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
            title="Začiatok +0.5s"
          >
            0.5s →
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(startTime, Math.max(startTime + 0.5, endTime - 0.5))}
            className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
            title="Koniec -0.5s"
          >
            ← 0.5s
          </button>
          <button
            onClick={() => onChange(startTime, Math.min(duration, endTime + 0.5))}
            className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
            title="Koniec +0.5s"
          >
            0.5s →
          </button>
        </div>
      </div>
    </div>
  );
}
