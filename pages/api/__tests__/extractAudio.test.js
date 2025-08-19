import handler from '../extractAudio';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import { spawn } from 'child_process';
import { createMocks } from 'node-mocks-http';
import { PassThrough } from 'stream';

// Mock dependencies
jest.mock('ytdl-core');
jest.mock('fluent-ffmpeg');
jest.mock('fs');
jest.mock('child_process');

// Global constants for tests
const CACHE_DIR = ".cache/temp";
const MOCK_VIDEO_ID = "testVideoId";
const MOCK_AUDIO_ID = "testAudioExtractId";
const MOCK_URL = `https://www.youtube.com/watch?v=${MOCK_VIDEO_ID}`;

describe('/api/extractAudio', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ req: mockReq, res: mockRes } = createMocks({
      method: 'POST',
      body: {},
    }));

    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockReturnValue(undefined);

    const mockWriteStream = new PassThrough();
    // Emit 'finish' shortly after 'pipe' is called to simulate successful streaming.
    mockWriteStream.on('pipe', function() {
      const self = this;
      setImmediate(() => self.emit('finish'));
    });
    fs.createWriteStream.mockReturnValue(mockWriteStream);

    ytdl.getBasicInfo.mockResolvedValue({
      formats: [
        { qualityLabel: '480p', itag: '135' },
        { qualityLabel: '360p', itag: '18' },
      ],
    });
    const mockYtdlStream = new PassThrough();
    // Default mock for ytdl() (the download function)
    ytdl.mockReturnValue(mockYtdlStream);

    const mockFfmpegInstance = {
      seekInput: jest.fn().mockReturnThis(),
      duration: jest.fn().mockReturnThis(),
      save: jest.fn().mockImplementation((outputPath) => {
        return mockFfmpegInstance;
      }),
    };
    ffmpeg.mockReturnValue(mockFfmpegInstance);

    const mockSpawnProcess = {
        on: jest.fn((event, cb) => {
            if (event === 'exit' || event === 'close') {
                setImmediate(() => cb(0));
            }
            return mockSpawnProcess;
        }),
        stderr: { on: jest.fn() },
        stdout: { on: jest.fn() },
    };
    spawn.mockReturnValue(mockSpawnProcess);
  });

  test('Test 1 (Info Retrieval Only): should return video info', async () => {
    mockReq.body = { url: MOCK_URL };
    const mockVideoInfo = {
      title: 'Test Video',
      formats: [{ qualityLabel: '480p', itag: '135' }],
    };
    ytdl.getBasicInfo.mockResolvedValue(mockVideoInfo);

    await handler(mockReq, mockRes);

    expect(ytdl.getBasicInfo).toHaveBeenCalledWith(MOCK_URL);
    expect(ytdl.getBasicInfo).toHaveBeenCalledTimes(1); // Specifically check getBasicInfo
    expect(ytdl).not.toHaveBeenCalled(); // Ensure ytdl() default export (for download) was NOT called

    expect(mockRes._getStatusCode()).toBe(200);
    expect(JSON.parse(mockRes._getData())).toEqual({ info: mockVideoInfo });
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(ffmpeg).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  test('Test 2 (Full Extraction - Files Don\'t Exist): should download, extract, and spawn ffmpeg for images', async () => {
    mockReq.body = {
      url: MOCK_URL,
      start: '00:00:10',
      duration: '10',
      id: MOCK_AUDIO_ID,
    };

    fs.existsSync.mockReturnValue(false);

    await handler(mockReq, mockRes);

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));


    expect(ytdl.getBasicInfo).toHaveBeenCalledWith(MOCK_URL);
    expect(fs.mkdirSync).toHaveBeenCalledWith(`${CACHE_DIR}/${MOCK_VIDEO_ID}`, { recursive: true });

    // ytdl default export (for downloads) should be called twice
    expect(ytdl).toHaveBeenCalledTimes(2);
    expect(ytdl).toHaveBeenCalledWith(MOCK_URL, { filter: 'videoonly', quality: '135' });
    expect(fs.createWriteStream).toHaveBeenCalledWith(`${CACHE_DIR}/${MOCK_VIDEO_ID}/video.mp4`);

    expect(ytdl).toHaveBeenCalledWith(MOCK_URL, { filter: 'audioonly', quality: 'lowest' });
    expect(fs.createWriteStream).toHaveBeenCalledWith(`${CACHE_DIR}/${MOCK_VIDEO_ID}/audio.mp3`);

    expect(ffmpeg).toHaveBeenCalledWith(`${CACHE_DIR}/${MOCK_VIDEO_ID}/audio.mp3`);
    const ffmpegInstance = ffmpeg.mock.results[0].value;
    expect(ffmpegInstance.seekInput).toHaveBeenCalledWith('00:00:10');
    expect(ffmpegInstance.duration).toHaveBeenCalledWith('10');
    expect(ffmpegInstance.save).toHaveBeenCalledWith(`${CACHE_DIR}/${MOCK_VIDEO_ID}/audio-${MOCK_AUDIO_ID}.mp3`);

    expect(spawn).toHaveBeenCalledTimes(6);
    for (let i = 0; i <= 10; i += 2) {
        expect(spawn).toHaveBeenCalledWith("ffmpeg", [
            "-ss", 10 + i,
            "-i", `${CACHE_DIR}/${MOCK_VIDEO_ID}/video.mp4`,
            "-frames:v", "1",
            "-q:v", "2",
            expect.stringContaining(`${CACHE_DIR}/${MOCK_VIDEO_ID}/image-${MOCK_AUDIO_ID}-`),
        ]);
    }

    expect(mockRes._getStatusCode()).toBe(200);
    expect(JSON.parse(mockRes._getData())).toEqual({ name: "Youtube machine" });
  });

  test('Test 3 (Extraction - Video/Audio Files Exist): should skip downloads, still extract/spawn', async () => {
    mockReq.body = {
      url: MOCK_URL,
      start: '00:00:05',
      duration: '4',
      id: MOCK_AUDIO_ID,
    };

    fs.existsSync.mockImplementation(path => {
      if (path === `${CACHE_DIR}/${MOCK_VIDEO_ID}/video.mp4`) return true;
      if (path === `${CACHE_DIR}/${MOCK_VIDEO_ID}/audio.mp3`) return true;
      if (path === `${CACHE_DIR}/${MOCK_VIDEO_ID}`) return false;
      return false;
    });

    await handler(mockReq, mockRes);
    await new Promise(resolve => setImmediate(resolve));

    expect(ytdl.getBasicInfo).toHaveBeenCalledWith(MOCK_URL);
    expect(ytdl.getBasicInfo).toHaveBeenCalledTimes(1);
    expect(ytdl).not.toHaveBeenCalled(); // ytdl() for downloads should NOT be called

    expect(fs.mkdirSync).toHaveBeenCalledWith(`${CACHE_DIR}/${MOCK_VIDEO_ID}`, { recursive: true });
    expect(ffmpeg).toHaveBeenCalledWith(`${CACHE_DIR}/${MOCK_VIDEO_ID}/audio.mp3`);

    expect(spawn).toHaveBeenCalledTimes(3);
     for (let i = 0; i <= 4; i += 2) {
        expect(spawn).toHaveBeenCalledWith("ffmpeg", [
            "-ss", 5 + i,
            "-i", `${CACHE_DIR}/${MOCK_VIDEO_ID}/video.mp4`,
            "-frames:v", "1",
            "-q:v", "2",
            expect.stringContaining(`${CACHE_DIR}/${MOCK_VIDEO_ID}/image-${MOCK_AUDIO_ID}-`),
        ]);
    }

    expect(mockRes._getStatusCode()).toBe(200);
    expect(JSON.parse(mockRes._getData())).toEqual({ name: "Youtube machine" });
  });

  test('Test 4 (Error Handling - ytdl.getBasicInfo fails): should crash', async () => {
    mockReq.body = { url: MOCK_URL };
    const infoError = new Error('Failed to get video info');
    ytdl.getBasicInfo.mockRejectedValue(infoError);

    await expect(handler(mockReq, mockRes)).rejects.toThrow(infoError);

    expect(ytdl.getBasicInfo).toHaveBeenCalledWith(MOCK_URL);
    expect(mockRes._isEndCalled()).toBe(false);
  });

});
