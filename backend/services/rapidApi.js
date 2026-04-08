// backend/services/rapidApi.js
const { execFile } = require('child_process');
const path = require('path');
const util = require('util');
const { instagramGetUrl } = require('instagram-url-direct');
const execFileAsync = util.promisify(execFile);

/**
 * Extracts the direct MP4 URL and thumbnail from an Instagram Reel URL.
 * It primarily uses the 'instagram-url-direct' package for reliability,
 * and falls back to a local yt-dlp extractor if needed.
 */
async function getReelDirectUrl(reelUrl) {
  // Try using the instagram-url-direct package first (most reliable for Instagram)
  try {
    const result = await instagramGetUrl(reelUrl);
    
    if (result && result.url_list && result.url_list.length > 0) {
      const directMp4Url = result.url_list[0];
      // Get thumbnail from media_details if available
      const thumbnail = result.media_details && result.media_details.length > 0 ? result.media_details[0].thumbnail : null;
      
      if (directMp4Url) {
        console.log("Extraction successful using instagram-url-direct");
        return { directMp4Url, thumbnail };
      }
    }
  } catch (libError) {
    console.warn("instagram-url-direct failed, falling back to local yt-dlp:", libError.message);
  }

  // Fallback to local yt-dlp
  try {
    const isLinux = process.platform === 'linux';
    const ytDlpPath = path.join(__dirname, '..', 'bin', isLinux ? 'yt-dlp_linux' : 'yt-dlp');
    
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
      // Prioritize mp4 which has video stream. If no combined format, pick the first mp4 with a URL.
      const videoFormats = data.formats.filter(f => f.ext === 'mp4' && f.url);
      if (videoFormats.length > 0) {
        // Sort by height to get best quality
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
