import fs from 'fs';
import axios from 'axios';

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
        if (!fs.existsSync(`./.cache/${newPath}`)) {
            fs.mkdirSync(`./.cache/${newPath}`, { recursive: true });
        }

        fs.writeFileSync(`./.cache/${path}`, response.data);
        res.setHeader('Content-Type', 'image/jpeg');
        res.status(200).send(response.data);    
    }).catch((error) => {
        res.status(404).json({ error: 'Image not found' });
    });
}
