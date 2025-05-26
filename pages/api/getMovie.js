import axios from 'axios';
import iconv from 'iconv-lite';
import { parse } from 'node-html-parser';
import fs from 'fs';

/**
 * Handles requests for fetching detailed information about a specific movie.
 * It first checks a local cache for the movie data.
 * If found, it serves the cached data.
 * If not found, it fetches the movie's HTML page from an external source (defined by `NEXT_PUBLIC_OLD_URL`),
 * parses the HTML to extract details (title, description, audio clips, images),
 * caches this data as JSON, and then serves it.
 *
 * @async
 * @param {import('next').NextApiRequest} req - The Next.js API request object.
 * @param {object} req.query - The request query parameters.
 * @param {string} req.query.id - The ID of the movie to fetch.
 * @param {import('next').NextApiResponse} res - The Next.js API response object.
 * @returns {Promise<void>} A promise that resolves when the response has been sent.
 *                          Successful responses:
 *                          - 200 with JSON `{ movie: movieData }` where `movieData` includes title, description,
 *                            audio clips, and images.
 *                          Error responses:
 *                          - 404 with JSON `{ error: 'Movie not found' }` if the movie's main title (h1) cannot be parsed
 *                            from the fetched HTML, or if the initial fetch itself fails (implicitly via Next.js error handling).
 *                          - Implicit 500 errors if other operations (HTML parsing, file system writes) fail.
 */
export default async function handler(req, res) {
    const { id } = req.query;
    const movieFile = `./.cache/movie-${id}.json`;

    if (fs.existsSync(movieFile)) {
        const movie = JSON.parse(fs.readFileSync(movieFile, 'utf8'));
        res.status(200).json({ movie });
        return;
    }

    const response = await axios.get(`${process.env.NEXT_PUBLIC_OLD_URL}/?movie=${id}`, {
        responseEncoding: 'binary',
    })

    const movie = {}

    const html = iconv.decode(response.data, 'iso-8859-2');
    const root = parse(html);

    try {
        movie.title = root.querySelector('h1').text.trim();
    } catch (e) {
        // If h1 is not found, consider the movie as not found or page structure is unexpected.
        res.status(404).json({ error: 'Movie not found' });
        return;
    }
    
    const desc = root.querySelector('h1').nextSibling.parentNode.childNodes.filter((node, index)=>index > 1 && node.text.trim() != '').map((elm) => {
        return elm.text.trim();
    })

    movie.desc = desc.filter((elm) => elm != '«Archív»');

    movie.audio = root.querySelectorAll('#soundlist tr').map((tr) => {
        return {
            text: tr.querySelector('td').nextElementSibling.text.trim(),
            url: tr.querySelector('td a').getAttribute('href'),
            length: tr.querySelector('td a').text.trim()
        }
    });

    movie.images = root.querySelectorAll('#imagelist img').map((img) => {
        return {
            thumbnail: img.getAttribute('src'),
            url: img.getAttribute('src').replace('/th', '/')
        }
    });

    fs.writeFileSync(movieFile, JSON.stringify(movie));

    res.status(200).json({ movie });
}