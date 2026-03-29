"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Pencil, Check, X, ImageIcon, Search, Loader2, Download,
  Clapperboard, PenTool, Music as MusicIcon, Users, FileText, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ──────────── Inline editable field ────────────

function EditableField({
  label,
  icon,
  value,
  movieId,
  field,
  multiline,
  readOnly,
}: {
  label: string;
  icon: React.ReactNode;
  value: string | null;
  movieId: string;
  field: string;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  const handleSave = useCallback(async () => {
    const trimmed = text.trim() || null;
    if (trimmed === displayValue) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/movies/${movieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: trimmed }),
      });
      setDisplayValue(trimmed);
      setEditing(false);
    } catch {
      setText(displayValue || "");
    }
    setSaving(false);
  }, [movieId, field, text, displayValue]);

  if (editing) {
    return (
      <div className="flex gap-3">
        {icon}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
            {label}
          </p>
          <div className="flex items-start gap-1.5">
            {multiline ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setText(displayValue || "");
                    setEditing(false);
                  }
                }}
                className="flex-1 text-sm rounded-md border border-primary/30 bg-background/80 px-2 py-1 resize-y min-h-[60px]"
                autoFocus
                disabled={saving}
                rows={3}
              />
            ) : (
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") {
                    setText(displayValue || "");
                    setEditing(false);
                  }
                }}
                className="flex-1 h-8 text-sm border-primary/30 bg-background/80"
                autoFocus
                disabled={saving}
              />
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSave} disabled={saving}>
              <Check className="h-3.5 w-3.5 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setText(displayValue || ""); setEditing(false); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Read-only: skip empty fields, no interaction
  if (readOnly) {
    if (!displayValue) return null;
    return (
      <div className="flex gap-3 px-1 py-0.5 -mx-1">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
          <p className="text-sm mt-0.5 leading-relaxed">{displayValue}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-3 group cursor-pointer rounded-lg px-1 py-0.5 -mx-1 hover:bg-accent/50 transition-colors"
      onClick={() => { setText(displayValue || ""); setEditing(true); }}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </p>
        {displayValue ? (
          <p className="text-sm mt-0.5 leading-relaxed">{displayValue}</p>
        ) : (
          <p className="text-sm mt-0.5 text-muted-foreground/50 italic">Klikni pre pridanie</p>
        )}
      </div>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
    </div>
  );
}

// ──────────── Year editor ────────────

function EditableYear({
  value,
  movieId,
}: {
  value: number | null;
  movieId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  const handleSave = useCallback(async () => {
    const num = parseInt(text) || null;
    if (num === displayValue) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/movies/${movieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: num }),
      });
      setDisplayValue(num);
      setEditing(false);
    } catch {
      setText(displayValue?.toString() || "");
    }
    setSaving(false);
  }, [movieId, text, displayValue]);

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setText(displayValue?.toString() || ""); setEditing(false); }
          }}
          className="w-20 h-7 text-xs"
          placeholder="Rok"
          autoFocus
          disabled={saving}
        />
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}><Check className="h-3 w-3 text-green-600" /></Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setText(displayValue?.toString() || ""); setEditing(false); }}><X className="h-3 w-3" /></Button>
      </div>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="cursor-pointer hover:bg-accent transition-colors mb-1 text-sm"
      onClick={() => { setText(displayValue?.toString() || ""); setEditing(true); }}
    >
      <Calendar className="h-3 w-3 mr-1" />
      {displayValue || "Rok?"}
    </Badge>
  );
}

// ──────────── Title editor ────────────

export function UserMovieTitleEditor({
  movieId,
  initialTitle,
}: {
  movieId: string;
  initialTitle: string;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!title.trim() || title === initialTitle) {
      setTitle(initialTitle);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/movies/${movieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      setEditing(false);
    } catch {
      setTitle(initialTitle);
    }
    setSaving(false);
  }, [movieId, title, initialTitle]);

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setTitle(initialTitle); setEditing(false); }
          }}
          className="text-2xl md:text-3xl font-bold h-auto py-1 px-2 bg-background/80 border-primary/30"
          autoFocus
          disabled={saving}
        />
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleSave} disabled={saving}>
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => { setTitle(initialTitle); setEditing(false); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 group">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity mb-1"
        onClick={() => setEditing(true)}
        title="Upraviť názov"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ──────────── Thumbnail picker ────────────

export function UserMovieThumbnailPicker({
  movieId,
  initialThumbnail,
  images,
}: {
  movieId: string;
  initialThumbnail: string | null;
  images: { thumbnail: string; url: string }[];
}) {
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState(initialThumbnail);
  const [saving, setSaving] = useState(false);

  const handleSelect = useCallback(
    async (imageUrl: string) => {
      setSaving(true);
      setSelected(imageUrl);
      try {
        await fetch(`/api/movies/${movieId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thumbnail: imageUrl }),
        });
      } catch {
        setSelected(initialThumbnail);
      }
      setSaving(false);
      setPicking(false);
    },
    [movieId, initialThumbnail]
  );

  if (images.length === 0) return null;

  return (
    <div className="mt-4">
      <Button variant="outline" size="sm" onClick={() => setPicking(!picking)} className="text-xs">
        <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
        {picking ? "Zrušiť" : "Zmeniť obrázok filmu"}
      </Button>

      {picking && (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2 animate-fade-in">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => handleSelect(img.url)}
              disabled={saving}
              className={cn(
                "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                selected === img.url
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-primary/40"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/image?path=${encodeURIComponent(img.url)}`}
                alt={`Obrázok ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {selected === img.url && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <Check className="h-5 w-5 text-white drop-shadow-lg" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────── Movie info editor (all fields) ────────────

interface CsfdSearchResult {
  csfdId: number;
  title: string;
  year: number;
  poster: string;
  origins: string[];
  directors: string[];
  actors: string[];
}

export function UserMovieInfoEditor({
  movieId,
  movieTitle,
  movie,
  readOnly = false,
  compact = false,
}: {
  movieId: string;
  movieTitle: string;
  readOnly?: boolean;
  compact?: boolean;
  movie: {
    year: number | null;
    director: string | null;
    screenplay: string | null;
    music: string | null;
    cast: string | null;
    plot: string | null;
  };
}) {
  const [csfdQuery, setCsfdQuery] = useState("");
  const [csfdResults, setCsfdResults] = useState<CsfdSearchResult[]>([]);
  const [csfdSearching, setCsfdSearching] = useState(false);
  const [csfdImporting, setCsfdImporting] = useState(false);
  const [showCsfd, setShowCsfd] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const autoSearched = useRef(false);

  // Local state for fields that get updated from CSFD
  const [year, setYear] = useState(movie.year);
  const [director, setDirector] = useState(movie.director);
  const [screenplay, setScreenplay] = useState(movie.screenplay);
  const [music, setMusic] = useState(movie.music);
  const [cast, setCast] = useState(movie.cast);
  const [plot, setPlot] = useState(movie.plot);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setCsfdSearching(true);
    try {
      const res = await fetch(`/api/csfd?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results = data.movies || [];
      setCsfdResults(results);
      // If no results found, show search input for manual query
      if (results.length === 0) {
        setShowSearchInput(true);
      }
    } catch {
      setCsfdResults([]);
      setShowSearchInput(true);
    }
    setCsfdSearching(false);
  }, []);

  // Auto-search with movie title when CSFD panel opens
  useEffect(() => {
    if (showCsfd && !autoSearched.current) {
      autoSearched.current = true;
      setCsfdQuery(movieTitle);
      doSearch(movieTitle);
    }
  }, [showCsfd, movieTitle, doSearch]);

  const handleCsfdImport = useCallback(
    async (csfdId: number, csfdTitle: string, origins: string[]) => {
      setCsfdImporting(true);
      try {
        const res = await fetch("/api/csfd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csfdId, origins }),
        });
        const data = await res.json();

        if (data.error) {
          console.error("CSFD import error:", data.error);
          setCsfdImporting(false);
          return;
        }

        const m = data.movie;

        // Save all fields to DB (including title)
        const patchRes = await fetch(`/api/movies/${movieId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: csfdTitle,
            year: m.year || null,
            director: m.director || null,
            screenplay: m.screenplay || null,
            music: m.music || null,
            cast: m.cast || null,
            plot: m.plot || null,
            posterUrl: m.posterUrl || null,
            csfdId: m.csfdId,
          }),
        });

        if (!patchRes.ok) {
          console.error("PATCH error:", await patchRes.text());
          setCsfdImporting(false);
          return;
        }

        // Update local state
        setYear(m.year || null);
        setDirector(m.director || null);
        setScreenplay(m.screenplay || null);
        setMusic(m.music || null);
        setCast(m.cast || null);
        setPlot(m.plot || null);
        setShowCsfd(false);
        setCsfdResults([]);

        // Reload page to reflect title change in banner
        window.location.reload();
      } catch (err) {
        console.error("CSFD import failed:", err);
      }
      setCsfdImporting(false);
    },
    [movieId]
  );

  // Compact mode: small ČSFD + Upraviť buttons, fields expand on click
  const [showFields, setShowFields] = useState(false);

  if (compact) {
    return (
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCsfd(!showCsfd)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all",
              showCsfd ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Download className="h-3 w-3" />
            ČSFD
          </button>
          <button
            onClick={() => setShowFields(!showFields)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all",
              showFields ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Pencil className="h-3 w-3" />
            Upraviť
          </button>
        </div>

        {showCsfd && (
          <div className="animate-fade-in">
            {(showSearchInput || csfdResults.length === 0) && (
              <div className="flex gap-2 mb-2">
                <Input value={csfdQuery} onChange={(e) => setCsfdQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch(csfdQuery)} placeholder="Hľadať na ČSFD..." className="h-8 text-xs" />
                <Button size="sm" onClick={() => doSearch(csfdQuery)} disabled={csfdSearching || !csfdQuery.trim()} className="shrink-0 h-8">
                  {csfdSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
            {csfdSearching && csfdResults.length === 0 && (
              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Hľadám...</div>
            )}
            {csfdResults.length > 0 && (
              <>
                {!showSearchInput && (
                  <button onClick={() => setShowSearchInput(true)} className="text-[11px] text-muted-foreground hover:text-foreground mb-1">Upraviť hľadanie...</button>
                )}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {csfdResults.map((r) => (
                    <button key={r.csfdId} onClick={() => handleCsfdImport(r.csfdId, r.title, r.origins)}
                      className={cn("w-full text-left p-2 rounded-lg border hover:border-primary/40 transition-all flex items-center gap-2", csfdImporting && "opacity-50 pointer-events-none")}>
                      {r.poster && <img src={r.poster} alt="" className="w-8 h-11 object-cover rounded shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{r.title} {r.year && <span className="text-muted-foreground">({r.year})</span>}</p>
                        {r.directors.length > 0 && <p className="text-[11px] text-muted-foreground truncate">{r.directors.join(", ")}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
            {csfdImporting && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importujem...</div>}
          </div>
        )}

        {showFields && (
          <div className="space-y-3 animate-fade-in">
            <EditableYear value={year} movieId={movieId} />
            <EditableField label="Réžia" icon={<Clapperboard className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />} value={director} movieId={movieId} field="director" />
            <EditableField label="Scenár" icon={<PenTool className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />} value={screenplay} movieId={movieId} field="screenplay" />
            <EditableField label="Hudba" icon={<MusicIcon className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />} value={music} movieId={movieId} field="music" />
            <EditableField label="Hrajú" icon={<Users className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />} value={cast} movieId={movieId} field="cast" />
            <EditableField label="Popis" icon={<FileText className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />} value={plot} movieId={movieId} field="plot" multiline />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* CSFD import - only for editors */}
      {!readOnly && <div>
        <button
          onClick={() => setShowCsfd(!showCsfd)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all",
            showCsfd
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Importovať z ČSFD"
        >
          <Download className="h-3 w-3" />
          ČSFD
        </button>

        {showCsfd && (
          <div className="mt-3 animate-fade-in">
            {/* Search input - shown if no results or user wants to refine */}
            {(showSearchInput || csfdResults.length === 0) && (
              <div className="flex gap-2 mb-2">
                <Input
                  value={csfdQuery}
                  onChange={(e) => setCsfdQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doSearch(csfdQuery)}
                  placeholder="Hľadať film na ČSFD..."
                  className="h-9 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => doSearch(csfdQuery)}
                  disabled={csfdSearching || !csfdQuery.trim()}
                  className="shrink-0"
                >
                  {csfdSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* Loading state */}
            {csfdSearching && csfdResults.length === 0 && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Hľadám na ČSFD...
              </div>
            )}

            {/* Results */}
            {csfdResults.length > 0 && (
              <>
                {!showSearchInput && (
                  <button
                    onClick={() => setShowSearchInput(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                  >
                    Nenašli ste? Upraviť hľadanie...
                  </button>
                )}
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {csfdResults.map((r) => (
                    <Card
                      key={r.csfdId}
                      className={cn(
                        "cursor-pointer transition-all hover:border-primary/40",
                        csfdImporting && "opacity-50 pointer-events-none"
                      )}
                    >
                      <CardContent
                        className="p-3 flex items-center gap-3"
                        onClick={() => handleCsfdImport(r.csfdId, r.title, r.origins)}
                      >
                        {r.poster && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.poster}
                            alt={r.title}
                            className="w-10 h-14 object-cover rounded shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {r.title}
                            {r.year && <span className="text-muted-foreground ml-1.5">({r.year})</span>}
                          </p>
                          {r.directors.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Réžia: {r.directors.join(", ")}
                            </p>
                          )}
                          {r.actors.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              Hrajú: {r.actors.join(", ")}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          Importovať
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {csfdImporting && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importujem detaily z ČSFD...
              </div>
            )}
          </div>
        )}
      </div>}

      {/* Fields */}
      {!readOnly && <EditableYear value={year} movieId={movieId} />}

      <EditableField
        label="Réžia"
        icon={<Clapperboard className="h-4 w-4 mt-0.5 text-primary shrink-0" />}
        value={director}
        movieId={movieId}
        field="director"
        readOnly={readOnly}
      />
      <EditableField
        label="Scenár"
        icon={<PenTool className="h-4 w-4 mt-0.5 text-primary shrink-0" />}
        value={screenplay}
        movieId={movieId}
        field="screenplay"
        readOnly={readOnly}
      />
      <EditableField
        label="Hudba"
        icon={<MusicIcon className="h-4 w-4 mt-0.5 text-primary shrink-0" />}
        value={music}
        movieId={movieId}
        field="music"
        readOnly={readOnly}
      />
      <EditableField
        label="Hrajú"
        icon={<Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />}
        value={cast}
        movieId={movieId}
        field="cast"
        readOnly={readOnly}
      />
      <EditableField
        label="Popis"
        icon={<FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />}
        value={plot}
        movieId={movieId}
        field="plot"
        multiline
        readOnly={readOnly}
      />
    </div>
  );
}
