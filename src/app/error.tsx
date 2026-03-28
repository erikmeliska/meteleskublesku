"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container flex flex-col items-center justify-center py-24 text-center">
      <AlertCircle className="h-16 w-16 text-destructive mb-6" />
      <h2 className="text-2xl font-semibold mb-2">Niečo sa pokazilo</h2>
      <p className="text-muted-foreground mb-6">
        Nastala neočakávaná chyba pri načítaní stránky.
      </p>
      <Button onClick={reset}>Skúsiť znova</Button>
    </div>
  );
}
