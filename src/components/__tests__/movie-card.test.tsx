import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MovieCard } from "../movie-card";
import type { MovieListItem } from "@/types/movie";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Film: () => <span data-testid="film-icon" />,
  Play: () => <span data-testid="play-icon" />,
}));

describe("MovieCard", () => {
  const baseMovie: MovieListItem = {
    id: "mov_abc123",
    title: "Vesnicko ma strediskova (1985)",
    image: null,
    desc: ["Comedy"],
  };

  it("renders movie title", () => {
    render(<MovieCard movie={baseMovie} />);
    expect(screen.getByText("Vesnicko ma strediskova")).toBeInTheDocument();
  });

  it("renders year badge when title contains year", () => {
    render(<MovieCard movie={baseMovie} />);
    expect(screen.getByText("1985")).toBeInTheDocument();
  });

  it("does not render year badge when title has no year", () => {
    const movie = { ...baseMovie, title: "No Year Movie" };
    render(<MovieCard movie={movie} />);
    expect(screen.queryByText(/^\d{4}$/)).not.toBeInTheDocument();
  });

  it("links to movie page when no audio tracks", () => {
    render(<MovieCard movie={baseMovie} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/movie/abc123");
  });

  it("links to first clip when audio tracks exist", () => {
    const movie: MovieListItem = {
      ...baseMovie,
      audioTracks: [{ id: "clip_xyz", text: "Quote" }],
    };
    render(<MovieCard movie={movie} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/movie/abc123/clip/xyz");
  });

  it("renders image when available", () => {
    const movie = { ...baseMovie, image: "https://example.com/poster.jpg" };
    render(<MovieCard movie={movie} />);
    const img = screen.getByAltText("Vesnicko ma strediskova");
    expect(img).toHaveAttribute("src", "https://example.com/poster.jpg");
  });

  it("uses media proxy for non-http images", () => {
    const movie = { ...baseMovie, image: "/images/poster.jpg" };
    render(<MovieCard movie={movie} />);
    const img = screen.getByAltText("Vesnicko ma strediskova");
    expect(img.getAttribute("src")).toContain("/api/media/image?path=");
  });

  it("renders Film icon placeholder when no image", () => {
    render(<MovieCard movie={baseMovie} />);
    expect(screen.getByTestId("film-icon")).toBeInTheDocument();
  });

  it("renders 'Moje' badge when isMine is true", () => {
    const movie = { ...baseMovie, isMine: true };
    render(<MovieCard movie={movie} />);
    expect(screen.getByText("Moje")).toBeInTheDocument();
  });

  it("does not render 'Moje' badge when isMine is false", () => {
    render(<MovieCard movie={baseMovie} />);
    expect(screen.queryByText("Moje")).not.toBeInTheDocument();
  });

  it("strips mov_ prefix from movie id in href", () => {
    render(<MovieCard movie={baseMovie} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).not.toContain("mov_");
  });

  it("applies animation delay based on index", () => {
    const { container } = render(<MovieCard movie={baseMovie} index={5} />);
    const link = container.querySelector("a");
    expect(link?.style.animationDelay).toBe("200ms"); // 5 * 40
  });

  it("caps animation delay for index >= 20", () => {
    const { container } = render(<MovieCard movie={baseMovie} index={25} />);
    const link = container.querySelector("a");
    expect(link?.style.animationDelay).toBe("0ms"); // 0 for index >= 20
  });
});
