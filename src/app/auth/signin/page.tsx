"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Mail, Lock, Github, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Nesprávny email alebo heslo");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Nastala chyba pri prihlasovaní");
    }
    setLoading(false);
  };

  const handleGithub = () => {
    setGithubLoading(true);
    signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex">
      {/* Left side - cinematic visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
          <div className="animate-float">
            <Film className="h-20 w-20 text-primary/30 mb-8" />
          </div>
          <blockquote className="text-2xl font-light text-foreground/60 text-center max-w-md italic">
            &ldquo;Ty vole, to je prdel, ne?&rdquo;
          </blockquote>
          <p className="text-sm text-muted-foreground mt-4">
            &mdash; Pelíšky (1999)
          </p>
          <div className="mt-12 text-center">
            <h2 className="text-xl font-semibold gradient-text">
              Meteleskublesku reloaded
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Zvukové nahrávky z českých a slovenských filmov
            </p>
          </div>
        </div>
      </div>

      {/* Right side - auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo for mobile */}
          <div className="text-center lg:hidden mb-4">
            <Film className="h-10 w-10 mx-auto text-primary mb-3" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Vitajte späť</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Prihláste sa do svojho účtu
            </p>
          </div>

          {error && (
            <div className="animate-fade-in rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleCredentials} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vas@email.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Zadajte heslo"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 gradient-primary text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Prihlasovanie...
                </>
              ) : (
                "Prihlásiť sa"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground uppercase tracking-wider">
                alebo
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleGithub}
            disabled={githubLoading}
          >
            {githubLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Github className="h-4 w-4 mr-2" />
            )}
            Pokračovať s GitHub
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Nemáte účet?{" "}
            <Link
              href="/auth/signup"
              className="text-primary font-medium hover:underline"
            >
              Registrovať sa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
