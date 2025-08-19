"use client"; // Add use client directive

// Removed: import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/navigation"; // Changed from next/router
// Removed: import axios from "axios"; // Not needed in client component if data is passed as props
import { useState, useEffect } from "react"; // useEffect might still be used for client-side logic
import {
    Autocomplete,
    Button,
    Card,
    CardActionArea,
    CardContent,
    CardMedia,
    Container,
    Grid,
    TextField,
    Typography,
} from "@mui/material";

/**
 * The main page client component for displaying and filtering a list of movies.
 * It features an autocomplete search/filter bar and a grid of movie cards.
 * Each movie card links to the detailed movie page.
 * This component is intended to be used within the App Router.
 *
 * @param {object} props - The component's props.
 * @param {Array<object>} props.movies - An array of movie objects to display.
 *                                     Each object should contain at least `id`, `title`, `image`, and `year`.
 * @returns {JSX.Element} The rendered Home page client UI.
 */
export default function HomePageClient({ movies }) { // Renamed from Home for clarity if needed, but can keep Home
    const router = useRouter();
    // Initialize selected state with all movie IDs if movies array is provided and not empty
    const [selected, setSelected] = useState(movies ? movies.map((item) => item.id) : []);

    // useEffect might be used for client-side specific logic if any, e.g., based on router events or window.
    // For this migration, if useEffect was only for data fetching logic now in server component, it might be removed.
    // The current Home component doesn't have useEffect hooks.

    const handleAddNew = () => {
        router.push("/add"); // router.push usage is the same with next/navigation
    };

    // Ensure movies is an array before calling map or filter on it
    const safeMovies = Array.isArray(movies) ? movies : [];

    return (
        <Container sx={{ mb: 2 }}>
            {/* <Head> removed, metadata should be handled in app/page.js or app/layout.js */}
            <Typography variant="h4" sx={{ my: 3, fontWeight: 100 }}>
                Meteleskublesku <strong>reloaded</strong>
            </Typography>
            <Autocomplete
                disablePortal
                id="combo-box-demo"
                noOptionsText="Žiadne výsledky"
                onChange={(event, value) =>
                    setSelected(
                        safeMovies
                            .filter((item) => value?.id == item.id || !value)
                            .map((item) => item.id)
                    )
                }
                options={safeMovies.map((item) => {
                    // Ensure item and item.title are defined before trying to access properties
                    const label = item && item.title ? item.title : "Unknown Movie";
                    const id = item && item.id ? +item.id : null;
                    return { label: label, id: id };
                })}
                sx={{ mb: 0 }}
                renderInput={(params) => (
                    <TextField {...params} label="Vyber film" />
                )}
            />
            <Typography sx={{ my: 2 }}>
                Nenašli ste svoj obľúbený film? Nie je nič ľahšie!{" "}
                <Button onClick={handleAddNew}>Pridajte ho!</Button>
            </Typography>
            <Grid container spacing={2}>
                {safeMovies
                    .filter((item) => selected.includes(item.id))
                    .map((movie) => (
                        <Grid key={movie.id} item xs={12} sm={6} md={4} lg={3}>
                            <Card sx={{ maxWidth: 345 }}>
                                <CardActionArea
                                    onClick={() =>
                                        router.push(`/movie/${movie.id}`)
                                    }
                                >
                                    {movie.image && (
                                        <CardMedia>
                                            <div
                                                style={{
                                                    position: "relative",
                                                    height: 250,
                                                }}
                                            >
                                                <Image
                                                    src={`${process.env.NEXT_PUBLIC_WEB_URL}/api/getImage?path=${movie.image}`}
                                                    fill
                                                    objectFit="cover" // Note: objectFit is deprecated, use style={{ objectFit: 'cover' }}
                                                    alt={movie.title || 'Movie image'}
                                                />
                                            </div>
                                        </CardMedia>
                                    )}
                                    <CardContent>
                                        <Typography
                                            gutterBottom
                                            variant="h5"
                                            component="div"
                                        >
                                            {movie.title ? movie.title.split("(")[0] : 'N/A'}
                                        </Typography>
                                        {movie.title && movie.title.split("(")[1]
                                            ? movie.title
                                                  .split("(")[1]
                                                  .replace(")", "")
                                            : ""}
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
            </Grid>
            <Typography variant="body2" sx={{ mt: 3, fontWeight: 100 }}>
                Meteleskublesku <strong>reloaded</strong> je webová aplikácia,
                pre všetkých fanúšikov českej klasiky, ktorá slúži na
                prehrávanie zvukových záznamov z knižnice{" "}
                <a href="http://meteleskublesku.cz/">meteleskublesku.cz</a>.
                <br />
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 100 }}>
                Pôvodný web nebol veľa rokov aktualizovaný a žiaľ obsahuje flash
                prehrávač, ktorý už nie je podporovaný.
                <br />
                Tento web má za cieľ poskytnúť užívateľom rovnaký obsah ako
                pôvodný web, ale s moderným prehrávačom a responzívnou
                funkčnosťou aj pre mobily.
                <br />
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 100 }}>
                Autorské práva na obsah webu rieši{" "}
                <a href="http://meteleskublesku.cz/?tab=info">
                    meteleskublesku.cz
                </a>
                .<br />
                Source code:{" "}
                <a href="https://github.com/erikmeliska/meteleskublesku">
                    GitHub
                </a>
                <br />
            </Typography>
        </Container>
    );
}
