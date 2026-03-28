"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MovieImage } from "@/types/movie";

interface ImageGalleryProps {
  images: MovieImage[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const currentImage = images[selected];

  const goNext = useCallback(() => {
    setSelected((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setSelected((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, goNext, goPrev]);

  if (!images.length) return null;

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div
        className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted cursor-pointer group"
        onClick={() => setLightboxOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/media/image?path=${encodeURIComponent(currentImage.url)}`}
          alt={title}
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-300"
        />
        {/* Zoom overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all">
          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity transform scale-75 group-hover:scale-100 duration-200" />
        </div>
        {/* Image counter */}
        {images.length > 1 && (
          <Badge
            variant="secondary"
            className="absolute bottom-2 right-2 text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm"
          >
            {selected + 1} / {images.length}
          </Badge>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1 snap-x snap-mandatory">
          {images.map((img, index) => (
            <button
              key={img.url}
              onClick={() => setSelected(index)}
              className={cn(
                "relative shrink-0 w-16 h-12 overflow-hidden rounded-md transition-all snap-start",
                index === selected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background opacity-100"
                  : "opacity-50 hover:opacity-80"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/image?path=${encodeURIComponent(img.thumbnail || img.url)}`}
                alt={`${title} - ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0 overflow-hidden">
          <DialogTitle className="sr-only">{title} - obrázok {selected + 1}</DialogTitle>
          <div className="relative w-full h-[85vh] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/media/image?path=${encodeURIComponent(currentImage.url)}`}
              alt={title}
              className="max-w-full max-h-full object-contain"
            />

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}

            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-sm text-white/60">
                {selected + 1} / {images.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
