import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovieSearch } from "../movie-search";
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
  Search: () => <span data-testid="search-icon" />,
  X: () => <span data-testid="x-icon" />,
  Film: () => <span data-testid="film-icon" />,
  Volume2: () => <span data-testid="volume-icon" />,
  Play: () => <span data-testid="play-icon" />,
}));

// Mock MovieCard to simplify testing
vi.mock("@/components/movie-card", () => ({
  MovieCard: ({ movie }: { movie: MovieListItem }) => (
    <div data-testid={`movie-card-${movie.id}`}>{movie.title}</div>
  ),
}));

const movies: MovieListItem[] = [
  { id: "1", title: "Vesnicko ma strediskova (1985)", image: null, desc: [] },
  { id: "2", title: "Pelíšky (1999)", image: null, desc: [] },
  {
    id: "3",
    title: "Postriziny (1981)",
    image: null,
    desc: [],
    audioTracks: [{ id: "clip_1", text: "Famózní hláška" }],
  },
];

describe("MovieSearch", () => {
  it("renders all movies when no search query", () => {
    render(<MovieSearch movies={movies} />);
    expect(screen.getByTestId("movie-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("movie-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("movie-card-3")).toBeInTheDocument();
  });

  it("filters movies by title", async () => {
    const user = userEvent.setup();
    render(<MovieSearch movies={movies} />);

    const input = screen.getByPlaceholderText("Hľadať film alebo hlášku...");
    await user.type(input, "Pelíšky");

    expect(screen.getByTestId("movie-card-2")).toBeInTheDocument();
    expect(screen.queryByTestId("movie-card-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("movie-card-3")).not.toBeInTheDocument();
  });

  it("filters by audio track text", async () => {
    const user = userEvent.setup();
    render(<MovieSearch movies={movies} />);

    const input = screen.getByPlaceholderText("Hľadať film alebo hlášku...");
    await user.type(input, "Famózní");

    expect(screen.getByTestId("movie-card-3")).toBeInTheDocument();
    expect(screen.queryByTestId("movie-card-1")).not.toBeInTheDocument();
  });

  it("shows matched audio tracks under card", async () => {
    const user = userEvent.setup();
    render(<MovieSearch movies={movies} />);

    const input = screen.getByPlaceholderText("Hľadať film alebo hlášku...");
    await user.type(input, "Famózní");

    expect(screen.getByText("Famózní hláška")).toBeInTheDocument();
  });

  it("shows results count badge when searching", async () => {
    const user = userEvent.setup();
    render(<MovieSearch movies={movies} />);

    const input = screen.getByPlaceholderText("Hľadať film alebo hlášku...");
    await user.type(input, "Pelíšky");

    expect(screen.getByText(/1 z 3 filmov/)).toBeInTheDocument();
  });

  it("shows no results message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<MovieSearch movies={movies} />);

    const input = screen.getByPlaceholderText("Hľadať film alebo hlášku...");
    await user.type(input, "NonexistentMovie123");

    expect(screen.getByText("Žiadne výsledky")).toBeInTheDocument();
  });

  it("clears search when X button is clicked", async () => {
    const user = userEvent.setup();
    render(<MovieSearch movies={movies} />);

    const input = screen.getByPlaceholderText("Hľadať film alebo hlášku...");
    await user.type(input, "Pelíšky");

    expect(screen.queryByTestId("movie-card-1")).not.toBeInTheDocument();

    // Find and click the clear button
    const clearButton = screen.getByRole("button");
    await user.click(clearButton);

    // All movies should be visible again
    expect(screen.getByTestId("movie-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("movie-card-2")).toBeInTheDocument();
  });

  it("search is case-insensitive", async () => {
    const user = userEvent.setup();
    render(<MovieSearch movies={movies} />);

    const input = screen.getByPlaceholderText("Hľadať film alebo hlášku...");
    await user.type(input, "pelíšky");

    expect(screen.getByTestId("movie-card-2")).toBeInTheDocument();
  });

  it("shows 'Zobraziť všetky filmy' button in no-results state", async () => {
    const user = userEvent.setup();
    render(<MovieSearch movies={movies} />);

    const input = screen.getByPlaceholderText("Hľadať film alebo hlášku...");
    await user.type(input, "zzzzz");

    expect(
      screen.getByText("Zobraziť všetky filmy")
    ).toBeInTheDocument();
  });
});
