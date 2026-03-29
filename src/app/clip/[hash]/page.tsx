import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface ClipPageProps {
  params: Promise<{ hash: string }>;
}

export default async function ClipPage({ params }: ClipPageProps) {
  const { hash } = await params;
  const clip = await prisma.userClip.findUnique({
    where: { shareHash: hash },
    select: { id: true, movieId: true },
  });

  if (!clip || !clip.movieId) notFound();

  const movieSlug = clip.movieId.replace(/^mov_/, "");
  const clipSlug = clip.id.replace(/^clip_/, "");

  redirect(`/movie/${movieSlug}/clip/${clipSlug}`);
}
