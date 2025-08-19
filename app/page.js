import axios from 'axios';
import HomePageClient from './ui/home-page-client'; // Adjusted path
import { Suspense } from 'react';

/**
 * Fetches the initial list of all movies from the API.
 * The fetched movies are sorted by title.
 *
 * @async
 * @returns {Promise<Array<object>>} A promise that resolves to an array of movie objects
 *                                   sorted by title. Each object contains `id`, `title`, `image`, etc.
 *                                   Returns an empty array if the API call fails or no movies are found.
 * @throws {Error} If the API call fails and is not handled.
 */
async function getMovies() {
  try {
    // Ensure process.env variables are accessed correctly.
    // NEXT_PUBLIC_WEB_URL might be for client-side, for server-side fetching,
    // direct internal URLs or a different env var might be used if running in same infra.
    // Assuming NEXT_PUBLIC_WEB_URL is accessible and correct for server-side fetching here.
    const apiUrl = `${process.env.NEXT_PUBLIC_WEB_URL || process.env.NEXT_PUBLIC_INTERNAL_API_URL}/api/getMovieList`;
    const { data } = await axios.get(apiUrl);

    if (data && Array.isArray(data.movies)) {
      return data.movies.sort((a, b) => {
        // Ensure title exists before trying to compare
        const titleA = a.title || '';
        const titleB = b.title || '';
        return titleA.localeCompare(titleB);
      });
    }
    return []; // Return empty array if data.movies is not as expected
  } catch (error) {
    console.error("Failed to fetch movies for app/page.js:", error);
    // In a real app, you might throw the error or return a specific error state / empty array
    return []; // Return empty array on error to prevent breaking page render
  }
}

/**
 * The main page for the App Router.
 * This is a React Server Component (RSC) by default.
 * It fetches movie data and then passes it to a client component (`HomePageClient`) for rendering.
 * Includes basic metadata.
 *
 * @async
 * @returns {Promise<JSX.Element>} The rendered page with the HomePageClient component.
 */
export default async function Page() {
  const movies = await getMovies();

  // Metadata can be exported from Server Components in App Router
  // For simplicity, setting a basic title here. A more complex setup would use generateMetadata.
  // This is illustrative; actual metadata export is done via `export const metadata = {...}`
  const pageTitle = "MeteleskuBlesku Reloaded - Hlavná stránka";

  return (
    <>
      {/*
        Illustrative metadata setting. In App Router, this is typically done by exporting a `metadata` object
        or a `generateMetadata` function from the page or layout.
        <Head> component from next/head is not used in App Router.
        <title>{pageTitle}</title>
      */}
      <Suspense fallback={<div>Načítavam filmy...</div>}>
        <HomePageClient movies={movies} />
      </Suspense>
    </>
  );
}

// Example of how metadata would be exported (not part of the Page function itself)
// export const metadata = {
//   title: 'Meteleskublesku Reloaded - Hlavná stránka',
//   description: 'Prehliadajte a filtrujte filmy z archívu MeteleskuBlesku.',
// };
