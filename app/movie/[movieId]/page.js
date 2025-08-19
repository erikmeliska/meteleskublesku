import axios from 'axios';
import { notFound } from 'next/navigation';
import MovieDetailPageClient from '../../ui/movie-detail-page-client'; // Path to the client component
import { Suspense } from 'react';

/**
 * Fetches data for a specific movie.
 *
 * @async
 * @param {string} movieId - The ID of the movie to fetch.
 * @returns {Promise<object|null>} A promise that resolves to the movie data object,
 *                                   or null if not found or an error occurs.
 */
async function getMovie(movieId) {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_INTERNAL_API_URL || process.env.NEXT_PUBLIC_WEB_URL}/api/getMovie?id=${movieId}`;
    const { data } = await axios.get(apiUrl);
    if (data && data.movie) {
      return data.movie;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch movie ${movieId}:`, error.message);
    return null;
  }
}

/**
 * Generates metadata for the movie page.
 *
 * @async
 * @param {object} props - The props for generating metadata.
 * @param {object} props.params - The route parameters containing `movieId`.
 * @returns {Promise<object>} A promise that resolves to the metadata object.
 */
export async function generateMetadata({ params }) {
  const movieId = params.movieId;
  if (isNaN(parseInt(movieId))) {
    return { title: 'Movie Not Found' }; // Or handle as an error
  }
  const movie = await getMovie(movieId);
  if (!movie) {
    return { title: 'Movie Not Found' };
  }
  return {
    title: movie.title || 'Movie Details',
    description: movie.desc ? movie.desc.join(' ') : 'Movie details and audio clips.',
    // Add other metadata tags as needed, e.g., openGraph
    // openGraph: {
    //   title: movie.title,
    //   description: movie.desc ? movie.desc.join(' ') : '',
    //   images: movie.images?.[0]?.url ? [`${process.env.NEXT_PUBLIC_WEB_URL}/api/getImage?path=${movie.images[0].url}`] : [],
    // },
  };
}

/**
 * The server component for the dynamic movie page in the App Router.
 * It fetches movie data based on `movieId` from the URL parameters
 * and normalizes the `initialAudioId` from search parameters.
 * It then passes this data to the `MovieDetailPageClient` component for rendering.
 *
 * @async
 * @param {object} props - The component's props.
 * @param {object} props.params - The dynamic route parameters.
 * @param {string} props.params.movieId - The ID of the movie from the URL.
 * @param {object} props.searchParams - The search parameters from the URL.
 * @param {string} [props.searchParams.audio] - The specific audio clip ID from the URL (optional).
 * @returns {Promise<JSX.Element>} The rendered movie page or a 404 page if data is not found.
 */
export default async function MoviePage({ params, searchParams }) {
  const movieId = params.movieId;

  // Validate movieId format (should be a number string)
  if (isNaN(parseInt(movieId)) || String(parseInt(movieId)) !== movieId) {
    notFound();
  }

  const movieData = await getMovie(movieId);

  if (!movieData) {
    notFound();
  }

  // Validate and determine initialAudioId (1-based index for client component prop)
  let initialAudioId = 1; // Default to 1 (first clip)
  const audioIdFromQuery = searchParams?.audio;

  if (audioIdFromQuery) {
    // Try to find the index of the audio clip if audioIdFromQuery is a descriptive ID
    const foundIndex = movieData.audio.findIndex(a => a.id === audioIdFromQuery);
    if (foundIndex !== -1) {
      initialAudioId = foundIndex + 1; // Convert 0-based to 1-based index
    } else {
      // If not found by ID, try parsing as a 1-based index
      const numericAudioId = parseInt(audioIdFromQuery, 10);
      if (!isNaN(numericAudioId) && numericAudioId >= 1 && numericAudioId <= movieData.audio.length) {
        initialAudioId = numericAudioId;
      }
      // If still invalid or not found, it remains the default '1'
    }
  }

  return (
    <Suspense fallback={<div>Načítavam detaily filmu...</div>}>
      <MovieDetailPageClient movie={movieData} initialAudioId={initialAudioId} movieId={movieId} />
    </Suspense>
  );
}
