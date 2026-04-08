// backend/services/rapidApi.js
const { execFile } = require('child_process');
const path = require('path');
const util = require('util');
const execFileAsync = util.promisify(execFile);

/**
 * Extracts the direct MP4 URL and thumbnail from an Instagram Reel URL using a local yt-dlp extractor.
 * We use a local binary for robustness and to avoid third-party API costs/subscriptions.
 */
async function getReelDirectUrl(reelUrl) {
  try {
    const isLinux = process.platform === 'linux';
    const ytDlpPath = path.join(__dirname, '..', 'bin', isLinux ? 'yt-dlp_linux' : 'yt-dlp');
    
    // Using -j to get JSON metadata
    // --no-check-certificates and --geo-bypass improve reliability
    const { stdout } = await execFileAsync(ytDlpPath, [
      '-j', 
      '--no-check-certificates',
      '--geo-bypass',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      reelUrl
    ]);
    
    const data = JSON.parse(stdout);

    // Identify standard mp4 url from format list
    let directMp4Url = null;
    if (data.formats && Array.isArray(data.formats)) {
      // Prioritize mp4 which has video stream and is progressive
      const videoFormats = data.formats.filter(f => f.ext === 'mp4' && f.vcodec !== 'none' && f.acodec !== 'none');
      if (videoFormats.length > 0) {
        // Get the best quality progressive mp4
        directMp4Url = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0].url;
      }
    }
    
    if (!directMp4Url && data.url) {
      directMp4Url = data.url;
    }

    const thumbnail = data.thumbnail || (data.thumbnails && data.thumbnails.length > 0 ? data.thumbnails[data.thumbnails.length - 1].url : null);
    
    if (!directMp4Url) {
      throw new Error("Failed to find a direct video URL in the metadata.");
    }

    return { directMp4Url, thumbnail };
  } catch (error) {
    console.error("Local extraction error:", error);
    throw new Error("Failed to extract video URL from Instagram. Please ensure the URL is correct and public.");
  }
}

module.exports = { getReelDirectUrl };
