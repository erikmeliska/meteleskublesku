import { BottomNavigation, Card, CardContent, CardMedia, Container, Drawer, Grid, ImageList, ImageListItem, List, ListItem, ListItemButton, Typography } from '@mui/material';
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
        try {
            player.play();
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        loadAudio(audio);
    }, [audio]);

    console.log(movie)

    return (
        <Container sx={{ mt: 2, mb: 10}}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Card sx={{ maxWidth: 800}}>
                        {image &&
                            <CardMedia component="img" height="25%" image={`${process.env.NEXT_PUBLIC_WEB_URL}/api/getImage?path=${image}`} alt={movie.title} />
                        }
                        <CardContent>
                            <Typography	gutterBottom variant="h5" component="div">
                                {movie.title.split('(')[0]}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Rok: {(movie.title.split('(')[1]) ? movie.title.split('(')[1].replace(')', '') : ''}
                            </Typography>
                            {movie.desc &&
                                movie.desc.map((desc) => (
                                <Typography key={desc} variant="body2" color="text.secondary"> 
                                    {desc}
                                </Typography>
                            ))
                            }
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={4}>
                    <ImageList sx={{ maxWidth: 800, height: 500, my: 0 }} cols={3} rowHeight={120}>
                        {movie.images.map((img) => (
                            <ImageListItem key={img.url} onClick={() => setImage(img.url)} className={(img.url === image) ? 'active':''}>
                                <img width={150} height={100} src={`${process.env.NEXT_PUBLIC_WEB_URL}/api/getImage?path=${img.url}&w=164&h=164&fit=crop&auto=format`} />
                            </ImageListItem>
                        ))}
                    </ImageList>
                </Grid>
                <Grid item xs={12} sm={6} md={5} lg={4}>
                    <Card sx={{ width: '100%', maxWidth: 450, bgcolor: 'background.paper' }}>
                        <List dense>
                            {movie.audio.map((aud) => (
                                <ListItem disablePadding key={aud.url} onClick={() => setAudio(aud.url)}>
                                    <ListItemButton selected={(aud.url === audio)}>
                                        {aud.text}
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Card>
                </Grid>
            </Grid>

            <Drawer
                variant="permanent"
                anchor="bottom"
            >
                <AudioPlayer
                    src={`${process.env.NEXT_PUBLIC_WEB_URL}/api/getAudio?path=${audio}`}
                    autoPlay={true}
                    showJumpControls={false}
                    customAdditionalControls={[]}
                    // customVolumeControls={[]}
                    layout="horizontal-reverse"
                />
            </Drawer>
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