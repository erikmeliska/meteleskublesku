import fs from 'fs';
import axios from 'axios';

/**
 * Handles requests for serving image files.
 * It first checks a local cache for the requested image file.
 * If found, it serves the cached file.
 * If not found, it fetches the image file from an external source (defined by `NEXT_PUBLIC_OLD_URL`),
 * caches it, and then serves it.
 * Directories are created as needed for caching.
 *
 * @async
 * @param {import('next').NextApiRequest} req - The Next.js API request object.
 * @param {object} req.query - The request query parameters.
 * @param {string} req.query.path - The path to the image file (e.g., 'images/movie1/poster.jpg').
 *                                  This path is used for both caching and fetching from the old server.
 * @param {import('next').NextApiResponse} res - The Next.js API response object.
 * @returns {Promise<void>} A promise that resolves when the response has been sent.
 *                          Successful responses:
 *                          - 200 with the image file data and 'Content-Type: image/jpeg'.
 *                          Error responses:
 *                          - 404 with JSON `{ error: 'Image not found' }` if fetching from the external source fails.
 *                          - Implicit 500 errors if file system operations (mkdir, writeFile) fail.
 */
export default async function handler(req, res) {
    const { path } = req.query;

    if (fs.existsSync(`./.cache/${path}`)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.status(200).send(fs.readFileSync(`./.cache/${path}`));
        return;
    }

    axios.get(`${process.env.NEXT_PUBLIC_OLD_URL}/${path}`, {
        responseType: 'arraybuffer',
    }).then((response) => {
        const newPath = path.split('/').slice(0, -1).join('/');
        if (newPath && !fs.existsSync(`./.cache/${newPath}`)) { // Check if newPath is not empty
            fs.mkdirSync(`./.cache/${newPath}`, { recursive: true });
        }

        fs.writeFileSync(`./.cache/${path}`, response.data);
        res.setHeader('Content-Type', 'image/jpeg');
        res.status(200).send(response.data);    
    }).catch((error) => {
        res.status(404).json({ error: 'Image not found' });
    });
}
