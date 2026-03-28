import iconv from "iconv-lite";
import { parse } from "node-html-parser";
import { readJsonCache, writeJsonCache } from "./cache";
import type { Movie, MovieListItem } from "@/types/movie";

const OLD_URL = process.env.NEXT_PUBLIC_OLD_URL || "http://meteleskublesku.cz";
const MOVIE_LIST_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Fetch raw HTML from old server with iso-8859-2 decoding.
 */
async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  return iconv.decode(buffer, "iso-8859-2");
}

/**
 * Get list of all movies (cached).
 */
export async function getMovieList(): Promise<MovieListItem[]> {
  const cached = readJsonCache<MovieListItem[]>("movies.json", MOVIE_LIST_TTL);
  if (cached) return cached;

  const html = await fetchHtml(`${OLD_URL}?tab=movies`);
  const root = parse(html);

  const movies = root
    .querySelectorAll("table table table tr td.full-width div")
    .map((movie) => {
      const desc = movie
        .querySelector("h2")!
        .nextSibling!.parentNode.childNodes.filter(
          (node, index) => index > 1 && node.text.trim() !== ""
        )
        .map((elm) => elm.text.trim());

      const imgNode = movie.parentNode.parentNode.querySelector(
        "td.middle img"
      );
      let img: string | null = null;
      if (imgNode) {
        img = imgNode.getAttribute("src")!.replace("/th", "/");
      }

      return {
        id: movie
          .querySelector("h2 a")!
          .getAttribute("href")!
          .replace("./?movie=", "")
          .split("&")[0],
        title: movie.querySelector("h2")!.text.trim(),
        image: img,
        desc,
      };
    });

  writeJsonCache("movies.json", movies);
  return movies;
}

/**
 * Get movie list enriched with audio track names for full-text search.
 * Fetches all movies in parallel (batched) and caches for 7 days.
 */
export async function getMovieListWithAudio(): Promise<MovieListItem[]> {
  const cacheKey = "movies-with-audio.json";
  const cached = readJsonCache<MovieListItem[]>(cacheKey, MOVIE_LIST_TTL);
  if (cached) return cached;

  const movies = await getMovieList();

  // Fetch all movie details in parallel (batches of 10)
  const batchSize = 10;
  const enriched = [...movies];

  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const details = await Promise.all(
      batch.map((m) => getMovie(m.id).catch(() => null))
    );
    details.forEach((detail, j) => {
      if (detail?.audio) {
        enriched[i + j] = {
          ...enriched[i + j],
          audioTracks: detail.audio.map((a) => a.text),
        };
      }
    });
  }

  writeJsonCache(cacheKey, enriched);
  return enriched;
}

/**
 * Get detailed movie data by ID (cached).
 */
export async function getMovie(id: string): Promise<Movie | null> {
  const cacheKey = `movie-${id}.json`;
  const cached = readJsonCache<Movie>(cacheKey);
  if (cached) return cached;

  try {
    const html = await fetchHtml(`${OLD_URL}/?movie=${id}`);
    const root = parse(html);

    const h1 = root.querySelector("h1");
    if (!h1) return null;

    const title = h1.text.trim();

    const desc = h1.nextSibling!.parentNode.childNodes
      .filter((node, index) => index > 1 && node.text.trim() !== "")
      .map((elm) => elm.text.trim())
      .filter((elm) => elm !== "\u00abArch\u00edv\u00bb");

    const audio = root.querySelectorAll("#soundlist tr").map((tr) => ({
      text: tr.querySelector("td")?.nextElementSibling?.text?.trim() ?? "",
      url: tr.querySelector("td a")!.getAttribute("href")!,
      length: tr.querySelector("td a")!.text.trim(),
    }));

    const images = root.querySelectorAll("#imagelist img").map((img) => ({
      thumbnail: img.getAttribute("src")!,
      url: img.getAttribute("src")!.replace("/th", "/"),
    }));

    const movie: Movie = { id, title, image: images[0]?.url ?? null, desc, audio, images };
    writeJsonCache(cacheKey, movie);
    return movie;
  } catch {
    return null;
  }
}
