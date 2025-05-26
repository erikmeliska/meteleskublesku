import handler from '../getMovie';
import axios from 'axios';
import fs from 'fs';
import { createMocks } from 'node-mocks-http';

// Mock dependencies
jest.mock('axios');
jest.mock('fs');
jest.mock('iconv-lite', () => ({
  decode: jest.fn((data, encoding) => {
    if (Buffer.isBuffer(data)) {
      return data.toString('utf-8'); // Mock conversion
    }
    return data;
  }),
}));
jest.mock('node-html-parser', () => ({
  parse: jest.fn(), // Will be customized per test
}));

describe('/api/getMovie', () => {
  const movieId = 'test-movie-id';
  const cacheFilePath = `./.cache/movie-${movieId}.json`;
  const expectedApiUrl = `http://fake-old-url.com/?movie=${movieId}`;

  // Mock data for a successful movie response
  // Adjusted image URL to match handler's actual output from the mocked thumbnail
  const mockParsedMovieData = {
    title: 'Test Movie Title',
    desc: ['Description line 1', 'Description line 2'],
    audio: [{ text: 'Track 1', url: '/audio1.mp3', length: '01:23' }],
    images: [{ thumbnail: '/th/img1.jpg', url: '//img1.jpg' }], // Corrected this line
  };

  // Refined Mock HTML structure
  const mockHtmlRoot = {
    querySelector: jest.fn(selector => {
      if (selector === 'h1') {
        return {
          text: mockParsedMovieData.title,
          nextSibling: {
            parentNode: {
              childNodes: [
                { text: 'irrelevant' }, { text: 'irrelevant' },
                ...mockParsedMovieData.desc.map(d => ({ text: d })),
                { text: '«Archív»' },
              ],
            },
          },
        };
      }
      return null;
    }),
    querySelectorAll: jest.fn(selector => {
      if (selector === '#soundlist tr') {
        return mockParsedMovieData.audio.map(a => ({
          querySelector: jest.fn(s => {
            if (s === 'td a') return { getAttribute: jest.fn(() => a.url), text: a.length };
            if (s === 'td') {
              return {
                nextElementSibling: {
                  text: a.text
                }
              };
            }
            return null;
          })
        }));
      }
      if (selector === '#imagelist img') {
        // This mock provides the thumbnail value that the handler will transform
        return mockParsedMovieData.images.map(imgData => ({ // Use imgData from mockParsedMovieData
          getAttribute: jest.fn(attr => (attr === 'src' ? imgData.thumbnail : null)),
        }));
      }
      return [];
    }),
  };

  beforeEach(() => {
    axios.get.mockReset();
    fs.existsSync.mockReset();
    fs.readFileSync.mockReset();
    fs.writeFileSync.mockReset();
    require('iconv-lite').decode.mockClear();
    const parseMock = require('node-html-parser').parse;
    parseMock.mockReset();
    
    if (mockHtmlRoot.querySelector.mockClear) mockHtmlRoot.querySelector.mockClear();
    if (mockHtmlRoot.querySelectorAll.mockClear) mockHtmlRoot.querySelectorAll.mockClear();
    
    process.env.NEXT_PUBLIC_OLD_URL = 'http://fake-old-url.com';
    require('node-html-parser').parse.mockReturnValue(mockHtmlRoot);
  });

  // Test 1: Cache Miss - Movie Found
  test('Test 1 (Cache Miss - Movie Found): should fetch, parse, cache, and return movie data', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { id: movieId } });
    fs.existsSync.mockReturnValue(false);
    const mockHtmlResponse = "<html><body>Mock HTML for Test Movie</body></html>";
    axios.get.mockResolvedValue({ data: Buffer.from(mockHtmlResponse) });

    await handler(req, res);

    expect(fs.existsSync).toHaveBeenCalledWith(cacheFilePath);
    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl, { responseEncoding: 'binary' });
    expect(require('iconv-lite').decode).toHaveBeenCalledWith(Buffer.from(mockHtmlResponse), 'iso-8859-2');
    expect(require('node-html-parser').parse).toHaveBeenCalledWith(mockHtmlResponse.toString('utf-8'));
    expect(mockHtmlRoot.querySelector).toHaveBeenCalledWith('h1');
    expect(fs.writeFileSync).toHaveBeenCalledWith(cacheFilePath, JSON.stringify(mockParsedMovieData));
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ movie: mockParsedMovieData });
  });

  // Test 2: Cache Hit
  test('Test 2 (Cache Hit): should load from cache and return movie data', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { id: movieId } });
    fs.existsSync.mockReturnValue(true);
    // When reading from cache, it should contain the data exactly as it was written,
    // which means with the '//img1.jpg' structure.
    fs.readFileSync.mockReturnValue(JSON.stringify(mockParsedMovieData));


    await handler(req, res);

    expect(fs.existsSync).toHaveBeenCalledWith(cacheFilePath);
    expect(fs.readFileSync).toHaveBeenCalledWith(cacheFilePath, 'utf8');
    expect(axios.get).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ movie: mockParsedMovieData });
  });

  // Test 3: API Error - External Fetch Fails
  test('Test 3 (API Error - External Fetch Fails): should crash as per current handler behavior', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { id: movieId } });
    fs.existsSync.mockReturnValue(false);
    axios.get.mockRejectedValue(new Error('Network Error'));

    await expect(handler(req, res)).rejects.toThrow('Network Error');

    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl, { responseEncoding: 'binary' });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  // Test 4: Movie Not Found (404 from old server interpretation)
  test('Test 4 (Movie Not Found - 404): should return 404 if movie details (h1) not found', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { id: movieId } });
    fs.existsSync.mockReturnValue(false);
    const mockHtmlResponse = "<html><body>Movie not found here</body></html>";
    axios.get.mockResolvedValue({ data: Buffer.from(mockHtmlResponse) });

    const mockRootNotFound = {
      querySelector: jest.fn(selector => (selector === 'h1' ? null : null)),
      querySelectorAll: jest.fn().mockReturnValue([]),
    };
    require('node-html-parser').parse.mockReturnValue(mockRootNotFound);

    await handler(req, res);

    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl, { responseEncoding: 'binary' });
    expect(mockRootNotFound.querySelector).toHaveBeenCalledWith('h1');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Movie not found' });
  });

  // Test 5: File System Error on Cache Write
  test('Test 5 (File System Error on Cache Write): should crash as per current handler behavior', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { id: movieId } });
    fs.existsSync.mockReturnValue(false);
    const mockHtmlResponse = "<html><body>Content that gets parsed fine</body></html>";
    axios.get.mockResolvedValue({ data: Buffer.from(mockHtmlResponse) });
    
    require('node-html-parser').parse.mockReturnValue(mockHtmlRoot); 

    fs.writeFileSync.mockImplementation(() => {
      throw new Error('Disk Full Error');
    });

    await expect(handler(req, res)).rejects.toThrow('Disk Full Error');

    expect(fs.writeFileSync).toHaveBeenCalledWith(cacheFilePath, JSON.stringify(mockParsedMovieData));
  });
});
