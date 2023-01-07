import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import axios from "axios";
import { useState, useEffect } from "react";
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

export default function Home({ movies }) {
    const router = useRouter();
    const [selected, setSelected] = useState(movies.map((item) => item.id));

    const handleAddNew = () => {
        router.push("/add");
    };

    return (
        <Container sx={{ mb: 2 }}>
            <Typography variant="h4" sx={{ my: 3, fontWeight: 100 }}>
                Meteleskublesku <strong>reloaded</strong>
            </Typography>
            <Autocomplete
                disablePortal
                id="combo-box-demo"
                noOptionsText="Žiadne výsledky"
                onChange={(event, value) =>
                    setSelected(
                        movies
                            .filter((item) => value?.id == item.id || !value)
                            .map((item) => item.id)
                    )
                }
                options={movies.map((item) => {
                    return { label: item.title, id: +item.id };
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
                {movies
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
                                                    object-fit="cover"
                                                    alt={movie.title}
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
                                            {movie.title.split("(")[0]}
                                        </Typography>
                                        {movie.title.split("(")[1]
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

export const getServerSideProps = async (ctx) => {
    const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_WEB_URL}/api/getMovieList`
    );

    return {
        props: {
            movies: data.movies.sort((a, b) => a.title.localeCompare(b.title)),
        },
    };
};
