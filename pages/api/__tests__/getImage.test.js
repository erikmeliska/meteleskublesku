import handler from '../getImage';
import axios from 'axios';
import fs from 'fs';
import { createMocks } from 'node-mocks-http';

jest.mock('axios');
jest.mock('fs');

const getResponseBuffer = (res) => {
  const buffer = res._getBuffer();
  if (buffer && buffer.length > 0) return buffer;
  const data = res._getData();
  if (data instanceof Buffer) return data;
  if (typeof data === 'string') return Buffer.from(data);
  return Buffer.alloc(0);
};

describe('/api/getImage', () => {
  const imagePath = 'images/movies/movie1/poster.jpg'; // Path with a directory
  const imagePathSimple = 'image.jpg'; // Path without a directory
  const cacheFilePath = `./.cache/${imagePath}`;
  const cacheDir = `./.cache/images/movies/movie1`;
  const expectedApiUrl = (p) => `http://fake-old-url.com/${p}`;
  const mockImageContent = Buffer.from('fake JPEG data');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_OLD_URL = 'http://fake-old-url.com';
  });

  test('Test 1 (Cache Hit): should return image from cache', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: imagePath } });
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(mockImageContent);
    await handler(req, res);
    expect(fs.readFileSync).toHaveBeenCalledWith(cacheFilePath);
    expect(axios.get).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('image/jpeg');
    expect(getResponseBuffer(res)).toEqual(mockImageContent);
  });

  test('Test 2 (Cache Miss - Successful Fetch & Cache - with dir): should fetch, create dir, cache, and return image', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: imagePath } });
    // Mock: file not exist, then dir not exist, then dir exists (after creation)
    fs.existsSync.mockImplementation(p => {
        if (p === cacheFilePath) return false; // file check
        if (p === cacheDir) return false; // first dir check before mkdir
        return true; // subsequent checks (e.g. if handler re-checks dir)
    });

    let actualResolveAxios;
    const axiosGetPromise = new Promise(resolve => { actualResolveAxios = resolve; });
    axios.get.mockReturnValue(axiosGetPromise);

    handler(req, res);
    actualResolveAxios({ data: mockImageContent });
    await axiosGetPromise.then(async () => { await new Promise(setImmediate); }).catch(() => {});

    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl(imagePath), { responseType: 'arraybuffer' });
    expect(fs.mkdirSync).toHaveBeenCalledWith(cacheDir, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(cacheFilePath, mockImageContent);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('image/jpeg');
    expect(getResponseBuffer(res)).toEqual(mockImageContent);
  });

  test('Test 2.1 (Cache Miss - Successful Fetch & Cache - no dir): should fetch, cache (no mkdir), and return image', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: imagePathSimple } });
    const simpleCacheFilePath = `./.cache/${imagePathSimple}`;
    fs.existsSync.mockImplementation(p => p !== simpleCacheFilePath); // Only file check relevant

    let actualResolveAxios;
    const axiosGetPromise = new Promise(resolve => { actualResolveAxios = resolve; });
    axios.get.mockReturnValue(axiosGetPromise);

    handler(req, res);
    actualResolveAxios({ data: mockImageContent });
    await axiosGetPromise.then(async () => { await new Promise(setImmediate); }).catch(() => {});

    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl(imagePathSimple), { responseType: 'arraybuffer' });
    expect(fs.mkdirSync).not.toHaveBeenCalled(); // Crucial: no directory in path, so no mkdir
    expect(fs.writeFileSync).toHaveBeenCalledWith(simpleCacheFilePath, mockImageContent);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('image/jpeg');
    expect(getResponseBuffer(res)).toEqual(mockImageContent);
  });


  test('Test 3 (Cache Miss - Fetch Fails): should return 404 if fetch fails', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: imagePath } });
    fs.existsSync.mockReturnValue(false);

    let actualRejectAxios;
    const axiosGetPromise = new Promise((resolve, reject) => { actualRejectAxios = reject; });
    axios.get.mockReturnValue(axiosGetPromise);

    handler(req, res);
    actualRejectAxios({ response: { status: 404 } }); // error object from axios
    await axiosGetPromise.then(() => {}).catch(async () => { await new Promise(setImmediate); });

    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl(imagePath), { responseType: 'arraybuffer' });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Image not found' });
  });

  test('Test 4 (File System Error - mkdirSync fails): should return 404 with "Image not found" (current behavior)', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: imagePath } });
    fs.existsSync.mockImplementation(p => {
        if (p === cacheFilePath) return false;
        if (p === cacheDir) return false; // dir does not exist, attempt mkdir
        return false;
    });
    const mkdirError = new Error('EACCES: permission denied');
    fs.mkdirSync.mockImplementation(() => { throw mkdirError; });

    let actualResolveAxios;
    const axiosGetPromise = new Promise(resolve => { actualResolveAxios = resolve; });
    axios.get.mockReturnValue(axiosGetPromise);

    handler(req, res);
    actualResolveAxios({ data: mockImageContent });

    // Wait for the handler's internal promise chain to settle
    // The mkdirError will be thrown, and we expect it to be caught by the handler's .catch block
    await axiosGetPromise.then(async () => {
        // This .then should not fully complete due to mkdirError
        await new Promise(setImmediate);
    }).catch(async (err) => { // This catch is for the test's await, not the handler's
        // If mkdirError is caught here, means it propagated out of handler's .catch
        // which is not what we are documenting for current behavior
        await new Promise(setImmediate);
    });

    expect(fs.mkdirSync).toHaveBeenCalledWith(cacheDir, { recursive: true });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    // Documenting current behavior: FS errors are caught by the axios catch block
    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Image not found' });
  });

  test('Test 5 (File System Error - writeFileSync fails): should return 404 with "Image not found" (current behavior)', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: imagePath } });
    fs.existsSync.mockImplementation(p => {
        if (p === cacheFilePath) return false; // File doesn't exist
        if (p === cacheDir) return true;    // Directory exists
        return true;
    });
    const writeError = new Error('ENOSPC: no space left on device');
    fs.writeFileSync.mockImplementation(() => { throw writeError; });

    let actualResolveAxios;
    const axiosGetPromise = new Promise(resolve => { actualResolveAxios = resolve; });
    axios.get.mockReturnValue(axiosGetPromise);

    handler(req, res);
    actualResolveAxios({ data: mockImageContent });

    await axiosGetPromise.then(async () => {
      await new Promise(setImmediate);
    }).catch(async () => {
      await new Promise(setImmediate);
    });

    expect(fs.writeFileSync).toHaveBeenCalledWith(cacheFilePath, mockImageContent);
    // Documenting current behavior
    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Image not found' });
  });
});
