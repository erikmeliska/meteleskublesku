import Link from "next/link";
import { AlertCircle, Film, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Chyba prihlásenia",
};

export default function AuthErrorPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex">
      {/* Left side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
          <Film className="h-20 w-20 text-destructive/30 mb-8" />
          <div className="mt-8 text-center">
            <h2 className="text-xl font-semibold gradient-text">
              Meteleskublesku reloaded
            </h2>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Chyba prihlásenia
            </h1>
            <p className="text-muted-foreground mt-2">
              Pri prihlasovaní nastala chyba. Skúste to znova alebo použite iný
              spôsob prihlásenia.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild className="gradient-primary text-white">
              <Link href="/auth/signin">
                <RotateCcw className="h-4 w-4 mr-2" />
                Skúsiť znova
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Späť na úvod
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
