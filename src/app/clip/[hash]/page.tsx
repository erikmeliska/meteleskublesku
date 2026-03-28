import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Film, Play, Share2, Clock, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatSecondsToTime } from "@/lib/utils";

interface ClipPageProps {
  params: Promise<{ hash: string }>;
}

export async function generateMetadata({
  params,
}: ClipPageProps): Promise<Metadata> {
  const { hash } = await params;
  const clip = await prisma.userClip.findUnique({
    where: { shareHash: hash },
    include: { user: { select: { name: true } } },
  });

  if (!clip) return { title: "Clip nenájdený" };

  return {
    title: `${clip.filmTitle} - ${clip.quoteText.slice(0, 60)}`,
    description: clip.quoteText,
    openGraph: {
      title: `${clip.filmTitle} | Meteleskublesku`,
      description: `"${clip.quoteText}"`,
      type: "music.song",
      images: clip.imageMiddle
        ? [`/api/media/image?path=${encodeURIComponent(clip.imageMiddle)}`]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: clip.filmTitle,
      description: `"${clip.quoteText}"`,
    },
  };
}

export default async function ClipPage({ params }: ClipPageProps) {
  const { hash } = await params;
  const clip = await prisma.userClip.findUnique({
    where: { shareHash: hash },
    include: { user: { select: { name: true, image: true } } },
  });

  if (!clip) notFound();

  return (
    <div className="min-h-screen">
      {/* Cinematic banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        {clip.imageMiddle ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/media/image?path=${encodeURIComponent(clip.imageMiddle)}`}
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
              Úvod
            </Link>
            <div className="flex items-end gap-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {clip.filmTitle || "Filmová hláška"}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8 max-w-3xl">
        <div className="space-y-6 animate-fade-in">
          {/* Quote card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-8 text-center">
              <Film className="h-8 w-8 text-primary mx-auto mb-4" />
              <blockquote className="text-xl md:text-2xl font-semibold leading-relaxed">
                &ldquo;{clip.quoteText}&rdquo;
              </blockquote>
              <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatSecondsToTime(clip.beginTime)} – {formatSecondsToTime(clip.endTime)}
                </span>
                <Badge variant="secondary">
                  {formatSecondsToTime(clip.duration)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          {(clip.imageBegin || clip.imageMiddle || clip.imageEnd) && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { path: clip.imageBegin, label: "Začiatok" },
                { path: clip.imageMiddle, label: "Stred" },
                { path: clip.imageEnd, label: "Koniec" },
              ].map(
                (img) =>
                  img.path && (
                    <div key={img.label} className="text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/image?path=${encodeURIComponent(img.path)}`}
                        alt={img.label}
                        className="w-full rounded-lg border aspect-video object-cover"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {img.label}
                      </p>
                    </div>
                  )
              )}
            </div>
          )}

          {/* Audio player */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Play className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Prehrať hlášku</h3>
              </div>
              <audio
                controls
                className="w-full"
                src={`/api/media/audio?path=${encodeURIComponent(clip.audioPath)}`}
              />
            </CardContent>
          </Card>

          {/* Meta info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Zdieľal {clip.user.name || "Anonymný"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              <span>Zdieľaný clip</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
