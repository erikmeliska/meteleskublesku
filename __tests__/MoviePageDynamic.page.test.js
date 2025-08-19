import React from 'react';
import { render, screen, fireEvent, waitFor, within }
from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoviePage from '../pages/movie/[...params]';
import '@testing-library/jest-dom';

process.env.NEXT_PUBLIC_WEB_URL = '';
process.env.NEXT_PUBLIC_INTERNAL_API_URL = '';

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
let mockRouterQuery; // This will be set in beforeEach

// More stable router mock
jest.mock('next/router', () => ({
  useRouter: () => {
    // This object is created once per useRouter call
    const routerInstance = {
      push: mockRouterPush,
      replace: (...args) => {
          const urlArg = args[0];
          if (typeof urlArg === 'string') {
              const pathSegments = urlArg.split('/');
              if (urlArg.startsWith('/movie/') && pathSegments.length >= 4) {
                  // Update the shared query object to reflect navigation
                  mockRouterQuery.params = [pathSegments[2], pathSegments[3]];
              }
          }
          mockRouterReplace(...args);
      },
      get query() { return mockRouterQuery; }, // Getter for query
      pathname: `/movie/${mockRouterQuery?.params?.[0] || '[movieId]'}/${mockRouterQuery?.params?.[1] || '[audioId]'}`,
      asPath: `/movie/${mockRouterQuery?.params?.[0] || 'undefined'}/${mockRouterQuery?.params?.[1] || 'undefined'}`,
      isReady: true,
      events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    };
    return routerInstance;
  },
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const { src, alt, width, height, style, className } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt || ''} width={width} height={height} style={style} className={className || ''}/>;
  },
}));

jest.mock('react-h5-audio-player/lib/styles.css', () => ({}));

const mockAudioPlayer = jest.fn();
jest.mock('react-h5-audio-player', () => ({
    __esModule: true,
    default: (props) => {
        mockAudioPlayer(props);
        return <audio data-testid="audio-player-mock" src={props.src} controls autoPlay={props.autoPlayAfterSrcChange || false} />;
    }
}));

const createMockMovieData = (movieIdNum, titlePrefix = 'Test Movie') => ({
  id: `movieId${movieIdNum}`,
  title: `${titlePrefix} ${movieIdNum} (${movieIdNum + 2019})`,
  desc: ['Description line 1', 'Description line 2 for movieId' + movieIdNum],
  year: movieIdNum + 2019,
  audio: [
    { text: 'Clip 1', url: `/audio/movie${movieIdNum}/clip1.mp3`, id: `audioId1_movie${movieIdNum}` },
    { text: 'Clip 2', url: `/audio/movie${movieIdNum}/clip2.mp3`, id: `audioId2_movie${movieIdNum}` },
  ],
  images: [
    { thumbnail: `/img/movie${movieIdNum}/thumb1.jpg`, url: `/img/movie${movieIdNum}/img1.jpg` },
    { thumbnail: `/img/movie${movieIdNum}/thumb2.jpg`, url: `/img/movie${movieIdNum}/img2.jpg` },
  ],
});

HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
HTMLMediaElement.prototype.load = jest.fn();


describe('MoviePage Component', () => {
  let mockMovieData;
  const movieId = 'movieId1';
  let audioIdProp;

  beforeEach(() => {
    mockRouterPush.mockClear();
    mockRouterReplace.mockClear();
    mockAudioPlayer.mockClear();
    HTMLMediaElement.prototype.play.mockClear();
    HTMLMediaElement.prototype.load.mockClear();

    mockMovieData = createMockMovieData(1);
    audioIdProp = '1'; // Initial audioId from URL, component normalizes this via selectedAudio
    mockRouterQuery = { params: [movieId, audioIdProp] }; // Set initial query for the test
  });

  test('Test 1 (Renders Correctly with Initial Props)', async () => {
    render(<MoviePage movie={mockMovieData} movieId={movieId} audioId={audioIdProp} />);

    // Wait for initial effects (router.replace and audio player src update)
    await waitFor(() => {
      // Check that router.replace was called to normalize the URL from '1' to actual audio ID
      expect(mockRouterReplace).toHaveBeenCalledWith(
        `/movie/${movieId}/${mockMovieData.audio[0].id}`,
        undefined,
        { shallow: true }
      );
    });
    await waitFor(() => {
        const lastCallArgs = mockAudioPlayer.mock.calls[mockAudioPlayer.mock.calls.length - 1]?.[0];
        expect(lastCallArgs).toBeDefined();
        expect(lastCallArgs.src).toBe(`${process.env.NEXT_PUBLIC_INTERNAL_API_URL}/api/getAudio?path=${mockMovieData.audio[0].url}`);
        expect(lastCallArgs.autoPlayAfterSrcChange).toBe(false);
    });

    const titlePart = mockMovieData.title.replace(` (${mockMovieData.year})`, '').trim();
    expect(screen.getByText(titlePart)).toBeInTheDocument();
    expect(screen.getByText(`Rok: ${mockMovieData.year}`)).toBeInTheDocument();

    mockMovieData.desc.forEach(line => { expect(screen.getByText(line)).toBeInTheDocument(); });

    const mainImage = screen.getByAltText(mockMovieData.title);
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', `${process.env.NEXT_PUBLIC_INTERNAL_API_URL}/api/getImage?path=${mockMovieData.images[0].url}`);

    // Find images within the ImageList more robustly if getByAltText is flaky for them
    const imageList = mainImage.closest('.MuiGrid-root').nextElementSibling.querySelector('.MuiImageList-root');
    expect(imageList).toBeInTheDocument();
    const thumbnailImages = within(imageList).getAllByRole('img');
    expect(thumbnailImages.length).toBe(mockMovieData.images.length);

    mockMovieData.images.forEach((img, index) => {
      // Check src based on what component constructs for ImageList items
      expect(thumbnailImages[index].src).toContain(`${process.env.NEXT_PUBLIC_INTERNAL_API_URL}/api/getImage?path=${img.thumbnail}`);
      // Check alt if it's rendered (component uses img.url for alt)
      expect(thumbnailImages[index]).toHaveAttribute('alt', img.url);
    });


    mockMovieData.audio.forEach(clip => { expect(screen.getByText(clip.text)).toBeInTheDocument(); });
  });

  test('Test 2 (Image Selection)', async () => {
    const user = userEvent.setup();
    render(<MoviePage movie={mockMovieData} movieId={movieId} audioId={audioIdProp} />);
    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalled());

    // Click the second thumbnail image (more robust selection)
    const imageList = screen.getByAltText(mockMovieData.title) // Main image
                          .closest('.MuiGrid-root') // Parent Grid item of Main Image Card
                          .nextElementSibling // Sibling Grid item which contains ImageList
                          .querySelector('.MuiImageList-root');
    const thumbnailImages = within(imageList).getAllByRole('img');
    await user.click(thumbnailImages[1]); // Click the second image in the list

    const mainImage = screen.getByAltText(mockMovieData.title);
    expect(mainImage).toHaveAttribute('src', `${process.env.NEXT_PUBLIC_INTERNAL_API_URL}/api/getImage?path=${mockMovieData.images[1].url}`);
  });

  test('Test 3 (Audio Clip Selection and URL Update)', async () => {
    const user = userEvent.setup();
    render(<MoviePage movie={mockMovieData} movieId={movieId} audioId={audioIdProp} />);

    await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith(
            `/movie/${movieId}/${mockMovieData.audio[0].id}`,
            undefined,
            { shallow: true }
        );
    });
    mockAudioPlayer.mockClear();
    mockRouterReplace.mockClear();

    const secondAudioClipText = mockMovieData.audio[1].text;
    const secondAudioClipElement = screen.getByText(secondAudioClipText);
    await user.click(secondAudioClipElement);

    await waitFor(() => {
      const calls = mockAudioPlayer.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const lastCallArgs = calls[calls.length - 1][0];
      expect(lastCallArgs.src).toBe(`${process.env.NEXT_PUBLIC_INTERNAL_API_URL}/api/getAudio?path=${mockMovieData.audio[1].url}`);
      expect(lastCallArgs.autoPlayAfterSrcChange).toBe(true);
    });

    await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith(
            `/movie/${movieId}/${mockMovieData.audio[1].id}`,
            undefined,
            { shallow: true }
        );
    });
  });

  test('Test 4 (Audio Play Dialog Interaction - Basic)', async () => {
    const user = userEvent.setup();
    HTMLMediaElement.prototype.play.mockImplementationOnce(() => {
        return Promise.reject(new Error("Autoplay blocked"));
    });

    render(<MoviePage movie={mockMovieData} movieId={movieId} audioId={audioIdProp} />);

    await waitFor(() => {
        expect(screen.getByText("Prehrávanie ukážky začne až po kliknutí na tlačidlo")).toBeVisible();
    });

    const playDialogButton = screen.getByRole('button', { name: "Prehrať audio" });

    HTMLMediaElement.prototype.play.mockImplementation(() => Promise.resolve());
    await user.click(playDialogButton);

    await waitFor(() => {
      expect(screen.queryByText("Prehrávanie ukážky začne až po kliknutí na tlačidlo")).not.toBeInTheDocument();
    });
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  });

});
