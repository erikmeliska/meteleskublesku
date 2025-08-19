import axios from 'axios';
import iconv from 'iconv-lite';
import { parse } from 'node-html-parser';
import fs from 'fs';
import { NextResponse } from 'next/server';

const moviesFile = './.cache/movies.json'; // Ensure this path is correct relative to the new execution context

/**
 * Handles GET requests for fetching the list of all movies.
 * It first checks a local cache (`./.cache/movies.json`) for the movie list.
 * If found, it serves the cached list.
 * If not found, it fetches the main movie listing page from an external source
 * (defined by `NEXT_PUBLIC_OLD_URL` with `?tab=movies` query),
 * parses the HTML to extract the list of movies (id, title, image, description),
 * caches this list as JSON, and then serves it.
 *
 * @async
 * @param {import('next/server').NextRequest} request - The Next.js request object.
 * @returns {Promise<NextResponse>} A promise that resolves to a NextResponse object.
 *                                  Successful responses:
 *                                  - JSON `{ movies: arrayOfMovieObjects }` with a 200 status.
 *                                  Error responses:
 *                                  - Implicit 500 errors if operations (axios fetch, HTML parsing, file system writes) fail.
 *                                    The handler does not currently have explicit error handling for these cases.
 */
export async function GET(request) {
    // Ensure the cache path is correctly resolved. In App Router, relative paths might behave differently.
    // For simplicity, keeping './.cache/movies.json'. If issues arise, absolute paths or path.resolve might be needed.
    // const moviesFilePath = path.resolve(process.cwd(), '.cache', 'movies.json');
    // const cacheDir = path.resolve(process.cwd(), '.cache');
    // if (!fs.existsSync(cacheDir)) {
    //     fs.mkdirSync(cacheDir, { recursive: true });
    // }


    if (fs.existsSync(moviesFile)) {
        const moviesData = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));
        return NextResponse.json({ movies: moviesData });
    }

    try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_OLD_URL}?tab=movies`, {
            responseEncoding: 'binary',
        });

        const html = iconv.decode(response.data, 'iso-8859-2');
        const root = parse(html);

        const movies = root.querySelectorAll('table table table tr td.full-width div').map((movie) => {
            const desc = movie.querySelector('h2').nextSibling.parentNode.childNodes.filter((node, index)=>index > 1 && node.text.trim() != '').map((elm) => {
                return elm.text.trim();
            });

            const imgNode = movie.parentNode.parentNode.querySelector('td.middle img');
            let img = null;
            if (imgNode) {
                img = imgNode.getAttribute('src').replace('/th', '/');
            }

            return {
                id: movie.querySelector('h2 a').getAttribute('href').replace('./?movie=', '').split('&')[0],
                title: movie.querySelector('h2').text.trim(),
                image: img,
                desc: desc,
            };
        });

        // Ensure .cache directory exists before writing
        const cacheDir = moviesFile.substring(0, moviesFile.lastIndexOf('/'));
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        fs.writeFileSync(moviesFile, JSON.stringify(movies));

        return NextResponse.json({ movies });
    } catch (error) {
        console.error("Error in GET /api/getMovieList:", error);
        // Return a generic error response
        return NextResponse.json({ error: 'Failed to fetch movie list' }, { status: 500 });
    }
}
