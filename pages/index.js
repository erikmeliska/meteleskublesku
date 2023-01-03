import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import axios from 'axios';
import { useState, useEffect } from 'react';
import { Card, CardActionArea, CardContent, CardMedia, Container, Grid, Typography } from "@mui/material";

export default function Home({ movies }) {
	const router = useRouter();

    return (
		<Container sx={{mb: 2}}>
			<Typography variant="h4" sx={{my: 3, fontWeight: 100}}>Meteleskublesku <strong>reloaded</strong></Typography>
			<Grid container spacing={2}>
			{movies.map((movie) => (
				<Grid key={movie.id} item xs={12} sm={6} md={4} lg={3}>
					<Card sx={{ maxWidth: 345 }}>
						<CardActionArea onClick={() => router.push(`/movie/${movie.id}`)}>
						{movie.image &&
							<CardMedia component="img" height="50%" image={`${process.env.NEXT_PUBLIC_WEB_URL}/api/getImage?path=${movie.image}`} alt={movie.title} />
						}
						<CardContent>
							<Typography	gutterBottom variant="h5" component="div">
								{movie.title.split('(')[0]}
							</Typography>
							{(movie.title.split('(')[1]) ? movie.title.split('(')[1].replace(')', '') : ''}
						</CardContent>
						</CardActionArea>
					</Card>
				</Grid>
			))}
			</Grid>
			<Typography variant="body2" sx={{mt: 3, fontWeight: 100}}>
				Meteleskublesku <strong>reloaded</strong> je webová aplikácia, pre všetkých fanúšikov českej klasiky, ktorá slúži na prehrávanie zvukových záznamov z knižnice <a href="http://meteleskublesku.cz/" target="_blank">meteleskublesku.cz</a>.<br />
			</Typography>
			<Typography variant="body2" sx={{mt: 1, fontWeight: 100}}>
				Pôvodný web nebol veľa rokov aktualizovaný a žiaľ obsahuje flash prehrávač, ktorý už nie je podporovaný.<br />
				Tento web má za cieľ poskytnúť užívateľom rovnaký obsah ako pôvodný web, ale s moderným prehrávačom a responzívnou funkčnosťou aj pre mobily.<br />
			</Typography>
			<Typography variant="body2" sx={{mt: 1, fontWeight: 100}}>
				Autorské práva na obsah webu rieši <a href="http://meteleskublesku.cz/?tab=info" target="_blank">meteleskublesku.cz</a>.<br />
				Source code: <a href="">https://github.com/erikmeliska/meteleskublesku</a><br />
			</Typography>
		</Container>
	)
}

export const getServerSideProps = async (ctx) => {
	const { data } = await axios.get(`${process.env.NEXT_PUBLIC_WEB_URL}/api/getMovieList`)

    return {
        props: {
            movies: data.movies.sort((a, b) => a.title.localeCompare(b.title))
        }
    }
}