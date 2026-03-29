import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "../theme-toggle";

// Mock next-themes - no top-level variables in factory
vi.mock("next-themes", () => {
  const setTheme = vi.fn();
  return {
    useTheme: vi.fn().mockReturnValue({
      theme: "light",
      setTheme,
    }),
  };
});

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Sun: () => <span data-testid="sun-icon" />,
  Moon: () => <span data-testid="moon-icon" />,
}));

// Mock button component
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

import { useTheme } from "next-themes";

describe("ThemeToggle", () => {
  it("renders sun and moon icons", () => {
    render(<ThemeToggle />);
    expect(screen.getByTestId("sun-icon")).toBeInTheDocument();
    expect(screen.getByTestId("moon-icon")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<ThemeToggle />);
    expect(screen.getByText("Prepnúť tému")).toBeInTheDocument();
  });

  it("switches from light to dark on click", async () => {
    const mockSetTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
    } as any);

    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("switches from dark to light on click", async () => {
    const mockSetTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
    } as any);

    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });
});
