import { BottomNavigation, Button, Card, CardContent, CardMedia, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Drawer, Grid, ImageList, ImageListItem, Link as MUILink, List, ListItem, ListItemButton, Modal, Paper, Typography } from '@mui/material';
import axios from 'axios';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { useRouter } from "next/router";
import Link from 'next/link'

export default function Movie( { movie, audioId, movieId }) {
    const [audio, setAudio] = useState((audioId) ? movie.audio[audioId - 1].url : movie.audio[0].url);
    const [image, setImage] = useState((movie.images[0]?.url) ? movie.images[0].url : '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const player = useRef(null)

    const router = useRouter();

    const loadAudio = (url) => {
        player.current.src = `${process.env.NEXT_PUBLIC_WEB_URL}/api/getAudio?path=${url}`;
        player.current.load();
        handlePlay()
    }

    const handlePlayDialog = () => {
        setDialogOpen(false);
        player.current.play();
    }
    
    const handleAudioChange = (index, url) => {
        router.push({
            pathname: router.pathname,
            query: {
                params: [movieId, index + 1],
            }
            
        }, undefined, { shallow: true });
        
        setAudio(url);
    }

    useEffect(() => {
        if (player.current) {
            loadAudio(audio);
        }
    }, [audio]);

    useEffect(() => {
        player.current = document.querySelector('audio')
        handlePlay()
    }, []);

    const handlePlay = () => {
        if (player.current) {
            const playPromise = player.current.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    setDialogOpen(false);
                })
                .catch(error => {
                    setDialogOpen(true);
                });
            }
        }
    }
    
    return (
        <Container sx={{ mt: 2, mb: 10}}>
            <Paper elevation={0} sx={{ p: 0, my: 1, display: 'flex', flexDirection: 'column', alignItems: 'left', justifyContent: 'center' }}>
                <MUILink href="/" onClick={()=>router.push('/')} variant="body2">&lt; Späť na úvod</MUILink>
            </Paper>
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
                            {movie.audio.map((aud, index) => (
                                <ListItem disablePadding key={aud.url} onClick={() => handleAudioChange(index, aud.url)}>
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

            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <DialogTitle id="modal-modal-title">{movie.audio[audioId-1].text}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="modal-modal-description">
                        Prehrávanie ukážky začne až po kliknutí na tlačidlo
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handlePlayDialog}>Prehrať audio</Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
}

export const getServerSideProps = async (ctx) => {
    let [id, audio] = ctx.params.params || [1, 1]
    let data

    if (id != parseInt(id)) {
        return {
            notFound: true,
        }
    }

    try {
        const result = await axios.get(`${process.env.NEXT_PUBLIC_WEB_URL}/api/getMovie?id=${id}`)
        data = result.data
    } catch (e) {
        return {
            notFound: true,
        }
    }

    if (data.movie.audio.length < audio || audio < 1 || audio != parseInt(audio)) {
        audio = 1;
    }

    return {
        props: {
            movie: data.movie,
            movieId: id,
            audioId: audio
        }
    }
}