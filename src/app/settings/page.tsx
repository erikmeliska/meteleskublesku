"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Settings, Save, Trash2, Loader2, Info, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cookies, setCookies] = useState("");
  const [hasCookies, setHasCookies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setHasCookies(data.hasCookies))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ytCookies: cookies }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "Cookies uložené" });
        setHasCookies(!!cookies.trim());
        setCookies("");
      }
    } catch {
      setMessage({ type: "error", text: "Chyba pri ukladaní" });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ytCookies: null }),
      });
      setMessage({ type: "success", text: "Cookies odstránené" });
      setHasCookies(false);
      setCookies("");
    } catch {
      setMessage({ type: "error", text: "Chyba pri mazaní" });
    }
    setSaving(false);
  };

  if (status === "loading") return null;
  if (!session) return null;

  return (
    <div className="container max-w-2xl py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Nastavenia</h1>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">YouTube Cookies</h2>
          <p className="text-sm text-muted-foreground">
            Pre sťahovanie niektorých YouTube videí je potrebné poskytnúť cookies z vášho prehliadača.
          </p>
        </div>

        {hasCookies && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            Cookies sú nastavené
          </div>
        )}

        <div className="rounded-lg bg-muted/50 border p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Ako získať cookies:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Nainštalujte si rozšírenie <a href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get cookies.txt LOCALLY</a> pre Chrome/Edge</li>
                <li>Choďte na <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">youtube.com</a> a prihláste sa</li>
                <li>Kliknite na ikonu rozšírenia a exportujte cookies</li>
                <li>Vložte obsah súboru do textového poľa nižšie</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cookies">Obsah cookies.txt</Label>
          <textarea
            id="cookies"
            value={cookies}
            onChange={(e) => setCookies(e.target.value)}
            placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;1735689600&#9;SIDCC&#9;value..."
            className="w-full h-48 rounded-lg border bg-background px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
          />
        </div>

        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
                : "bg-destructive/10 border border-destructive/20 text-destructive"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving || !cookies.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Uložiť cookies
          </Button>
          {hasCookies && (
            <Button variant="outline" onClick={handleDelete} disabled={saving}>
              <Trash2 className="h-4 w-4 mr-2" />
              Odstrániť
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
