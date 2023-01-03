import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import axios from 'axios';
import { useState, useEffect } from 'react';
import { Card, CardActionArea, CardContent, CardMedia, Container, Grid, Typography } from "@mui/material";

export default function Home({ movies }) {
	const router = useRouter();

    return (
		<Container>
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