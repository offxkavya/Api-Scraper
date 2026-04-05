// backend/services/rapidApi.js
const { execFile } = require('child_process');
const path = require('path');
const util = require('util');
const execFileAsync = util.promisify(execFile);

async function getReelDirectUrl(reelUrl) {
  try {
    const ytDlpPath = path.join(__dirname, '..', 'bin', 'yt-dlp');
    // Using -j to get JSON metadata
    const { stdout } = await execFileAsync(ytDlpPath, ['-j', reelUrl]);
    const data = JSON.parse(stdout);

    // Identify standard mp4 url from format list
    let directMp4Url = null;
    if (data.formats && Array.isArray(data.formats)) {
      // Prioritize mp4 which has video stream
      const videoFormats = data.formats.filter(f => f.ext === 'mp4' && f.vcodec !== 'none');
      if (videoFormats.length > 0) {
        // Pop gets the highest quality normally since yt-dlp orders them
        directMp4Url = videoFormats.pop().url;
      }
    }
    if (!directMp4Url && data.url) {
      directMp4Url = data.url;
    }

    const thumbnail = data.thumbnail || null;
    return { directMp4Url, thumbnail };
  } catch (error) {
    console.error("yt-dlp extraction error:", error);
    throw new Error("Failed to extract video URL from Instagram using local extractor.");
  }
}

module.exports = { getReelDirectUrl };
