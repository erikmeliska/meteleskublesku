import { Film, Github, ExternalLink } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative border-t">
      {/* Gradient top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              <span className="font-semibold">
                Meteleskublesku{" "}
                <span className="font-light text-muted-foreground">
                  reloaded
                </span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Webová aplikácia pre fanúšikov českej a slovenskej filmovej
              klasiky. Zvukové nahrávky z kultových filmov na jednom mieste.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Odkazy
            </h3>
            <div className="flex flex-col gap-2 text-sm">
              <a
                href="http://meteleskublesku.cz/"
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Pôvodný web
              </a>
              <a
                href="http://meteleskublesku.cz/?tab=info"
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Autorské práva
              </a>
              <a
                href="https://github.com/erikmeliska/meteleskublesku"
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              O projekte
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pôvodný web nebol roky aktualizovaný a obsahoval Flash prehrávač.
              Tento projekt poskytuje rovnaký obsah s moderným prehrávačom.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Obsah &copy;{" "}
            <a
              href="http://meteleskublesku.cz/"
              className="hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              meteleskublesku.cz
            </a>
            {" "}&middot; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
