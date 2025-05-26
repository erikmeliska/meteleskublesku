import React from 'react';
import { render, screen, fireEvent, waitFor, within }
from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoviePage from '../[...params]'; 
import '@testing-library/jest-dom';

process.env.NEXT_PUBLIC_WEB_URL = '';
process.env.NEXT_PUBLIC_INTERNAL_API_URL = '';

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
let mockRouterQuery; 
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace, 
    query: mockRouterQuery, 
    pathname: `/movie/${mockRouterQuery?.params?.[0]}/${mockRouterQuery?.params?.[1]}`, 
    asPath: `/movie/${mockRouterQuery?.params?.[0]}/${mockRouterQuery?.params?.[1]}`,
    isReady: true, 
    events: { 
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Robust next/image mock, ensuring all relevant props are passed
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const { src, alt, width, height, style, className, layout, objectFit, priority, loading, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt || ''} width={width} height={height} style={style} className={className || ''} {...rest} />;
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

let mockPlayPromise;
HTMLMediaElement.prototype.play = jest.fn(() => {
    mockPlayPromise = Promise.resolve(); 
    return mockPlayPromise;
});
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
    audioIdProp = '1'; 
    mockRouterQuery = { params: [movieId, audioIdProp] };
  });

  test('Test 1 (Renders Correctly with Initial Props)', async () => {
    render(<MoviePage movie={mockMovieData} movieId={movieId} audioId={audioIdProp} />);
    
    await waitFor(() => {
        const lastCallArgs = mockAudioPlayer.mock.calls[mockAudioPlayer.mock.calls.length - 1]?.[0];
        expect(lastCallArgs).toBeDefined();
        expect(lastCallArgs.src).toBe(`${process.env.NEXT_PUBLIC_INTERNAL_API_URL}/api/getAudio?path=${mockMovieData.audio[0].url}`);
    });

    const titlePart = mockMovieData.title.replace(` (${mockMovieData.year})`, '').trim();
    expect(screen.getByText(titlePart)).toBeInTheDocument(); // exact: false removed for more precision if this is unique
    expect(screen.getByText(`Rok: ${mockMovieData.year}`)).toBeInTheDocument();
    
    mockMovieData.desc.forEach(line => {
      expect(screen.getByText(line)).toBeInTheDocument();
    });

    const mainImage = screen.getByAltText(mockMovieData.title); 
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', `/api/image${mockMovieData.images[0].url}`);

    mockMovieData.images.forEach(img => {
      const thumbImage = screen.getByAltText(img.url); 
      expect(thumbImage).toBeInTheDocument();
      expect(thumbImage.src).toContain(`/api/getImage?path=${img.thumbnail}`);
    });

    mockMovieData.audio.forEach(clip => {
      expect(screen.getByText(clip.text)).toBeInTheDocument();
    });

    const lastAudioPlayerCallArgs = mockAudioPlayer.mock.calls[mockAudioPlayer.mock.calls.length - 1][0];
    expect(lastAudioPlayerCallArgs.src).toBe(`${process.env.NEXT_PUBLIC_INTERNAL_API_URL}/api/getAudio?path=${mockMovieData.audio[0].url}`);
    expect(lastAudioPlayerCallArgs.autoPlayAfterSrcChange).toBe(false); 

    expect(mockRouterReplace).toHaveBeenCalledWith(
        `/movie/${movieId}/${mockMovieData.audio[0].id}`, 
        undefined, 
        { shallow: true }
    );
  });

  test('Test 2 (Image Selection)', async () => {
    const user = userEvent.setup();
    render(<MoviePage movie={mockMovieData} movieId={movieId} audioId={audioIdProp} />);
    await waitFor(() => expect(mockAudioPlayer).toHaveBeenCalled()); 

    const secondImageThumbnail = screen.getByAltText(mockMovieData.images[1].url);
    await user.click(secondImageThumbnail);

    const mainImage = screen.getByAltText(mockMovieData.title);
    expect(mainImage).toHaveAttribute('src', `/api/image${mockMovieData.images[1].url}`);
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

    const expectedNewUrl = `/movie/${movieId}/${mockMovieData.audio[1].id}`; 
    expect(mockRouterReplace).toHaveBeenCalledWith(expectedNewUrl, undefined, { shallow: true });
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
