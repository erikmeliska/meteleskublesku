import handler from '../searchYoutube';
import ytsr from 'ytsr';
import { createMocks } from 'node-mocks-http';

// Mock the ytsr library
jest.mock('ytsr');

describe('/api/searchYoutube', () => {
  const searchQuery = 'test query';
  const mockYtsrOptions = { pages: 1, hl: 'sk' };

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    ytsr.mockClear();
  });

  test('Test 1 (Successful Search): should return search results from ytsr', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { query: searchQuery },
    });

    const mockSearchResults = {
      items: [
        { type: 'video', title: 'Test Video 1', id: 'video1' },
        { type: 'video', title: 'Test Video 2', id: 'video2' },
      ],
      // Add other properties ytsr might return if they are used or expected
    };
    ytsr.mockResolvedValue(mockSearchResults);

    await handler(req, res);

    expect(ytsr).toHaveBeenCalledWith(searchQuery, mockYtsrOptions);
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ searchResults: mockSearchResults });
  });

  test('Test 2 (Search Error - ytsr throws an error): should crash (current behavior)', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { query: searchQuery },
    });

    const searchError = new Error('YouTube search failed');
    ytsr.mockRejectedValue(searchError);

    // Since the handler is async and doesn't catch errors from ytsr,
    // awaiting it should result in the promise rejecting with the same error.
    await expect(handler(req, res)).rejects.toThrow(searchError);

    expect(ytsr).toHaveBeenCalledWith(searchQuery, mockYtsrOptions);
    // Optionally, verify that no response was sent or status code wasn't success,
    // though the primary check is the thrown error.
    expect(res._isEndCalled()).toBe(false); // Handler crashes before sending response
  });
});
