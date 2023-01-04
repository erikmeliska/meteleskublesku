import ytdl from "ytdl-core";
import fs from "fs";
import { spawn } from "child_process";
import { promisify } from "util";
import ffmpeg from "fluent-ffmpeg";
import { format } from "path";

const writeFile = promisify(fs.writeFile);
const writeStreamPromise = (writeStream) => {
    return new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
    });
};

const timeToSeconds = (time) => {
    const [hours, minutes, seconds] = time.split(":");
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
};

// const url = "https://www.youtube.com/watch?v=Nyv1y2qmrKo";
const cacheDir = ".cache/temp";

export default async function handler(req, res) {
    const { url, start, duration, id: audioId } = req.body;
    console.log(url, start, duration, audioId);

    const videoId = url.split("v=")[1];
    const ampersandPosition = videoId.indexOf("&");
    const id = videoId.substring(
        0,
        ampersandPosition != -1 ? ampersandPosition : videoId.length
    );

    const info = await ytdl.getBasicInfo(url);
    let format = info.formats.find(item=>item.qualityLabel === "480p")
    if (!format) {
        format = info.formats.find(item=>item.qualityLabel === "360p" && !item.audioQuality)
    }

    if (info && !start && !duration) {
        res.status(200).json({ info: info });
        return    
    }

    if (!fs.existsSync(`${cacheDir}/${id}`)) {
        fs.mkdirSync(`${cacheDir}/${id}`, { recursive: true });
    }

    if (!fs.existsSync(`${cacheDir}/${id}/video.mp4`)) {
        // get video file for screenshots
        const video = await ytdl(url, { filter: "videoonly", quality: format.itag });
        const writeStream = fs.createWriteStream(`${cacheDir}/${id}/video.mp4`);
        video.pipe(writeStream);
        await writeStreamPromise(writeStream);
        console.log("video saved");
    }

    if (!fs.existsSync(`${cacheDir}/${id}/audio.mp3`)) {
        // get audio file
        const audio = await ytdl(url, {
            filter: "audioonly",
            quality: "lowest",
        });
        const writeStream = fs.createWriteStream(`${cacheDir}/${id}/audio.mp3`);
        audio.pipe(writeStream);
        await writeStreamPromise(writeStream);
        console.log("audio saved");
    }

    // save audio extract
    if (!fs.existsSync(`${cacheDir}/${id}/audio-${audioId}.mp3`)) {
        ffmpeg(`${cacheDir}/${id}/audio.mp3`)
            .seekInput(start)
            .duration(duration)
            .save(`${cacheDir}/${id}/audio-${audioId}.mp3`);
    }

    let counter = 1
    for (let i = 0; i <= duration; i += 2) {
        spawn("ffmpeg", [
            "-ss", timeToSeconds(start) + i,
            "-i", `${cacheDir}/${id}/video.mp4`,
            "-frames:v", "1",
            "-q:v", "2",
            `${cacheDir}/${id}/image-${audioId}-${counter++}.jpg`,
        ]);
    }

    res.status(200).json({ name: "Youtube machine" });
}
