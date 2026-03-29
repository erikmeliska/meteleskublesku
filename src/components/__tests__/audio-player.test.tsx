import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { AudioTrack } from "@/types/movie";

// Mock react-h5-audio-player - default export is used as <AudioPlayer ref={...} ... />
vi.mock("react-h5-audio-player", () => {
  const MockAudioPlayer = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ audio: { current: null } }));
    return (
      <div data-testid="audio-player" data-src={props.src}>
        <button onClick={props.onClickNext} data-testid="next-btn">Next</button>
        <button onClick={props.onClickPrevious} data-testid="prev-btn">Previous</button>
      </div>
    );
  });
  MockAudioPlayer.displayName = "MockAudioPlayer";
  return { __esModule: true, default: MockAudioPlayer };
});

vi.mock("react-h5-audio-player/lib/styles.css", () => ({}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Play: (props: any) => <span data-testid="play-icon" {...props} />,
  Volume2: (props: any) => <span data-testid="volume-icon" {...props} />,
  Share2: (props: any) => <span data-testid="share-icon" {...props} />,
  Check: (props: any) => <span data-testid="check-icon" {...props} />,
  Repeat: (props: any) => <span data-testid="repeat-icon" {...props} />,
  Link: (props: any) => <span data-testid="link-icon" {...props} />,
  Search: (props: any) => <span data-testid="search-icon" {...props} />,
  X: (props: any) => <span data-testid="x-icon" {...props} />,
}));

import { AudioPlayerBar } from "../audio-player";

const tracks: AudioTrack[] = [
  { id: "clip_1", text: "First quote", url: "/audio/first.mp3", length: "0:05" },
  { id: "clip_2", text: "Second quote", url: "/audio/second.mp3", length: "0:08" },
  { id: "clip_3", text: "Third quote", url: "/audio/third.mp3", length: "0:03" },
];

describe("AudioPlayerBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "sessionStorage", {
      value: { getItem: vi.fn(), setItem: vi.fn() },
      writable: true,
    });
    window.history.replaceState = vi.fn();
  });

  it("renders nothing when tracks array is empty", () => {
    const { container } = render(<AudioPlayerBar tracks={[]} movieId="mov_abc" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders track list with all tracks", () => {
    render(<AudioPlayerBar tracks={tracks} movieId="mov_abc" />);
    // First track appears twice: in "now playing" bar and in the list
    expect(screen.getAllByText("First quote").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Second quote")).toBeInTheDocument();
    expect(screen.getByText("Third quote")).toBeInTheDocument();
  });

  it("shows track count", () => {
    render(<AudioPlayerBar tracks={tracks} movieId="mov_abc" />);
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("shows Audio nahrávky header", () => {
    render(<AudioPlayerBar tracks={tracks} movieId="mov_abc" />);
    expect(screen.getByText("Audio nahrávky")).toBeInTheDocument();
  });

  it("shows track lengths", () => {
    render(<AudioPlayerBar tracks={tracks} movieId="mov_abc" />);
    expect(screen.getByText("0:05")).toBeInTheDocument();
    expect(screen.getByText("0:08")).toBeInTheDocument();
    expect(screen.getByText("0:03")).toBeInTheDocument();
  });

  it("shows auto-advance toggle", () => {
    render(<AudioPlayerBar tracks={tracks} movieId="mov_abc" />);
    expect(screen.getByText("Auto")).toBeInTheDocument();
  });

  it("selects a track when clicked", async () => {
    const user = userEvent.setup();
    render(<AudioPlayerBar tracks={tracks} movieId="mov_abc" />);

    const secondTrackBtn = screen.getByText("Second quote").closest("button");
    if (secondTrackBtn) {
      await user.click(secondTrackBtn);
    }
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it("does not show search when fewer than 6 tracks", () => {
    render(<AudioPlayerBar tracks={tracks} movieId="mov_abc" />);
    expect(screen.queryByPlaceholderText("Hľadať v nahrávkach...")).not.toBeInTheDocument();
  });

  it("shows search when more than 5 tracks", () => {
    const manyTracks: AudioTrack[] = Array.from({ length: 10 }, (_, i) => ({
      id: `clip_${i}`,
      text: `Quote ${i}`,
      url: `/audio/${i}.mp3`,
      length: "0:05",
    }));
    render(<AudioPlayerBar tracks={manyTracks} movieId="mov_abc" />);
    expect(screen.getByPlaceholderText("Hľadať v nahrávkach...")).toBeInTheDocument();
  });

  it("filters tracks by search query", async () => {
    const user = userEvent.setup();
    const manyTracks: AudioTrack[] = Array.from({ length: 10 }, (_, i) => ({
      id: `clip_${i}`,
      text: i === 5 ? "Special unique quote" : `Quote ${i}`,
      url: `/audio/${i}.mp3`,
      length: "0:05",
    }));
    render(<AudioPlayerBar tracks={manyTracks} movieId="mov_abc" />);

    const searchInput = screen.getByPlaceholderText("Hľadať v nahrávkach...");
    await user.type(searchInput, "Special");

    expect(screen.getByText("Special unique quote")).toBeInTheDocument();
    // Quote 0 is the initially selected track, so it still shows in the "now playing" bar
    // but should not be in the filtered track list
    const quote0Elements = screen.queryAllByText("Quote 0");
    // At most 1 (the now-playing label), not in the filtered list
    expect(quote0Elements.length).toBeLessThanOrEqual(1);
  });
});
