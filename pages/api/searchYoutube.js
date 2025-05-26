import ytsr from "ytsr";

/**
 * Handles requests to search YouTube for videos.
 * It uses the `ytsr` library to perform the search based on the provided query.
 *
 * @async
 * @param {import('next').NextApiRequest} req - The Next.js API request object.
 * @param {object} req.query - The request query parameters.
 * @param {string} req.query.query - The search query string for YouTube.
 * @param {import('next').NextApiResponse} res - The Next.js API response object.
 * @returns {Promise<void>} A promise that resolves when the response has been sent.
 *                          Successful responses:
 *                          - 200 with JSON `{ searchResults: ytsrResult }`, where `ytsrResult` is the
 *                            object returned by the `ytsr` library.
 *                          Error responses:
 *                          - Implicit 500 errors if the `ytsr` call fails. The handler does not
 *                            currently have explicit error handling for `ytsr` failures.
 */
export default async function handler(req, res) {
    const { query } = req.query;
    const firstResultBatch = await ytsr(query, { pages: 1, hl: "sk" });

    res.status(200).json({ searchResults: firstResultBatch });
}
