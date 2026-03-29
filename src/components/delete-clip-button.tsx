"use client";

import { useState, useCallback } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function DeleteClipButton({ clipId }: { clipId: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = useCallback(async () => {
    if (!confirm("Naozaj chcete zmazať tento klip?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/clips?id=${encodeURIComponent(clipId)}`, { method: "DELETE" });
      router.refresh();
    } catch {
      setDeleting(false);
    }
  }, [clipId, router]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
      className="h-7 text-xs text-destructive hover:text-destructive"
    >
      {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
    </Button>
  );
}
