"use client";

import { useRef } from "react";
import { ImageGallery, type ImageGalleryHandle } from "@/components/image-gallery";
import { AudioPlayerBar } from "@/components/audio-player";
import type { AudioTrack, MovieImage } from "@/types/movie";

interface MovieContentProps {
  tracks: AudioTrack[];
  initialTrackIndex: number;
  movieId: string;
  images: MovieImage[];
  movieTitle: string;
  children?: React.ReactNode; // slot for movie info (left column content above gallery)
}

export function MovieContent({
  tracks,
  initialTrackIndex,
  movieId,
  images,
  movieTitle,
  children,
}: MovieContentProps) {
  const galleryRef = useRef<ImageGalleryHandle>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: Info + gallery */}
      <div className="lg:col-span-5 space-y-5">
        {children}
        {images.length > 0 && (
          <ImageGallery ref={galleryRef} images={images} title={movieTitle} />
        )}
      </div>

      {/* Right: Audio playlist */}
      <div className="lg:col-span-7" style={{ animationDelay: "100ms" }}>
        <AudioPlayerBar
          tracks={tracks}
          initialTrackIndex={initialTrackIndex}
          movieId={movieId}
          onImageNav={(delta) => galleryRef.current?.navigate(delta)}
        />
      </div>
    </div>
  );
}
