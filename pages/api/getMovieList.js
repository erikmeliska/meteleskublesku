import axios from 'axios';
import iconv from 'iconv-lite';
import { parse } from 'node-html-parser';
import fs from 'fs';

const moviesFile = './.cache/movies.json';

/**
 * Handles requests for fetching the list of all movies.
 * It first checks a local cache (`./.cache/movies.json`) for the movie list.
 * If found, it serves the cached list.
 * If not found, it fetches the main movie listing page from an external source
 * (defined by `NEXT_PUBLIC_OLD_URL` with `?tab=movies` query),
 * parses the HTML to extract the list of movies (id, title, image, description),
 * caches this list as JSON, and then serves it.
 *
 * @async
 * @param {import('next').NextApiRequest} req - The Next.js API request object. (No specific query or body parameters are expected for this endpoint).
 * @param {import('next').NextApiResponse} res - The Next.js API response object.
 * @returns {Promise<void>} A promise that resolves when the response has been sent.
 *                          Successful responses:
 *                          - 200 with JSON `{ movies: arrayOfMovieObjects }`. Each movie object contains
 *                            `id`, `title`, `image` (URL), and `desc` (array of strings).
 *                          Error responses:
 *                          - Implicit 500 errors if operations (axios fetch, HTML parsing, file system writes) fail.
 *                            The handler does not currently have explicit error handling for these cases beyond what
 *                            the underlying libraries or Next.js provide.
 */
export default async function handler(req, res) {
    if (fs.existsSync(moviesFile)) {
        const movies = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));
        res.status(200).json({ movies });
        return;
    }

    const response = await axios.get(`${process.env.NEXT_PUBLIC_OLD_URL}?tab=movies`, {
        responseEncoding: 'binary',
    })

    const html = iconv.decode(response.data, 'iso-8859-2');
    const root = parse(html);

    const movies = root.querySelectorAll('table table table tr td.full-width div').map((movie) => {
        const desc = movie.querySelector('h2').nextSibling.parentNode.childNodes.filter((node, index)=>index > 1 && node.text.trim() != '').map((elm) => {
            return elm.text.trim();
        })

        const imgNode = movie.parentNode.parentNode.querySelector('td.middle img')
        let img = null
        if (imgNode) {
            img = imgNode.getAttribute('src').replace('/th', '/')
        }

        return {
            id: movie.querySelector('h2 a').getAttribute('href').replace('./?movie=', '').split('&')[0],
            title: movie.querySelector('h2').text.trim(),
            image: img,
            desc: desc,
        }
    });

    fs.writeFileSync(moviesFile, JSON.stringify(movies));

    res.status(200).json({ movies });
}