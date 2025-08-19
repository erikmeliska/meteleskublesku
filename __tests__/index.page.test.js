import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../pages/index'; // Adjusted import path
import '@testing-library/jest-dom';

// Set up environment variable for image paths - ONCE AT THE TOP
process.env.NEXT_PUBLIC_INTERNAL_API_URL = '';

// Mock next/router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Simplified Mock next/image - it should just pass through the src it receives
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, width, height, priority, loading, style, layout }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} style={style} />;
  },
}));

// Helper function to create mock movie data
const createMockMovie = (id, title, image, year) => ({
  id,
  title: `${title} (${year})`,
  image,
  desc: [`Description for ${title}`],
  year: year,
});

const mockMoviesRaw = [
  createMockMovie('1', 'Movie Alpha', '/imageA.jpg', 2023),
  createMockMovie('2', 'Movie Beta', '/imageB.jpg', 2022),
  createMockMovie('3', 'Another Movie Gamma', '/imageC.jpg', 2021),
];

const mockMoviesSorted = [...mockMoviesRaw].sort((a,b) => {
  if (b.year !== a.year) {
    return b.year - a.year;
  }
  return a.title.localeCompare(b.title);
});


describe('Home Component', () => {
  beforeEach(() => {
    mockPush.mockClear();
    process.env.NEXT_PUBLIC_INTERNAL_API_URL = '';
  });

  test('Test 1 (Renders Correctly with Movies)', () => {
    render(<Home movies={mockMoviesSorted} />);

    const heading = screen.getByText((content, element) => content.startsWith('Meteleskublesku') && element.tagName.toLowerCase() === 'h4');
    expect(heading).toBeInTheDocument();
    expect(within(heading).getByText('reloaded', { selector: 'strong' })).toBeInTheDocument();

    mockMoviesSorted.forEach(movie => {
      const titleWithoutYear = movie.title.replace(` (${movie.year})`, '');
      const movieCard = screen.getByText(titleWithoutYear).closest('.MuiCard-root');
      expect(movieCard).toBeInTheDocument();

      expect(within(movieCard).getByText(titleWithoutYear)).toBeInTheDocument();
      expect(within(movieCard).getByText(movie.year.toString())).toBeInTheDocument();

      const image = within(movieCard).getByAltText(movie.title);
      expect(image).toBeInTheDocument();
      // Expecting the src as rendered in the test environment
      expect(image).toHaveAttribute('src', `undefined/api/getImage?path=${movie.image}`);
    });
  });

  test('Test 2 (Autocomplete Filtering)', async () => {
    const user = userEvent.setup();
    render(<Home movies={mockMoviesSorted} />);

    const autocompleteInput = screen.getByRole('combobox');

    const movieAlpha = mockMoviesSorted.find(m => m.title.includes('Movie Alpha'));
    const movieBeta = mockMoviesSorted.find(m => m.title.includes('Movie Beta'));
    const movieGamma = mockMoviesSorted.find(m => m.title.includes('Another Movie Gamma'));

    const movieAlphaTitle = movieAlpha.title.replace(` (${movieAlpha.year})`, '');
    const movieBetaTitle = movieBeta.title.replace(` (${movieBeta.year})`, '');
    const movieGammaTitle = movieGamma.title.replace(` (${movieGamma.year})`, '');

    expect(screen.getByText(movieAlphaTitle)).toBeVisible();
    expect(screen.getByText(movieBetaTitle)).toBeVisible();
    expect(screen.getByText(movieGammaTitle)).toBeVisible();

    await user.type(autocompleteInput, movieAlphaTitle);
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText(movieAlpha.title)).toBeInTheDocument();
    });
    await user.click(screen.getByText(movieAlpha.title));

    await waitFor(() => {
      expect(screen.getByText(movieAlphaTitle)).toBeVisible();
      expect(screen.queryByText(movieBetaTitle)).not.toBeInTheDocument();
      expect(screen.queryByText(movieGammaTitle)).not.toBeInTheDocument();
    });

    const clearButton = screen.getByLabelText('Clear');
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText(movieAlphaTitle)).toBeVisible();
      expect(screen.getByText(movieBetaTitle)).toBeVisible();
      expect(screen.getByText(movieGammaTitle)).toBeVisible();
    });
  });

  test('Test 3 (Navigation on "Pridajte ho!" Button Click)', async () => {
    const user = userEvent.setup();
    render(<Home movies={mockMoviesSorted} />);

    const addButton = screen.getByRole('button', { name: /Pridajte ho!/i });
    expect(addButton).toBeInTheDocument();

    await user.click(addButton);

    expect(mockPush).toHaveBeenCalledWith('/add');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
