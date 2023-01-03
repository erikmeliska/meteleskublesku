import axios from 'axios';
import iconv from 'iconv-lite';
import { parse } from 'node-html-parser';
import fs from 'fs';

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