"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const themes = ["system", "light", "dark"] as const;
const icons = { system: Monitor, light: Sun, dark: Moon };
const labels = { system: "Systémová téma", light: "Svetlá téma", dark: "Tmavá téma" };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = (theme as keyof typeof icons) || "system";
  const Icon = icons[current];

  function cycleTheme() {
    const idx = themes.indexOf(current);
    setTheme(themes[(idx + 1) % themes.length]);
  }

  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme} title={labels[current]}>
      <Icon className="h-5 w-5" />
      <span className="sr-only">{labels[current]}</span>
    </Button>
  );
}
