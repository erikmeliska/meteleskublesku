import { Container, ImageList, ImageListItem } from '@mui/material';
import axios from 'axios';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

export default function Movie( { movie }) {
    const [audio, setAudio] = useState(movie.audio[0].url);
    const [image, setImage] = useState((movie.images[0]?.url) ? movie.images[0].url : '');

    const loadAudio = (url) => {
        const player = document.querySelector('audio');
        player.src = `${process.env.NEXT_PUBLIC_WEB_URL}/api/getAudio?path=${url}`;
        player.load();
        player.play();
    }

    useEffect(() => {
        loadAudio(audio);
    }, [audio]);

    return (
        <Container>
            <h1>{movie.title}</h1>
            <h2>{movie.director}</h2>
            <h3>{movie.year}</h3>
            <AudioPlayer
                src={`${process.env.NEXT_PUBLIC_WEB_URL}/api/getAudio?path=${audio}`}
                autoPlay={false}
                showJumpControls={false}
                customAdditionalControls={[]}
                // customVolumeControls={[]}
                layout="horizontal-reverse"
            />
            <div className="mainBlock">
                <ul className="audio">
                    {movie.audio.map((aud) => (
                        <li key={aud.url} onClick={() => setAudio(aud.url)} className={(aud.url === audio) ? 'active':''}>{aud.text}</li>
                    ))}
                </ul>
                <div className="image">
                    <img src={`${process.env.NEXT_PUBLIC_WEB_URL}/api/getImage?path=${image}`} />
                </div>
            </div>
            <ImageList sx={{ width: 500, height: 450 }} cols={3} rowHeight={164}>
                {movie.images.map((img) => (
                    <ImageListItem key={img.url} onClick={() => setImage(img.url)} className={(img.url === image) ? 'active':''}>
                        <img width={150} height={100} src={`${process.env.NEXT_PUBLIC_WEB_URL}/api/getImage?path=${img.url}&w=164&h=164&fit=crop&auto=format`} />
                    </ImageListItem>
                ))}
            </ImageList>
        </Container>
    );
}

export const getServerSideProps = async (ctx) => {
    const { data } = await axios.get(`${process.env.NEXT_PUBLIC_WEB_URL}/api/getMovie?id=${ctx.params.id}`)

    return {
        props: {
            movie: data.movie
        }
    }
}