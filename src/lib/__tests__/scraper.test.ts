import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cache before importing scraper
vi.mock("../cache", () => ({
  readJsonCache: vi.fn(),
  writeJsonCache: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getMovieList, getMovie } from "../scraper";
import { readJsonCache, writeJsonCache } from "../cache";

const mockReadJsonCache = vi.mocked(readJsonCache);
const mockWriteJsonCache = vi.mocked(writeJsonCache);

describe("scraper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMovieList", () => {
    it("returns cached data when available", async () => {
      const cachedMovies = [
        { id: "1", title: "Movie 1", image: null, desc: [] },
      ];
      mockReadJsonCache.mockReturnValue(cachedMovies);

      const result = await getMovieList();
      expect(result).toEqual(cachedMovies);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("fetches and parses HTML when cache is empty", async () => {
      mockReadJsonCache.mockReturnValue(null);

      // Create an HTML response that matches the scraper's selectors
      const html = `<html><body>
        <table><table><table>
          <tr><td class="full-width">
            <div>
              <h2><a href="./?movie=abc&tab=x">Test Movie (1999)</a></h2>
              <br>Popis filmu
            </div>
          </td>
          <td class="middle"><img src="/th/img.jpg" /></td>
          </tr>
        </table></table></table>
      </body></html>`;

      // iconv-lite decodes iso-8859-2, so we need to simulate raw buffer
      const encoder = new TextEncoder();
      const buffer = encoder.encode(html);

      mockFetch.mockResolvedValue({
        arrayBuffer: () => Promise.resolve(buffer.buffer),
      });

      const result = await getMovieList();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("?tab=movies")
      );
      expect(mockWriteJsonCache).toHaveBeenCalledWith(
        "movies.json",
        expect.any(Array)
      );
    });
  });

  describe("getMovie", () => {
    it("returns cached data when available", async () => {
      const cachedMovie = {
        id: "abc",
        title: "Test",
        image: null,
        desc: [],
        audio: [],
        images: [],
      };
      mockReadJsonCache.mockReturnValue(cachedMovie);

      const result = await getMovie("abc");
      expect(result).toEqual(cachedMovie);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns null when movie page has no h1", async () => {
      mockReadJsonCache.mockReturnValue(null);

      const html = "<html><body><p>No movie here</p></body></html>";
      const encoder = new TextEncoder();
      const buffer = encoder.encode(html);

      mockFetch.mockResolvedValue({
        arrayBuffer: () => Promise.resolve(buffer.buffer),
      });

      const result = await getMovie("nonexistent");
      expect(result).toBeNull();
    });

    it("returns null on fetch error", async () => {
      mockReadJsonCache.mockReturnValue(null);
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await getMovie("fail");
      expect(result).toBeNull();
    });

    it("parses movie detail HTML with audio and images", async () => {
      mockReadJsonCache.mockReturnValue(null);

      const html = `<html><body>
        <h1>Test Film (2000)</h1>
        <br>Description line
        <table id="soundlist">
          <tr><td><a href="/audio/clip.mp3">0:05</a></td><td>Funny quote</td></tr>
        </table>
        <div id="imagelist">
          <img src="/th/img1.jpg" />
        </div>
      </body></html>`;

      const encoder = new TextEncoder();
      const buffer = encoder.encode(html);

      mockFetch.mockResolvedValue({
        arrayBuffer: () => Promise.resolve(buffer.buffer),
      });

      const result = await getMovie("test-film");

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Test Film (2000)");
      expect(result!.id).toBe("test-film");
      expect(mockWriteJsonCache).toHaveBeenCalledWith(
        "movie-test-film.json",
        expect.objectContaining({ id: "test-film" })
      );
    });
  });
});
