import fs from "fs";
import path from "path";

const CACHE_DIR = path.resolve(process.cwd(), ".cache");

/**
 * Ensure the cache base directory exists.
 */
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Get absolute cache file path from a relative key.
 */
function getCachePath(key: string): string {
  return path.join(CACHE_DIR, key);
}

/**
 * Read JSON from cache. Returns null if not found or expired.
 */
export function readJsonCache<T>(key: string, ttlMs?: number): T | null {
  const filePath = getCachePath(key);
  if (!fs.existsSync(filePath)) return null;

  if (ttlMs) {
    const stat = fs.statSync(filePath);
    if (Date.now() - stat.mtimeMs > ttlMs) {
      fs.unlinkSync(filePath);
      return null;
    }
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

/**
 * Write JSON to cache.
 */
export function writeJsonCache(key: string, data: unknown): void {
  ensureCacheDir();
  const filePath = getCachePath(key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data));
}

/**
 * Read binary file from cache. Returns null if not found.
 */
export function readBinaryCache(key: string): Buffer | null {
  const filePath = getCachePath(key);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

/**
 * Write binary file to cache.
 */
export function writeBinaryCache(key: string, data: Buffer): void {
  ensureCacheDir();
  const filePath = getCachePath(key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, data);
}

/**
 * Check if a cache entry exists.
 */
export function cacheExists(key: string): boolean {
  return fs.existsSync(getCachePath(key));
}

/**
 * Get full path for a cache key (for streaming).
 */
export function getCacheFullPath(key: string): string {
  return getCachePath(key);
}
