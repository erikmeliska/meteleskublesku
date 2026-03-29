import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

// Mock fs module with explicit implementations
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    statSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

import fs from "fs";
import {
  readJsonCache,
  writeJsonCache,
  readBinaryCache,
  writeBinaryCache,
  cacheExists,
  getCacheFullPath,
} from "../cache";

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockWriteFileSync = vi.mocked(fs.writeFileSync);
const mockMkdirSync = vi.mocked(fs.mkdirSync);
const mockStatSync = vi.mocked(fs.statSync);
const mockUnlinkSync = vi.mocked(fs.unlinkSync);

describe("cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("readJsonCache", () => {
    it("returns null when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      expect(readJsonCache("test.json")).toBeNull();
    });

    it("reads and parses JSON from cache file", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ foo: "bar" }));

      const result = readJsonCache<{ foo: string }>("test.json");
      expect(result).toEqual({ foo: "bar" });
    });

    it("returns null and deletes file when TTL is expired", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        mtimeMs: Date.now() - 10000,
      } as any);

      const result = readJsonCache("test.json", 5000);
      expect(result).toBeNull();
      expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("returns data when within TTL", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        mtimeMs: Date.now() - 1000,
      } as any);
      mockReadFileSync.mockReturnValue(JSON.stringify({ data: 123 }));

      const result = readJsonCache<{ data: number }>("test.json", 5000);
      expect(result).toEqual({ data: 123 });
    });

    it("does not check TTL when ttlMs is not provided", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ data: 1 }));

      readJsonCache("test.json");
      expect(mockStatSync).not.toHaveBeenCalled();
    });
  });

  describe("writeJsonCache", () => {
    it("creates cache directory and writes JSON", () => {
      mockExistsSync.mockReturnValue(false);

      writeJsonCache("test.json", { hello: "world" });

      expect(mockMkdirSync).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("test.json"),
        JSON.stringify({ hello: "world" })
      );
    });

    it("creates nested directories for nested keys", () => {
      mockExistsSync.mockReturnValue(false);

      writeJsonCache("sub/dir/test.json", { a: 1 });

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("sub"),
        expect.objectContaining({ recursive: true })
      );
    });
  });

  describe("readBinaryCache", () => {
    it("returns null when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      expect(readBinaryCache("audio.mp3")).toBeNull();
    });

    it("returns Buffer when file exists", () => {
      const buf = Buffer.from("audio data");
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(buf as any);

      const result = readBinaryCache("audio.mp3");
      expect(result).toEqual(buf);
    });
  });

  describe("writeBinaryCache", () => {
    it("writes binary data to cache", () => {
      mockExistsSync.mockReturnValue(false);

      const buf = Buffer.from("data");
      writeBinaryCache("file.bin", buf);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("file.bin"),
        buf
      );
    });
  });

  describe("cacheExists", () => {
    it("returns true when file exists", () => {
      mockExistsSync.mockReturnValue(true);
      expect(cacheExists("test.json")).toBe(true);
    });

    it("returns false when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      expect(cacheExists("test.json")).toBe(false);
    });
  });

  describe("getCacheFullPath", () => {
    it("returns full path for a cache key", () => {
      const fullPath = getCacheFullPath("test.json");
      expect(fullPath).toContain(".cache");
      expect(fullPath).toContain("test.json");
    });
  });
});
