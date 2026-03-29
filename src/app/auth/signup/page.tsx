"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Mail, Lock, User, Loader2, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength =
    password.length === 0
      ? 0
      : password.length < 8
        ? 1
        : password.length < 12
          ? 2
          : 3;

  const strengthColors = ["", "bg-destructive", "bg-amber", "bg-green-500"];
  const strengthLabels = ["", "Slabé", "Stredné", "Silné"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Heslá sa nezhodujú");
      return;
    }
    if (password.length < 8) {
      setError("Heslo musí mať aspoň 8 znakov");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nastala chyba");
      } else {
        toast.success("Účet bol vytvorený! Teraz sa prihláste.");
        router.push("/auth/signin");
      }
    } catch {
      setError("Nastala chyba pri registrácii");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex">
      {/* Left side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
          <div className="animate-float">
            <Film className="h-20 w-20 text-primary/30 mb-8" />
          </div>
          <blockquote className="text-2xl font-light text-foreground/60 text-center max-w-md italic">
            &ldquo;Jéžišmarjá, Šebesta, co vy to tam vyvádíte!&rdquo;
          </blockquote>
          <p className="text-sm text-muted-foreground mt-4">
            &mdash; Černí baroni (1992)
          </p>
          <div className="mt-12 text-center">
            <h2 className="text-xl font-semibold gradient-text">
              Meteleskublesku reloaded
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Vytvorte si účet a spravujte svoje audio clipy
            </p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center lg:hidden mb-4">
            <Film className="h-10 w-10 mx-auto text-primary mb-3" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Vytvoriť účet
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Registrujte sa pre správu audio clipov
            </p>
          </div>

          {error && (
            <div className="animate-fade-in rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Meno</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Vaše meno"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

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
                  placeholder="Minimálne 8 znakov"
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
              {password.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${strengthColors[passwordStrength]}`}
                      style={{
                        width: `${(passwordStrength / 3) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {strengthLabels[passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potvrdenie hesla</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Zopakujte heslo"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
                {confirmPassword && password === confirmPassword && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
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
                  Registrácia...
                </>
              ) : (
                "Vytvoriť účet"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Už máte účet?{" "}
            <Link
              href="/auth/signin"
              className="text-primary font-medium hover:underline"
            >
              Prihlásiť sa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
