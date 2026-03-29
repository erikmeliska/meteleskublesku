import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowLeft, Calendar, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { UserMovieTitleEditor, UserMovieInfoEditor } from "@/components/user-movie-editor";
import { MovieContent } from "@/components/movie-content";

interface MoviePageProps {
  params: Promise<{ id: string; clipId?: string }>;
  searchParams: Promise<{ audio?: string }>;
}

function getCachedMovie(movieId: string) {
  return unstable_cache(
    async () => prisma.userMovie.findUnique({ where: { id: movieId } }),
    [`movie-${movieId}`],
    { tags: ["movies", `movie-${movieId}`] }
  )();
}

function getCachedClips(movieId: string) {
  return unstable_cache(
    async () =>
      prisma.userClip.findMany({
        where: { movieId },
        orderBy: { createdAt: "asc" },
      }),
    [`clips-${movieId}`],
    { tags: ["clips", `movie-${movieId}`] }
  )();
}

function resolveImageUrl(src: string | null | undefined): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("http")) return src;
  // Relative paths need the full URL for OG images
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://meteleskublesku.ixy.sk";
  return `${base}/api/media/image?path=${encodeURIComponent(src)}`;
}

export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const { id, clipId } = await params;
  const movieId = `mov_${id}`;
  const movie = await getCachedMovie(movieId);
  if (!movie) return { title: "Film nenájdený" };

  const movieTitle = `${movie.title}${movie.year ? ` (${movie.year})` : ""}`;
  const moviePoster = resolveImageUrl(movie.posterUrl || movie.thumbnail);

  // Default: movie-level OG
  let ogTitle = `${movie.title} | Meteleskublesku`;
  let ogDescription = movie.plot?.slice(0, 160) || undefined;
  let ogImage = moviePoster;

  // If a specific clip is selected, use clip data for OG
  if (clipId) {
    const fullClipId = `clip_${clipId}`;
    const clips = await getCachedClips(movieId);
    const clip = clips.find((c) => c.id === fullClipId);
    if (clip) {
      ogTitle = `${clip.quoteText || clip.name} | ${movie.title}`;
      ogDescription = clip.quoteText || clip.name;
      ogImage = resolveImageUrl(clip.imageMiddle) || moviePoster;
    }
  }

  return {
    title: movieTitle,
    description: ogDescription,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "music.album",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function MoviePage({ params, searchParams }: MoviePageProps) {
  const { id, clipId } = await params;
  const sp = await searchParams;

  const movieId = `mov_${id}`;

  const [movie, session] = await Promise.all([
    getCachedMovie(movieId),
    auth(),
  ]);
  if (!movie) notFound();

  const clips = await getCachedClips(movieId);

  // Determine edit permissions: owner or admin
  const isOwner = session?.user?.id === movie.userId;
  const isAdmin = session?.user?.id
    ? (await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }))?.role === "admin"
    : false;
  const canEdit = isOwner || isAdmin;

  // Build audio tracks from clips
  const tracks = clips.map((clip) => ({
    id: clip.id,
    text: clip.quoteText || clip.name,
    url: clip.audioPath,
    length: clip.duration ? `${Math.round(clip.duration)}s` : "",
    shareHash: clip.shareHash,
    images: [clip.imageBegin, clip.imageMiddle, clip.imageEnd].filter((img): img is string => !!img),
  }));

  // Build images: movie-level images + clip screenshots
  const movieImages: { thumbnail: string; url: string }[] = movie.images
    ? JSON.parse(movie.images)
    : [];
  const clipImages = clips
    .flatMap((clip) => [clip.imageBegin, clip.imageMiddle, clip.imageEnd])
    .filter((img): img is string => !!img)
    .map((img) => ({ thumbnail: img, url: img }));
  const images = [...movieImages, ...clipImages];

  // Resolve initial track: from clip URL or ?audio= fallback
  let audioIndex = 0;
  if (clipId) {
    const fullClipId = `clip_${clipId}`;
    const idx = clips.findIndex((c) => c.id === fullClipId);
    if (idx >= 0) audioIndex = idx;
  } else if (sp.audio) {
    const idx = parseInt(sp.audio) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < tracks.length) audioIndex = idx;
  }

  const posterUrl = movie.posterUrl || null;
  const mainImage = posterUrl || movie.thumbnail || images[0]?.url;
  const isLegacy = movie.videoId.startsWith("legacy-");

  function imgSrc(src: string) {
    return src.startsWith("http") ? src : `/api/media/image?path=${encodeURIComponent(src)}`;
  }

  return (
    <div>
      {/* Cinematic banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        {mainImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc(mainImage)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
          </>
        ) : (
          <div className="absolute inset-0 gradient-hero" />
        )}

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
              {canEdit ? (
                <UserMovieTitleEditor movieId={movieId} initialTitle={movie.title} />
              ) : (
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {movie.title}
                </h1>
              )}
              {movie.year && (
                <Badge variant="secondary" className="mb-1 text-sm">
                  <Calendar className="h-3 w-3 mr-1" />
                  {movie.year}
                </Badge>
              )}
              {isAdmin && !isOwner && (
                <Badge className="mb-1 text-sm bg-red-600 text-white border-0">Admin</Badge>
              )}
              {isOwner && !isLegacy && (
                <Badge className="mb-1 text-sm bg-primary/90 text-white border-0">Moje</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              {isLegacy ? (
                <span>{clips.length} {clips.length === 1 ? "nahrávka" : clips.length < 5 ? "nahrávky" : "nahrávok"}</span>
              ) : (
                <>
                  <Youtube className="h-4 w-4 text-red-500" />
                  <span>{clips.length} {clips.length === 1 ? "hláška" : clips.length < 5 ? "hlášky" : "hlášok"}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <MovieContent
          tracks={tracks}
          initialTrackIndex={audioIndex}
          movieId={movieId}
          images={images}
          movieTitle={movie.title}
        >
          {/* Movie info slot */}
          {posterUrl ? (
            <div className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl}
                alt={movie.title}
                className="w-28 md:w-36 rounded-xl shadow-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1.5 text-sm">
                {movie.director && (
                  <p><span className="text-muted-foreground">Réžia:</span> {movie.director}</p>
                )}
                {movie.cast && (
                  <p className="line-clamp-2"><span className="text-muted-foreground">Hrajú:</span> {movie.cast}</p>
                )}
                {movie.plot && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{movie.plot}</p>
                )}
                {canEdit && (
                  <UserMovieInfoEditor
                    movieId={movieId}
                    movieTitle={movie.title}
                    readOnly={false}
                    compact
                    movie={{
                      year: movie.year,
                      director: movie.director,
                      screenplay: movie.screenplay,
                      music: movie.music,
                      cast: movie.cast,
                      plot: movie.plot,
                    }}
                  />
                )}
              </div>
            </div>
          ) : (movie.director || movie.cast) ? (
            <div className="space-y-1.5 text-sm">
              {movie.director && (
                <p><span className="text-muted-foreground">Réžia:</span> {movie.director}</p>
              )}
              {movie.cast && (
                <p><span className="text-muted-foreground">Hrajú:</span> {movie.cast}</p>
              )}
              {canEdit && (
                <UserMovieInfoEditor
                  movieId={movieId}
                  movieTitle={movie.title}
                  readOnly={false}
                  compact
                  movie={{
                    year: movie.year,
                    director: movie.director,
                    screenplay: movie.screenplay,
                    music: movie.music,
                    cast: movie.cast,
                    plot: movie.plot,
                  }}
                />
              )}
            </div>
          ) : canEdit ? (
            <UserMovieInfoEditor
              movieId={movieId}
              movieTitle={movie.title}
              readOnly={false}
              compact
              movie={{
                year: movie.year,
                director: movie.director,
                screenplay: movie.screenplay,
                music: movie.music,
                cast: movie.cast,
                plot: movie.plot,
              }}
            />
          ) : null}
        </MovieContent>
      </div>
    </div>
  );
}
