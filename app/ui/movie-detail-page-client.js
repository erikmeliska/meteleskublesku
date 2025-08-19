"use client";

import { BottomNavigation, Button, Card, CardContent, CardMedia, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Drawer, Grid, ImageList, ImageListItem, Link as MUILink, List, ListItem, ListItemButton, Paper, Typography } from '@mui/material';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css'; // This will require CSS handling in Next.js App Router (e.g. global import)
import { useRouter, useSearchParams, usePathname } from "next/navigation"; // Updated imports
import Link from 'next/link';

/**
 * Displays detailed information for a specific movie, including its description,
 * image gallery, and a list of audio clips. It allows users to select different images
 * and audio clips to play. Handles autoplay blocking by showing a dialog.
 *
 * @param {object} props - The component's props.
 * @param {object} props.movie - The movie object. Expected to have `title`, `year` (extracted from title),
 *                               `desc` (array of strings), `images` (array of objects with `url` and `thumbnail`),
 *                               and `audio` (array of objects with `url`, `text`, `id`).
 * @param {number} props.initialAudioId - The initial audio ID (1-based index) to select an audio clip.
 * @param {string} props.movieId - The ID of the movie.
 * @returns {JSX.Element} The rendered movie detail page.
 */
export default function MovieDetailPageClient({ movie, initialAudioId, movieId }) {
    // Determine initial selected audio object based on initialAudioId (1-based index)
    const initialSelectedAudioObject = movie.audio[initialAudioId - 1] || movie.audio[0];

    const [selectedAudio, setSelectedAudio] = useState(initialSelectedAudioObject);
    const [audioUrl, setAudioUrl] = useState(initialSelectedAudioObject?.url || ''); // URL string for the player
    const [image, setImage] = useState(movie.images[0]?.url || '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const player = useRef(null);
    const router = useRouter();
    const pathname = usePathname(); // e.g., /movie/movieId1
    // searchParams could be used if we needed to read other query params client-side
    // const searchParams = useSearchParams();

    useEffect(() => {
        // Set initial audio URL for the player based on selectedAudio
        if (selectedAudio) {
            setAudioUrl(selectedAudio.url);
        }
    }, [selectedAudio]);

    useEffect(() => {
        // Attempt to play when audioUrl changes (which means selectedAudio changed)
        // This also handles initial play attempt
        if (audioUrl && player.current?.audio?.current) {
            player.current.audio.current.src = `${process.env.NEXT_PUBLIC_INTERNAL_API_URL || ''}/api/getAudio?path=${audioUrl}`;
            player.current.audio.current.load(); // Important to load new src
            if (autoPlay || selectedAudio === initialSelectedAudioObject) { // Attempt autoplay on initial load or if autoPlay is true
                handlePlay();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioUrl]); // Only re-run when the audioUrl string changes


    const handlePlayDialog = () => {
        setDialogOpen(false);
        if (player.current?.audio?.current) {
            player.current.audio.current.play().catch(() => setDialogOpen(true)); // Try playing again
        }
    };

    const handleAudioChange = (clip) => { // clip is the full audio object
        setSelectedAudio(clip);
        setAutoPlay(true); // Enable autoplay when user explicitly changes clip

        // Update URL with the new audio clip's ID as a query parameter
        // The page path is /movie/[movieId], audio selection is via query param ?audio=<clip.id>
        // The component receives initialAudioId (1-based index) from server component,
        // but for URL updates, we use the actual clip.id (descriptive string)
        const newUrl = `${pathname}?audio=${clip.id}`;
        router.push(newUrl, { scroll: false }); // Use router.push for App Router to allow history state
    };

    const handlePlay = () => {
        if (player.current?.audio?.current) {
            const playPromise = player.current.audio.current.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    setDialogOpen(false);
                })
                .catch(error => {
                    setDialogOpen(true); // Show dialog if autoplay is blocked
                });
            }
        }
    };

    // Initial play attempt for the first loaded audio
    useEffect(() => {
        if (player.current?.audio?.current && selectedAudio === initialSelectedAudioObject) {
            // Only attempt initial autoplay for the very first audio loaded
            // Subsequent changes are handled by autoPlay state set in handleAudioChange
            setAutoPlay(true); // Set to true to attempt play via audioUrl effect
            handlePlay();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [player.current, initialSelectedAudioObject]);


    return (
        <Container sx={{ mt: 2, mb: 10}}>
            <Paper elevation={0} sx={{ p: 0, my: 1, display: 'flex', flexDirection: 'column', alignItems: 'left', justifyContent: 'center' }}>
                {/* Use Next.js Link for client-side navigation */}
                <Link href="/" passHref legacyBehavior>
                    <MUILink variant="body2">&lt; Späť na úvod</MUILink>
                </Link>
            </Paper>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Card sx={{ maxWidth: 800}}>
                        {image &&
                            <CardMedia
                                component="img"
                                height="25%" // This might not work as expected, use sx or style for height
                                image={`${process.env.NEXT_PUBLIC_INTERNAL_API_URL || ''}/api/getImage?path=${image}`}
                                alt={movie.title}
                                sx={{ objectFit: 'cover', height: 'auto', maxHeight: '400px' }} // Example styling
                            />
                        }
                        <CardContent>
                            <Typography	gutterBottom variant="h5" component="div">
                                {movie.title ? movie.title.replace(`(${movie.year})`, '').trim() : 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Rok: {movie.year}
                            </Typography>
                            {movie.desc &&
                                movie.desc.map((descLine) => (
                                <Typography key={descLine} variant="body2" color="text.secondary">
                                    {descLine}
                                </Typography>
                            ))
                            }
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={4}>
                    <ImageList sx={{ maxWidth: 800, height: 'auto', maxHeight: 500, my: 0 }} cols={3} rowHeight={120}>
                        {movie.images.map((imgItem) => (
                            <ImageListItem key={imgItem.url} onClick={() => setImage(imgItem.url)} className={(imgItem.url === image) ? 'active':''}>
                                {/* Using next/image for thumbnails */}
                                <Image
                                    src={`${process.env.NEXT_PUBLIC_INTERNAL_API_URL || ''}/api/getImage?path=${imgItem.thumbnail}&w=164&h=164&fit=crop&auto=format`}
                                    alt={imgItem.url} // Alt text is the full image URL as per component
                                    width={150}
                                    height={100}
                                    style={{ objectFit: 'cover', cursor: 'pointer' }}
                                />
                            </ImageListItem>
                        ))}
                    </ImageList>
                </Grid>
                <Grid item xs={12} sm={6} md={5} lg={4}>
                    <Card sx={{ width: '100%', maxWidth: 450, bgcolor: 'background.paper' }}>
                        <List dense>
                            {movie.audio.map((audClip) => (
                                <ListItem disablePadding key={audClip.id} onClick={() => handleAudioChange(audClip)}>
                                    <ListItemButton selected={selectedAudio?.id === audClip.id}>
                                        {audClip.text}
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
                    ref={player}
                    src={audioUrl ? `${process.env.NEXT_PUBLIC_INTERNAL_API_URL || ''}/api/getAudio?path=${audioUrl}` : ''}
                    autoPlayAfterSrcChange={autoPlay}
                    showJumpControls={false}
                    customAdditionalControls={[]}
                    layout="horizontal-reverse"
                    // onPlayError and other event handlers can be added if needed
                />
            </Drawer>

            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <DialogTitle id="modal-modal-title">{selectedAudio?.text || 'Audio ukážka'}</DialogTitle>
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
