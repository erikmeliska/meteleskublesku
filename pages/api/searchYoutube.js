import ytsr from "ytsr";

export default async function handler(req, res) {
    const { query } = req.query;
    const firstResultBatch = await ytsr(query, { pages: 1, hl: "sk" });

    res.status(200).json({ searchResults: firstResultBatch });
}
