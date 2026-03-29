"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Film, LogIn, LayoutDashboard, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full glass shadow-sm">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
        >
          <div className="relative">
            <Film className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
          </div>
          <span className="hidden sm:inline text-lg font-semibold tracking-tight">
            Meteleskublesku{" "}
            <span className="font-light text-muted-foreground">reloaded</span>
          </span>
        </Link>

        {/* Nav links */}
        {session?.user && (
          <nav className="flex items-center gap-1 ml-8">
            <Link
              href="/dashboard"
              className="relative px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span className="flex items-center gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </span>
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </Link>
          </nav>
        )}

        {/* Right side actions */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <ThemeToggle />

          {/* Auth section */}
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                    <AvatarImage
                      src={session.user.image || undefined}
                      alt={session.user.name || ""}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {session.user.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session.user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Odhlásiť sa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-2"
            >
              <Link href="/auth/signin">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Prihlásiť sa</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
