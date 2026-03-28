export const dynamic = "force-dynamic";

import { getMovieListWithAudio } from "@/lib/scraper";
import { MovieSearch } from "@/components/movie-search";
import { Film } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function HomePage() {
  const movies = await getMovieListWithAudio();
  const sorted = [...movies].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      {/* Hero section */}
      <section className="relative gradient-hero overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-primary/5 blur-3xl" />
          <Film className="absolute top-12 right-[15%] h-16 w-16 text-primary/[0.04] animate-float" />
          <Film className="absolute bottom-8 left-[10%] h-12 w-12 text-primary/[0.04] animate-float" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="container relative py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
              Meteleskublesku{" "}
              <strong className="font-bold gradient-text">reloaded</strong>
            </h1>
            <p className="text-lg text-muted-foreground mt-4 max-w-lg mx-auto">
              Zvukové nahrávky z českých a slovenských filmov. Kultové hlášky
              na jednom mieste.
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                <Film className="h-3.5 w-3.5 mr-1.5" />
                {sorted.length} filmov
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Movie grid section */}
      <section className="container py-8 md:py-12">
        <MovieSearch movies={sorted} />
      </section>
    </div>
  );
}
