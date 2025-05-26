import handler from '../getAudio';
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

describe('/api/getAudio', () => {
  const audioPath = 'audio/effects/effect1.mp3'; // Path with a directory
  const audioPathSimple = 'sound.mp3'; // Path without a directory
  const cacheFilePath = `./.cache/${audioPath}`;
  const cacheDir = `./.cache/audio/effects`; // Adjusted for audioPath
  const expectedApiUrl = (p) => `http://fake-old-url.com/${p}`;
  const mockAudioContent = Buffer.from('fake MPEG data'); // Changed content description

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_OLD_URL = 'http://fake-old-url.com';
  });

  test('Test 1 (Cache Hit): should return audio from cache', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: audioPath } });
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(mockAudioContent);
    await handler(req, res);
    expect(fs.readFileSync).toHaveBeenCalledWith(cacheFilePath);
    expect(axios.get).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('audio/mpeg'); // Changed Content-Type
    expect(getResponseBuffer(res)).toEqual(mockAudioContent);
  });

  test('Test 2 (Cache Miss - Successful Fetch & Cache - with dir): should fetch, create dir, cache, and return audio', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: audioPath } });
    fs.existsSync.mockImplementation(p => {
        if (p === cacheFilePath) return false; 
        if (p === cacheDir) return false; 
        return true; 
    });

    let actualResolveAxios;
    const axiosGetPromise = new Promise(resolve => { actualResolveAxios = resolve; });
    axios.get.mockReturnValue(axiosGetPromise);

    handler(req, res);
    actualResolveAxios({ data: mockAudioContent });
    await axiosGetPromise.then(async () => { await new Promise(setImmediate); }).catch(() => {});

    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl(audioPath), { responseType: 'arraybuffer' });
    expect(fs.mkdirSync).toHaveBeenCalledWith(cacheDir, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(cacheFilePath, mockAudioContent);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('audio/mpeg'); // Changed Content-Type
    expect(getResponseBuffer(res)).toEqual(mockAudioContent);
  });
  
  test('Test 2.1 (Cache Miss - Successful Fetch & Cache - no dir): should fetch, cache (no mkdir), and return audio', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: audioPathSimple } });
    const simpleCacheFilePath = `./.cache/${audioPathSimple}`;
    fs.existsSync.mockImplementation(p => p !== simpleCacheFilePath); 

    let actualResolveAxios;
    const axiosGetPromise = new Promise(resolve => { actualResolveAxios = resolve; });
    axios.get.mockReturnValue(axiosGetPromise);

    handler(req, res);
    actualResolveAxios({ data: mockAudioContent });
    await axiosGetPromise.then(async () => { await new Promise(setImmediate); }).catch(() => {});

    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl(audioPathSimple), { responseType: 'arraybuffer' });
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledWith(simpleCacheFilePath, mockAudioContent);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('audio/mpeg'); // Changed Content-Type
    expect(getResponseBuffer(res)).toEqual(mockAudioContent);
  });


  test('Test 3 (Cache Miss - Fetch Fails): should return 404 if fetch fails', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: audioPath } });
    fs.existsSync.mockReturnValue(false);

    let actualRejectAxios;
    const axiosGetPromise = new Promise((resolve, reject) => { actualRejectAxios = reject; });
    axios.get.mockReturnValue(axiosGetPromise);
    
    handler(req, res);
    actualRejectAxios({ response: { status: 404 } }); 
    await axiosGetPromise.then(() => {}).catch(async () => { await new Promise(setImmediate); });

    expect(axios.get).toHaveBeenCalledWith(expectedApiUrl(audioPath), { responseType: 'arraybuffer' });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Audio not found' }); // Changed error message
  });

  test('Test 4 (File System Error - mkdirSync fails): should return 404 with "Audio not found" (current behavior)', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: audioPath } });
    fs.existsSync.mockImplementation(p => {
        if (p === cacheFilePath) return false;
        if (p === cacheDir) return false; 
        return false;
    });
    const mkdirError = new Error('EACCES: permission denied');
    fs.mkdirSync.mockImplementation(() => { throw mkdirError; });

    let actualResolveAxios;
    const axiosGetPromise = new Promise(resolve => { actualResolveAxios = resolve; });
    axios.get.mockReturnValue(axiosGetPromise);
    
    handler(req, res);
    actualResolveAxios({ data: mockAudioContent });
    
    await axiosGetPromise.then(async () => { 
        await new Promise(setImmediate); 
    }).catch(async (err) => { 
        await new Promise(setImmediate);
    });
    
    expect(fs.mkdirSync).toHaveBeenCalledWith(cacheDir, { recursive: true });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Audio not found' }); // Changed error message
  });

  test('Test 5 (File System Error - writeFileSync fails): should return 404 with "Audio not found" (current behavior)', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { path: audioPath } });
    fs.existsSync.mockImplementation(p => {
        if (p === cacheFilePath) return false; 
        if (p === cacheDir) return true;    
        return true;
    });
    const writeError = new Error('ENOSPC: no space left on device');
    fs.writeFileSync.mockImplementation(() => { throw writeError; });

    let actualResolveAxios;
    const axiosGetPromise = new Promise(resolve => { actualResolveAxios = resolve; });
    axios.get.mockReturnValue(axiosGetPromise);

    handler(req, res);
    actualResolveAxios({ data: mockAudioContent });

    await axiosGetPromise.then(async () => {
      await new Promise(setImmediate);
    }).catch(async () => {
      await new Promise(setImmediate);
    });

    expect(fs.writeFileSync).toHaveBeenCalledWith(cacheFilePath, mockAudioContent);
    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Audio not found' }); // Changed error message
  });
});
