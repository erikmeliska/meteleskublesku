import Link from "next/link";
import { Film, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { parseMovieTitle } from "@/lib/utils";
import type { MovieListItem } from "@/types/movie";

interface MovieCardProps {
  movie: MovieListItem;
  index?: number;
}

export function MovieCard({ movie, index = 0 }: MovieCardProps) {
  const { title, year } = parseMovieTitle(movie.title);
  // Only stagger animation for the first ~20 visible cards
  const delay = index < 20 ? index * 40 : 0;

  return (
    <Link
      href={`/movie/${movie.id}`}
      className="animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="group relative rounded-xl overflow-hidden card-hover bg-card border border-border/50 hover:border-primary/20">
        {/* Image */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {movie.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/image?path=${encodeURIComponent(movie.image)}`}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* Play icon on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center gradient-hero">
              <Film className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Year badge */}
          {year && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-black/50 text-white border-0 backdrop-blur-sm"
            >
              {year}
            </Badge>
          )}

          {/* Title overlay on image */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-semibold text-sm leading-tight text-white line-clamp-2 drop-shadow-lg">
              {title}
            </h3>
          </div>
        </div>
      </div>
    </Link>
  );
}
