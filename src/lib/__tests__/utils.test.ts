import { describe, it, expect } from "vitest";
import { cn, parseTimeToSeconds, formatSecondsToTime, parseMovieTitle } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("merges tailwind classes correctly", () => {
    // twMerge should resolve conflicts
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });
});

describe("parseTimeToSeconds", () => {
  it("parses HH:MM:SS.mmm format", () => {
    expect(parseTimeToSeconds("1:23:45.678")).toBeCloseTo(5025.678);
  });

  it("parses MM:SS.mmm format", () => {
    expect(parseTimeToSeconds("23:45.678")).toBeCloseTo(1425.678);
  });

  it("parses SS.mmm format", () => {
    expect(parseTimeToSeconds("45.678")).toBeCloseTo(45.678);
  });

  it("parses whole seconds", () => {
    expect(parseTimeToSeconds("45")).toBe(45);
  });

  it("parses zero values", () => {
    expect(parseTimeToSeconds("0:00:00")).toBe(0);
  });

  it("parses MM:SS without milliseconds", () => {
    expect(parseTimeToSeconds("5:30")).toBe(330);
  });
});

describe("formatSecondsToTime", () => {
  it("formats seconds under a minute", () => {
    expect(formatSecondsToTime(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatSecondsToTime(125)).toBe("2:05");
  });

  it("formats hours", () => {
    expect(formatSecondsToTime(3661)).toBe("1:01:01");
  });

  it("formats zero", () => {
    expect(formatSecondsToTime(0)).toBe("0:00");
  });

  it("includes fractional seconds when present", () => {
    const result = formatSecondsToTime(45.5);
    expect(result).toBe("0:45.5");
  });

  it("pads seconds with leading zero", () => {
    expect(formatSecondsToTime(65)).toBe("1:05");
  });

  it("formats hours with padded minutes and seconds", () => {
    expect(formatSecondsToTime(7200)).toBe("2:00:00");
  });
});

describe("parseMovieTitle", () => {
  it("extracts title and year from 'Title (1985)'", () => {
    expect(parseMovieTitle("Vesnicko ma strediskova (1985)")).toEqual({
      title: "Vesnicko ma strediskova",
      year: "1985",
    });
  });

  it("handles title without year", () => {
    expect(parseMovieTitle("Some Movie")).toEqual({
      title: "Some Movie",
      year: "",
    });
  });

  it("handles title with spaces before parenthesis", () => {
    expect(parseMovieTitle("Title   (2000)")).toEqual({
      title: "Title",
      year: "2000",
    });
  });

  it("handles empty string", () => {
    expect(parseMovieTitle("")).toEqual({ title: "", year: "" });
  });

  it("handles title with parentheses in name but no year", () => {
    expect(parseMovieTitle("Title (Extended)")).toEqual({
      title: "Title (Extended)",
      year: "",
    });
  });

  it("handles title with year at end with trailing space", () => {
    expect(parseMovieTitle("Movie (1999) ")).toEqual({
      title: "Movie",
      year: "1999",
    });
  });
});
