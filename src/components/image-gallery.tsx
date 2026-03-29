"use client";

import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { MovieImage } from "@/types/movie";

export interface ImageGalleryHandle {
  navigate: (delta: number) => void;
}

interface ImageGalleryProps {
  images: MovieImage[];
  title: string;
}

function imgSrc(path: string) {
  return path.startsWith("http") ? path : `/api/media/image?path=${encodeURIComponent(path)}`;
}

export const ImageGallery = forwardRef<ImageGalleryHandle, ImageGalleryProps>(
  function ImageGallery({ images, title }, ref) {
  const [selected, setSelected] = useState(0);
  const currentImage = images[selected];

  const navigate = useCallback((delta: number) => {
    setSelected((prev) => {
      const next = prev + delta;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  }, [images.length]);

  useImperativeHandle(ref, () => ({ navigate }));

  if (!images.length) return null;

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div className="relative w-full overflow-hidden rounded-xl border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc(currentImage.url)}
          alt={title}
          className="w-full h-auto object-cover"
        />
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
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {images.map((img, index) => (
            <button
              key={img.url}
              onClick={() => setSelected(index)}
              className={cn(
                "relative shrink-0 w-16 h-12 overflow-hidden rounded-md transition-all",
                index === selected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background opacity-100"
                  : "opacity-50 hover:opacity-80"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc(img.thumbnail || img.url)}
                alt={`${title} - ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
