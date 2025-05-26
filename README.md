# MeteleskuBlesku Frontend

Kultová stránka meteleskublesku.cz potrebovala nový design a hlavne potrebovala sfunkčniť. Vznikol tak nový frontend stránky, ktorý je založený na Next.js.

## Project Description

This project is a modernized frontend for the website meteleskublesku.cz. Its primary purpose is to provide a faster, more reliable, and user-friendly experience for accessing the site's content.

Key features include:
- **Caching:** The application caches images and audio files locally to reduce the load on the original server and improve loading times.
- **YouTube Audio Extraction:** The frontend can extract and play audio directly from YouTube links, even if the original audio source is unavailable.
- **Modern Interface:** Built with Next.js, the frontend offers a responsive and interactive user experience.

## Project Structure

The project is organized into the following main directories:

- **`pages/api`**: Contains the backend API endpoints for various functionalities like fetching movie data, images, and audio.
- **`pages/movie`**: Contains the dynamic pages for displaying individual movie details.
- **`pages`**: Contains other frontend pages, including the main movie listing page.
- **`public`**: Stores static assets like images and fonts.
- **`.cache`**: This directory is used for caching images and audio files downloaded from the original server or extracted from YouTube.

## API Endpoints

The API endpoints are located in the `pages/api/` directory. Here's a list of the available endpoints:

- **`GET /api/image/[...params]`**:
    - **Function**: Fetches and returns an image. It first tries to serve the image from the local cache. If not found, it downloads the image from the original server, caches it, and then returns it.
    - **Request Parameters**: `params` (Array): An array of URL parts forming the path to the image on the original server.
    - **Response**: The image file.

- **`GET /api/audio/[...params]`**:
    - **Function**: Fetches and returns an audio file. It attempts to serve the audio from the local cache. If not found, it downloads the audio from the original server, caches it, and returns it. If the original audio is unavailable and a YouTube link is provided in the movie data, it extracts the audio from YouTube, caches it, and returns it.
    - **Request Parameters**: `params` (Array): An array of URL parts forming the path to the audio file or a YouTube video ID prefixed with `yt_`.
    - **Response**: The audio file.

- **`GET /api/movies`**:
    - **Function**: Fetches and returns a list of all movies.
    - **Request Parameters**: None.
    - **Response**: A JSON array of movie objects.

- **`GET /api/movie/[id]`**:
    - **Function**: Fetches and returns the details of a specific movie by its ID.
    - **Request Parameters**: `id` (String): The ID of the movie.
    - **Response**: A JSON object containing the movie details.

- **`POST /api/add`**: (Implied - for adding new movies)
    - **Function**: Allows adding a new movie to the database. (Further details to be specified based on implementation).
    - **Request Parameters**: (To be specified based on implementation - likely movie title, year, description, image/audio URLs, etc.)
    - **Response**: (To be specified based on implementation - likely a success/failure message and the ID of the newly added movie).

## Frontend Pages

- **`pages/index.js`**:
    - **Description**: This is the main page of the application. It displays a list of movies and provides options for filtering and searching through the movie collection.
    - **Features**:
        - Movie listing
        - Filtering by various criteria (e.g., year, genre - if available)
        - Search functionality

- **`pages/movie/[...params].js`**:
    - **Description**: This page displays the detailed information for a specific movie. The `params` in the URL typically represent the movie's ID.
    - **Features**:
        - Movie title, year, description, and other metadata.
        - Embedded audio player for listening to the movie's soundtrack or dialogue.
        - Image gallery (if multiple images are associated with the movie).

- **Implied "Add Movie" Page**:
    - While not explicitly a file in the `pages` directory (it might be part of `pages/index.js` or a separate modal/route), the functionality to add new movies is planned. This would involve a form to input movie details and submit them to the `/api/add` endpoint.

## Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    ```

3.  **Environment Variables:**
    The project uses environment variables for configuration. A template file `.env.example` is provided. Create a `.env` file in the root of the project by copying the example:
    ```bash
    cp .env.example .env
    ```
    Then, update the variables in `.env` with your specific configuration. Key variables include:
    - `METELESKUBLESKU_URL`: The base URL of the original meteleskublesku.cz site.
    - `INTERNAL_API_URL`: The URL of this application's backend API (e.g., `http://localhost:3000/api` for local development).
    - `MONGODB_URI`: The connection string for the MongoDB database.

## Running Locally

To run the application in development mode:

```bash
yarn dev
```
This will start the Next.js development server, typically on `http://localhost:3000`.

## Building and Running with Docker

The project includes a `Dockerfile` and `docker-compose.yml` for containerized deployment.

1.  **Build and run the Docker container:**
    ```bash
    docker-compose up --build
    ```
    This command will build the Docker image (if it doesn't exist or if changes are detected) and start the container. The application will be accessible, usually on `http://localhost:3000` (or as configured in `docker-compose.yml`).

-   **`Dockerfile`**: Defines the environment and steps to build the Next.js application image.
-   **`start.sh`**: A script used within the Docker container to start the Next.js application.

## Running Tests

(This section will be updated once tests are implemented.)

```bash
# Placeholder for test execution commands
# e.g., yarn test
```
