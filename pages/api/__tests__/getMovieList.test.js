import handler from '../getMovieList';
import axios from 'axios';
import fs from 'fs';
import { createMocks } from 'node-mocks-http';

jest.mock('axios');
jest.mock('fs');

// Updated mock for iconv-lite
jest.mock('iconv-lite', () => ({
  decode: jest.fn((data, encoding) => {
    // The actual handler expects to decode from 'iso-8859-2'.
    // The mock parser downstream will get this string.
    // This simplified mock just turns the buffer into a string, assuming the input 'data' is a Buffer.
    // If data is already a string (e.g. from a previous mock), it might behave unexpectedly.
    // Ensure axios mock returns a buffer for 'binary' encoding.
    if (Buffer.isBuffer(data)) {
      return data.toString('utf-8'); // Or any other default encoding parser can handle
    }
    return data; // If not a buffer, return as is
  }),
}));

jest.mock('node-html-parser', () => ({
  parse: jest.fn(html => ({
    querySelectorAll: jest.fn().mockReturnValue([]),
  })),
}));


describe('/api/getMovieList', () => {
  const mockApiMovieData = [
    { id: '1', title: 'Movie 1 Parsed', image: '/img1.jpg', desc: ['Desc 1'] },
    { id: '2', title: 'Movie 2 Parsed', image: '/img2.jpg', desc: ['Desc 2'] },
  ];
  const cacheFilePath = './.cache/movies.json';
  const expectedApiUrl = 'http://fake-old-url.com?tab=movies';

  beforeEach(() => {
    axios.get.mockReset();
    fs.existsSync.mockReset();
    fs.readFileSync.mockReset();
    fs.writeFileSync.mockReset();
    
    // Clear mocks for iconv-lite and node-html-parser
    require('iconv-lite').decode.mockClear();
    const parseMock = require('node-html-parser').parse;
    parseMock.mockClear();
    if (parseMock().querySelectorAll) {
        parseMock().querySelectorAll.mockClear();
    }
    
    process.env.NEXT_PUBLIC_OLD_URL = 'http://fake-old-url.com';

    const mockRoot = {
      querySelectorAll: jest.fn().mockImplementation((selector) => {
        if (selector === 'table table table tr td.full-width div') {
          return mockApiMovieData.map(movie => ({
            querySelector: jest.fn(qSelector => {
              if (qSelector === 'h2 a') return { getAttribute: jest.fn(attr => attr === 'href' ? `./?movie=${movie.id}&otherstuff` : null) };
              if (qSelector === 'h2') return { text: movie.title, nextSibling: { parentNode: { childNodes: [{text: ''}, {text: ''}, ...movie.desc.map(d => ({text: d}))] } } };
              return null;
            }),
            parentNode: { parentNode: { querySelector: jest.fn(qSelector => {
                if (qSelector === 'td.middle img') return { getAttribute: jest.fn(attr => attr === 'src' ? movie.image.replace('/', '/th') : null) };
                return null;
            })}}
          }));
        }
        return [];
      })
    };
    require('node-html-parser').parse.mockReturnValue(mockRoot);
  });

  test('Test 1 (Cache Miss): should fetch from API, parse, save to cache, and return movie data', async () => {
    const { req, res } = createMocks({ method: 'GET' });

    fs.existsSync.mockReturnValue(false);
    const mockHtmlDataString = "<html><body>Mock HTML containing movie data</body></html>";
    // Ensure axios.get resolves with a Buffer for responseEncoding: 'binary'
    axios.get.mockResolvedValue({ data: Buffer.from(mockHtmlDataString) });

    await handler(req, res);

    expect(fs.existsSync).toHaveBeenCalledWith(cacheFilePath);
    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl, { responseEncoding: 'binary' });
    // Check that iconv-lite.decode was called with the buffer and the correct encoding
    expect(require('iconv-lite').decode).toHaveBeenCalledWith(Buffer.from(mockHtmlDataString), 'iso-8859-2');
    // Check that node-html-parser.parse was called with the (mocked) decoded string
    expect(require('node-html-parser').parse).toHaveBeenCalledWith(mockHtmlDataString); // Our mock decode now returns utf-8 version of this
    expect(require('node-html-parser').parse().querySelectorAll).toHaveBeenCalledWith('table table table tr td.full-width div');
    expect(fs.writeFileSync).toHaveBeenCalledWith(cacheFilePath, JSON.stringify(mockApiMovieData));
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ movies: mockApiMovieData });
  });

  test('Test 2 (Cache Hit): should load from cache and return movie data', async () => {
    const { req, res } = createMocks({ method: 'GET' });

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockApiMovieData));

    await handler(req, res);

    expect(fs.existsSync).toHaveBeenCalledWith(cacheFilePath);
    expect(fs.readFileSync).toHaveBeenCalledWith(cacheFilePath, 'utf8');
    expect(axios.get).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ movies: mockApiMovieData });
  });

  test('Test 3 (API Error): should attempt fetch, fail, and handler should crash', async () => {
    const { req, res } = createMocks({ method: 'GET' });

    fs.existsSync.mockReturnValue(false);
    axios.get.mockRejectedValue(new Error('API Network Error'));

    await expect(handler(req, res)).rejects.toThrow('API Network Error');

    expect(fs.existsSync).toHaveBeenCalledWith(cacheFilePath);
    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl, { responseEncoding: 'binary' });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test('Test 4 (Cache Read Error, then API Success): handler should crash on read error', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => { throw new Error('Cache Read Error'); });
    
    const mockHtmlDataString = "<html><body>Mock HTML for recovery</body></html>";
    axios.get.mockResolvedValue({ data: Buffer.from(mockHtmlDataString) });

    await expect(handler(req, res)).rejects.toThrow('Cache Read Error');

    expect(fs.existsSync).toHaveBeenCalledWith(cacheFilePath);
    expect(fs.readFileSync).toHaveBeenCalledWith(cacheFilePath, 'utf8');
    expect(axios.get).not.toHaveBeenCalled(); // Should not be called if readFileSync crashes
  });

  test('Test 5 (Cache Read Error and API Error): handler should crash on read error', async () => {
    const { req, res } = createMocks({ method: 'GET' });

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => { throw new Error('Cache Read Error'); });
    axios.get.mockRejectedValue(new Error('API Network Error'));

    await expect(handler(req, res)).rejects.toThrow('Cache Read Error');

    expect(fs.existsSync).toHaveBeenCalledWith(cacheFilePath);
    expect(fs.readFileSync).toHaveBeenCalledWith(cacheFilePath, 'utf8');
    expect(axios.get).not.toHaveBeenCalled();
  });
});
