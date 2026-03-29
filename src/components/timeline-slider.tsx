"use client";

import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { formatSecondsToTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut } from "lucide-react";

interface TimelineSliderProps {
  startTime: number;
  endTime: number;
  duration: number;
  currentTime?: number;
  onChange: (start: number, end: number) => void;
  onStartChange?: (start: number) => void;
  className?: string;
}

const ZOOM_LEVELS = [
  { label: "Celé video", padding: 0 },
  { label: "±5 min", padding: 300 },
  { label: "±2 min", padding: 120 },
  { label: "±1 min", padding: 60 },
  { label: "±30s", padding: 30 },
  { label: "±15s", padding: 15 },
  { label: "±5s", padding: 5 },
];

const DEFAULT_ZOOM = 4; // ±30s

export function TimelineSlider({
  startTime,
  endTime,
  duration,
  currentTime,
  onChange,
  onStartChange,
  className,
}: TimelineSliderProps) {
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);

  // Lock the zoom center when zoom level changes, not on every thumb move
  const zoomCenterRef = useRef((startTime + endTime) / 2);

  // Update center only when zoom level changes or on mount
  useEffect(() => {
    zoomCenterRef.current = (startTime + endTime) / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomLevel]);

  // Use actual video duration when available, otherwise fallback to endTime
  const safeDuration = duration > 0 ? duration : Math.max(endTime + 10, 60);

  // Calculate visible range based on zoom - uses locked center
  const { visibleMin, visibleMax } = useMemo(() => {
    const zoom = ZOOM_LEVELS[zoomLevel];
    if (zoom.padding === 0) {
      return { visibleMin: 0, visibleMax: safeDuration };
    }
    const center = zoomCenterRef.current;
    return {
      visibleMin: Math.max(0, center - zoom.padding),
      visibleMax: Math.min(safeDuration, center + zoom.padding),
    };
  }, [zoomLevel, safeDuration]);

  const handleValueChange = useCallback(
    (values: number[]) => {
      const newStart = values[0];
      const newEnd = values[1];
      const startChanged = Math.abs(newStart - startTime) > 0.05;

      onChange(newStart, newEnd);

      // If start pointer moved, notify parent to seek
      if (startChanged && onStartChange) {
        onStartChange(newStart);
      }
    },
    [onChange, onStartChange, startTime]
  );

  const handleFineTune = useCallback(
    (type: "start" | "end", delta: number) => {
      const newStart = type === "start"
        ? Math.max(0, Math.min(endTime - 0.5, startTime + delta))
        : startTime;
      const newEnd = type === "end"
        ? Math.min(safeDuration, Math.max(startTime + 0.5, endTime + delta))
        : endTime;

      onChange(newStart, newEnd);

      if (type === "start" && onStartChange) {
        onStartChange(newStart);
      }
    },
    [startTime, endTime, safeDuration, onChange, onStartChange]
  );

  const segmentDuration = endTime - startTime;
  const progressPercent = currentTime
    ? Math.min(100, Math.max(0, ((currentTime - startTime) / segmentDuration) * 100))
    : 0;

  const canZoomIn = zoomLevel < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomLevel > 0;

  // Step size adapts to zoom level
  const step = zoomLevel >= 5 ? 0.1 : zoomLevel >= 3 ? 0.5 : 1;

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
        {currentTime !== undefined && currentTime >= visibleMin && currentTime <= visibleMax && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-amber-500 z-10 rounded-full shadow-sm pointer-events-none transition-all duration-100"
            style={{
              left: `${((currentTime - visibleMin) / (visibleMax - visibleMin)) * 100}%`,
            }}
          />
        )}

        <Slider
          value={[startTime, endTime]}
          min={visibleMin}
          max={visibleMax}
          step={step}
          onValueChange={handleValueChange}
          className="py-2"
        />
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => canZoomOut && setZoomLevel((z) => z - 1)}
          disabled={!canZoomOut}
          className="p-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Oddialiť"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] text-muted-foreground font-medium min-w-[70px] text-center">
          {ZOOM_LEVELS[zoomLevel].label}
        </span>
        <button
          onClick={() => canZoomIn && setZoomLevel((z) => z + 1)}
          disabled={!canZoomIn}
          className="p-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Priblížiť"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
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
            onClick={() => handleFineTune("start", -0.5)}
            className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
            title="Začiatok -0.5s"
          >
            ← 0.5s
          </button>
          <button
            onClick={() => handleFineTune("start", 0.5)}
            className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
            title="Začiatok +0.5s"
          >
            0.5s →
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleFineTune("end", -0.5)}
            className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
            title="Koniec -0.5s"
          >
            ← 0.5s
          </button>
          <button
            onClick={() => handleFineTune("end", 0.5)}
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
