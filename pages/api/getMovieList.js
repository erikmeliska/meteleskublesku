import axios from 'axios';
import iconv from 'iconv-lite';
import { parse } from 'node-html-parser';
import fs from 'fs';

const moviesFile = './.cache/movies.json';

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
            cast: movie.querySelector('h2').nextSibling.text.trim(),
            image: img,
            desc: desc,
        }
    });

    fs.writeFileSync(moviesFile, JSON.stringify(movies));

    res.status(200).json({ movies });
}