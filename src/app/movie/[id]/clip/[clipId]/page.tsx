import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import MoviePage from "../../page";

interface ClipPageProps {
  params: Promise<{ id: string; clipId: string }>;
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
  return `https://meteleskublesku.ixy.sk/api/media/image?path=${encodeURIComponent(src)}`;
}

export async function generateMetadata({ params }: ClipPageProps): Promise<Metadata> {
  const { id, clipId } = await params;
  const movieId = `mov_${id}`;
  const movie = await getCachedMovie(movieId);
  if (!movie) return { title: "Film nenájdený" };

  const movieTitle = `${movie.title}${movie.year ? ` (${movie.year})` : ""}`;
  const ogTitle = `${movie.title} | Meteleskublesku`;
  const moviePoster = resolveImageUrl(movie.posterUrl || movie.thumbnail);

  // Find the specific clip
  const fullClipId = `clip_${clipId}`;
  const clips = await getCachedClips(movieId);
  const clip = clips.find((c) => c.id === fullClipId);

  const ogDescription = clip
    ? (clip.quoteText || clip.name)
    : (movie.plot?.slice(0, 160) || undefined);
  const ogImage = clip
    ? (resolveImageUrl(clip.imageMiddle) || moviePoster)
    : moviePoster;

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

export default MoviePage;
