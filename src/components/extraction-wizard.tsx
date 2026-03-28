"use client";

import { useState } from "react";
import { Search, Clock, Headphones, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Step = "search" | "time" | "preview" | "save";

interface VideoResult {
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  author: string;
}

interface ExtractionResult {
  sample: {
    audio: string;
    images: { begin: string; middle: string; end: string };
    subtitles: string;
  };
  metadata: {
    video_id: string;
  };
}

export function ExtractionWizard() {
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VideoResult[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [startTime, setStartTime] = useState("0:00");
  const [endTime, setEndTime] = useState("0:30");
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: "search", label: "Vyhľadať", icon: <Search className="h-4 w-4" /> },
    {
      key: "time",
      label: "Vybrať čas",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      key: "preview",
      label: "Extrahovať",
      icon: <Headphones className="h-4 w-4" />,
    },
    { key: "save", label: "Uložiť", icon: <Save className="h-4 w-4" /> },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/youtube/search?query=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      const items =
        data.searchResults?.items
          ?.filter((item: Record<string, string>) => item.type === "video")
          .map(
            (item: {
              title: string;
              url: string;
              bestThumbnail?: { url: string };
              duration: string;
              author?: { name: string };
            }) => ({
              title: item.title,
              url: item.url,
              thumbnail: item.bestThumbnail?.url || "",
              duration: item.duration,
              author: item.author?.name || "",
            })
          ) || [];
      setSearchResults(items);
    } catch {
      setSearchResults([]);
    }
    setLoading(false);
  };

  const handleSelectVideo = (video: VideoResult) => {
    setSelectedVideo(video);
    setStep("time");
  };

  const handleExtract = async () => {
    if (!selectedVideo) return;
    setLoading(true);
    try {
      const res = await fetch("/api/youtube/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: selectedVideo.url,
          start: startTime,
          end: endTime,
          name: name || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setExtractionResult(data);
        setStep("preview");
      }
    } catch {
      alert("Extrakcia zlyhala");
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                i <= stepIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {s.icon}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  i < stepIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Search */}
      {step === "search" && (
        <div>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Hľadať na YouTube..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Hľadám..." : "Hľadať"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {searchResults.map((video, i) => (
              <Card
                key={i}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleSelectVideo(video)}
              >
                <CardContent className="p-3 flex gap-3">
                  {video.thumbnail && (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-32 h-20 object-cover rounded"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm line-clamp-2">
                      {video.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {video.author} &middot; {video.duration}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Time selection */}
      {step === "time" && selectedVideo && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("search")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Späť na vyhľadávanie
          </Button>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">{selectedVideo.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full mb-4">
                <iframe
                  src={`https://www.youtube.com/embed/${new URL(selectedVideo.url).searchParams.get("v")}`}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Začiatok</label>
                  <Input
                    placeholder="0:00"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Koniec</label>
                  <Input
                    placeholder="0:30"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Názov (voliteľný)</label>
                  <Input
                    placeholder="Napr. Slavná hláška"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="mt-4 w-full"
                onClick={handleExtract}
                disabled={loading}
              >
                {loading ? "Extrahujem..." : "Extrahovať audio"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && extractionResult && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("time")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Upraviť časy
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview extrahovaného audia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 3 images */}
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(extractionResult.sample.images).map(
                  ([key, filename]) => (
                    <div key={key} className="text-center">
                      <img
                        src={`/api/media/image?path=temp/${extractionResult.metadata.video_id}/${filename}`}
                        alt={key}
                        className="w-full rounded border"
                      />
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {key === "begin"
                          ? "Začiatok"
                          : key === "middle"
                            ? "Stred"
                            : "Koniec"}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* Audio player */}
              <audio
                controls
                className="w-full"
                src={`/api/media/audio?path=temp/${extractionResult.metadata.video_id}/${extractionResult.sample.audio}`}
              />

              {/* Subtitles */}
              {extractionResult.sample.subtitles && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Titulky:</p>
                  <p className="text-sm whitespace-pre-line">
                    {extractionResult.sample.subtitles}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("time")}
                  className="flex-1"
                >
                  Znovu extrahovať
                </Button>
                <Button onClick={() => setStep("save")} className="flex-1">
                  Uložiť
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Save */}
      {step === "save" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audio bolo extrahované</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Headphones className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground mb-4">
              Audio bolo úspešne extrahované a uložené do cache. Po prihlásení
              ho budete môcť priradiť ku konkrétnemu filmu.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("search");
                  setSearchResults([]);
                  setSelectedVideo(null);
                  setExtractionResult(null);
                  setQuery("");
                  setName("");
                }}
              >
                Extrahovať ďalšie
              </Button>
              <Button asChild>
                <a href="/">Späť na úvod</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
