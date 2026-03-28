"use client";

import { useState, useMemo } from "react";
import { Search, X, Film, Volume2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MovieCard } from "@/components/movie-card";
import type { MovieListItem } from "@/types/movie";

interface MovieSearchProps {
  movies: MovieListItem[];
}

interface SearchResult {
  movie: MovieListItem;
  matchedTracks: string[];
}

export function MovieSearch({ movies }: MovieSearchProps) {
  const [query, setQuery] = useState("");

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) {
      return movies.map((movie) => ({ movie, matchedTracks: [] }));
    }
    const q = query.toLowerCase();
    return movies
      .map((movie) => {
        const titleMatch = movie.title.toLowerCase().includes(q);
        const matchedTracks = (movie.audioTracks || []).filter((track) =>
          track.toLowerCase().includes(q)
        );
        if (titleMatch || matchedTracks.length > 0) {
          return { movie, matchedTracks };
        }
        return null;
      })
      .filter((r): r is SearchResult => r !== null);
  }, [movies, query]);

  return (
    <div>
      {/* Search bar */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Hľadať film alebo hlášku..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-12 h-12 rounded-full text-base border-2 border-transparent bg-muted/50 focus:bg-background focus:border-primary/30 focus:shadow-[0_0_0_4px] focus:shadow-primary/10 transition-all"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results count */}
        {query && (
          <div className="flex justify-center mt-3 animate-fade-in">
            <Badge variant="secondary" className="text-xs">
              {results.length} z {movies.length} filmov
            </Badge>
          </div>
        )}
      </div>

      {/* Movie grid */}
      {results.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <Film className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Žiadne výsledky
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Pre &ldquo;{query}&rdquo; sme nenašli žiadny film ani hlášku
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setQuery("")}
          >
            Zobraziť všetky filmy
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
          {results.map(({ movie, matchedTracks }, index) => (
            <div key={movie.id}>
              <MovieCard movie={movie} index={index} />
              {/* Show matched audio tracks under the card */}
              {matchedTracks.length > 0 && (
                <div className="mt-1.5 px-1 space-y-0.5 animate-fade-in">
                  {matchedTracks.slice(0, 3).map((track, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-tight"
                    >
                      <Volume2 className="h-3 w-3 text-primary/60 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{track}</span>
                    </div>
                  ))}
                  {matchedTracks.length > 3 && (
                    <p className="text-[10px] text-muted-foreground/60 pl-[18px]">
                      +{matchedTracks.length - 3} ďalších
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
