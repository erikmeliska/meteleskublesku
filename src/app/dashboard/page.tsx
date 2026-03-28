import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Film,
  Plus,
  Headphones,
  Share2,
  Play,
  Clock,
  Trash2,
  ExternalLink,
  Copy,
  Scissors,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSecondsToTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const clips = await prisma.userClip.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const totalClips = clips.length;
  const publicClips = clips.filter((c) => c.isPublic).length;
  const uniqueFilms = new Set(clips.map((c) => c.filmTitle).filter(Boolean)).size;

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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          &ldquo;{clip.quoteText || clip.name}&rdquo;
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {clip.filmTitle || `Video ${clip.videoId}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {clip.source === "gemini" && (
                          <Badge variant="secondary" className="text-[10px]">
                            AI
                          </Badge>
                        )}
                        {clip.shareHash && (
                          <Badge variant="outline" className="text-[10px]">
                            <Share2 className="h-2.5 w-2.5 mr-1" />
                            Zdieľaný
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {formatSecondsToTime(clip.beginTime)} – {formatSecondsToTime(clip.endTime)}
                      </span>
                      <span>({formatSecondsToTime(clip.duration)})</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                        <a
                          href={`/api/media/audio?path=${encodeURIComponent(clip.audioPath)}`}
                          target="_blank"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Prehrať
                        </a>
                      </Button>
                      {clip.shareHash && (
                        <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                          <Link href={`/clip/${clip.shareHash}`}>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Odkaz
                          </Link>
                        </Button>
                      )}
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
