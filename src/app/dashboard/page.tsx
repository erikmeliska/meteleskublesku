export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Film,
  Headphones,
  Share2,
  Clock,
  Scissors,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSecondsToTime } from "@/lib/utils";
import { DeleteClipButton } from "@/components/delete-clip-button";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const [clips, movies] = await Promise.all([
    prisma.userClip.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userMovie.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Count clips per movie + build title map
  const clipsPerMovie = new Map<string, number>();
  const movieTitleMap = new Map<string, string>();
  for (const m of movies) {
    movieTitleMap.set(m.id, m.title);
  }
  for (const clip of clips) {
    if (clip.movieId) {
      clipsPerMovie.set(clip.movieId, (clipsPerMovie.get(clip.movieId) || 0) + 1);
    }
  }

  const totalClips = clips.length;
  const publicClips = clips.filter((c) => c.isPublic).length;
  const uniqueFilms = movies.length || new Set(clips.map((c) => c.filmTitle).filter(Boolean)).size;

  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spravujte svoje audio clipy
          </p>
        </div>
        <Button asChild className="gradient-primary text-white">
          <Link href="/add/hlasky">
            <Scissors className="h-4 w-4 mr-1.5" />
            Extrahovať hlášky
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalClips}</p>
              <p className="text-xs text-muted-foreground">Celkom clipov</p>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in" style={{ animationDelay: "150ms" }}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{publicClips}</p>
              <p className="text-xs text-muted-foreground">Verejných</p>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueFilms}</p>
              <p className="text-xs text-muted-foreground">Filmov</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My movies */}
      {movies.length > 0 && (
        <div className="mb-8 animate-fade-in" style={{ animationDelay: "250ms" }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Moje filmy
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {movies.map((movie, i) => (
              <Link
                key={movie.id}
                href={`/movie/${movie.id.replace(/^mov_/, "")}`}
                className="animate-fade-in"
                style={{ animationDelay: `${300 + i * 50}ms` }}
              >
                <Card className="overflow-hidden card-hover group">
                  <div className="relative aspect-video bg-muted">
                    {movie.thumbnail || movie.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          movie.posterUrl
                            ? movie.posterUrl
                            : `/api/media/image?path=${encodeURIComponent(movie.thumbnail!)}`
                        }
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-lg">
                        {movie.title}
                      </p>
                    </div>
                    {movie.year && (
                      <Badge className="absolute top-2 right-2 text-[10px] bg-black/50 text-white border-0">
                        {movie.year}
                      </Badge>
                    )}
                    <Badge className="absolute top-2 left-2 text-[10px] bg-primary/80 text-white border-0">
                      {clipsPerMovie.get(movie.id) || 0} hlášok
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Clips list or empty state */}
      {clips.length === 0 ? (
        <Card className="animate-fade-in" style={{ animationDelay: "250ms" }}>
          <CardContent className="py-16 text-center">
            <div className="animate-float inline-block">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Film className="h-10 w-10 text-primary/60" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Zatiaľ žiadne clipy
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Začnite extrahovaním hlášok z YouTube videa. AI nájde najlepšie
              momenty a vy si vyberiete, ktoré chcete uložiť.
            </p>
            <Button asChild size="lg" className="gradient-primary text-white">
              <Link href="/add/hlasky">
                <Scissors className="h-4 w-4 mr-2" />
                Extrahovať prvé hlášky
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clips.map((clip, i) => (
            <Card
              key={clip.id}
              className="animate-fade-in card-hover"
              style={{ animationDelay: `${250 + i * 50}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {clip.imageMiddle ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/media/image?path=${encodeURIComponent(clip.imageMiddle)}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      &ldquo;{clip.quoteText || clip.name}&rdquo;
                    </h3>
                    {clip.movieId && movieTitleMap.get(clip.movieId) && (
                      <Link
                        href={`/movie/${clip.movieId.replace(/^mov_/, "")}/clip/${clip.id.replace(/^clip_/, "")}`}
                        className="text-xs text-primary hover:underline truncate block mt-0.5"
                      >
                        {movieTitleMap.get(clip.movieId)}
                      </Link>
                    )}

                    {/* Timing + action icons */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Clock className="h-3 w-3" />
                        {formatSecondsToTime(clip.beginTime)} – {formatSecondsToTime(clip.endTime)}
                        {clip.duration > 0 && <span>({formatSecondsToTime(clip.duration)})</span>}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Download/play mp3 */}
                        <a
                          href={`/api/media/audio?path=${encodeURIComponent(clip.audioPath)}`}
                          target="_blank"
                          className="p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all"
                          title="Stiahnuť MP3"
                        >
                          <Headphones className="h-3.5 w-3.5" />
                        </a>
                        {/* Movie link */}
                        {clip.movieId && (
                          <Link
                            href={`/movie/${clip.movieId.replace(/^mov_/, "")}/clip/${clip.id.replace(/^clip_/, "")}`}
                            className="p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all"
                            title="Otvoriť vo filme"
                          >
                            <Film className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        {/* Share link */}
                        {clip.shareHash && (
                          <Link
                            href={`/clip/${clip.shareHash}`}
                            className="p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all"
                            title="Zdieľací odkaz"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        {/* Delete */}
                        <DeleteClipButton clipId={clip.id} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
