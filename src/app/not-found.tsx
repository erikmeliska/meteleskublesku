import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Film } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center py-24 text-center">
      <Film className="h-16 w-16 text-muted-foreground mb-6" />
      <h2 className="text-2xl font-semibold mb-2">Stránka nenájdená</h2>
      <p className="text-muted-foreground mb-6">
        Požadovaná stránka neexistuje.
      </p>
      <Button asChild>
        <Link href="/">Späť na úvod</Link>
      </Button>
    </div>
  );
}
