import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clapperboard, PenTool, Music, Users } from "lucide-react";
import { getMovie } from "@/lib/scraper";
import { parseMovieTitle } from "@/lib/utils";
import { ImageGallery } from "@/components/image-gallery";
import { AudioPlayerBar } from "@/components/audio-player";
import { Badge } from "@/components/ui/badge";

interface MoviePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ audio?: string }>;
}

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovie(id);
  if (!movie) return { title: "Film nenájdený" };

  const { title, year } = parseMovieTitle(movie.title);
  return {
    title: `${title}${year ? ` (${year})` : ""}`,
    description: movie.desc.join(" ").slice(0, 160),
    openGraph: {
      title: `${title} | Meteleskublesku`,
      description: movie.desc.join(" ").slice(0, 160),
      type: "music.album",
    },
  };
}

function extractDescField(desc: string[], prefix: string): string | null {
  const line = desc.find((d) => d.startsWith(prefix));
  return line ? line.replace(prefix, "").trim() : null;
}

export default async function MoviePage({
  params,
  searchParams,
}: MoviePageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const movie = await getMovie(id);

  if (!movie) notFound();

  let audioIndex = parseInt(sp.audio || "1") - 1;
  if (isNaN(audioIndex) || audioIndex < 0 || audioIndex >= movie.audio.length) {
    audioIndex = 0;
  }

  const { title, year } = parseMovieTitle(movie.title);
  const director = extractDescField(movie.desc, "Režie:");
  const screenplay = extractDescField(movie.desc, "Scénář:");
  const music = extractDescField(movie.desc, "Hudba:");
  const namet = extractDescField(movie.desc, "Námět:");
  const cast = extractDescField(movie.desc, "Hrají:");
  const mainImage = movie.images[0]?.url;

  return (
    <div className="pb-40">
      {/* Cinematic banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        {mainImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/media/image?path=${encodeURIComponent(mainImage)}`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
          </>
        ) : (
          <div className="absolute inset-0 gradient-hero" />
        )}

        {/* Banner content */}
        <div className="absolute inset-0 flex items-end">
          <div className="container pb-6 animate-fade-in">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground transition-colors mb-3 glass rounded-full px-3 py-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Späť
            </Link>
            <div className="flex items-end gap-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {title}
              </h1>
              {year && (
                <Badge variant="secondary" className="mb-1 text-sm">
                  <Calendar className="h-3 w-3 mr-1" />
                  {year}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Image gallery */}
          <div className="lg:col-span-5 animate-fade-in">
            <ImageGallery images={movie.images} title={title} />
          </div>

          {/* Middle: Movie info */}
          <div className="lg:col-span-3 animate-fade-in" style={{ animationDelay: "100ms" }}>
            <div className="space-y-4">
              {director && (
                <div className="flex gap-3">
                  <Clapperboard className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Réžia
                    </p>
                    <p className="text-sm mt-0.5">{director}</p>
                  </div>
                </div>
              )}
              {namet && (
                <div className="flex gap-3">
                  <PenTool className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Námět
                    </p>
                    <p className="text-sm mt-0.5">{namet}</p>
                  </div>
                </div>
              )}
              {screenplay && (
                <div className="flex gap-3">
                  <PenTool className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Scenár
                    </p>
                    <p className="text-sm mt-0.5">{screenplay}</p>
                  </div>
                </div>
              )}
              {music && (
                <div className="flex gap-3">
                  <Music className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Hudba
                    </p>
                    <p className="text-sm mt-0.5">{music}</p>
                  </div>
                </div>
              )}
              {cast && (
                <div className="flex gap-3">
                  <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Hrajú
                    </p>
                    <p className="text-sm mt-0.5 leading-relaxed">{cast}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Audio playlist */}
          <div className="lg:col-span-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <AudioPlayerBar
              tracks={movie.audio}
              initialTrackIndex={audioIndex}
              movieId={id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
