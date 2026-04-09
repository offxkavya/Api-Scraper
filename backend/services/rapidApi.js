// backend/services/rapidApi.js
const { execFile } = require('child_process');
const path = require('path');
const util = require('util');
const { instagramGetUrl } = require('instagram-url-direct');
const axios = require('axios');
const execFileAsync = util.promisify(execFile);

/**
 * Extracts the direct MP4 URL and thumbnail from an Instagram Reel URL.
 * Multi-stage approach for maximum resilience against Instagram blocks.
 */
async function getReelDirectUrl(reelUrl) {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

  // Strip query parameters like ?utm_source...
  let cleanUrl = reelUrl;
  try {
    const parsed = new URL(reelUrl);
    cleanUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch (e) {
    cleanUrl = reelUrl.split('?')[0];
  }

  // --- STAGE 1: RAPIDAPI (Primary - Most Reliable) ---
  if (RAPIDAPI_KEY) {
    try {
      console.log(`Attempting Stage 1: RapidAPI with url: ${cleanUrl}...`);
      // Using requested instagram-downloader API
      const response = await axios.request({
        method: 'GET',
        url: 'https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/index',
        params: { url: cleanUrl },
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com'
        },
        timeout: 10000
      });

      // Adapt to potentially different response structure of the new API
      // (Many of these APIs return a 'media' array or 'video' direct url)
      const data = response.data;
      let directMp4Url = null;
      let thumbnail = null;

      if (data && data.media && typeof data.media === 'string') {
          directMp4Url = data.media;
          thumbnail = data.thumbnail || null;
      } else if (data && data[0] && data[0].media) {
          directMp4Url = data[0].media;
          thumbnail = data[0].thumbnail || null;
      } else if (data && data.links && data.links.length > 0) {
        const videoLink = data.links.find(l => l.type === 'video');
        if (videoLink) {
           directMp4Url = videoLink.link;
           thumbnail = data.picture || null;
        }
      } else if (data && data.videoUrl) { // Another common format
         directMp4Url = data.videoUrl;
         thumbnail = data.thumbnailUrl || null;
      } else if (data && data.url) { // fallback
         directMp4Url = data.url;
      }

      if (directMp4Url) {
          console.log("RapidAPI Success.");
          return { directMp4Url, thumbnail };
      } else {
         console.warn("RapidAPI response didn't contain an obvious video URL. Data:", data);
      }
    } catch (e) {
      console.warn("RapidAPI failed or not subscribed:", e.response?.data || e.message);
    }
  }

  // --- STAGE 2: INSTAGRAM-URL-DIRECT (Local Scraper) ---
  try {
    console.log("Attempting Stage 2: instagram-url-direct...");
    const result = await instagramGetUrl(cleanUrl);
    if (result && result.url_list && result.url_list.length > 0) {
      const directMp4Url = result.url_list[0];
      const thumbnail = result.media_details && result.media_details.length > 0 ? result.media_details[0].thumbnail : null;
      if (directMp4Url) {
        console.log("instagram-url-direct Success.");
        return { directMp4Url, thumbnail };
      }
    }
  } catch (e) {
    console.warn("instagram-url-direct failed:", e.message);
  }

  // --- STAGE 3: YT-DLP (Local Binary Fallback) ---
  try {
    console.log("Attempting Stage 3: yt-dlp binary...");
    const isLinux = process.platform === 'linux';
    const ytDlpPath = path.join(__dirname, '..', 'bin', isLinux ? 'yt-dlp_linux' : 'yt-dlp');
    
    const { stdout } = await execFileAsync(ytDlpPath, [
      '-j', 
      '--no-check-certificates',
      '--geo-bypass',
      '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      cleanUrl
    ]);
    
    const data = JSON.parse(stdout);
    let directMp4Url = null;
    
    if (data.formats && Array.isArray(data.formats)) {
      // Prioritize mp4 which has video stream
      const videoFormats = data.formats.filter(f => f.ext === 'mp4' && f.url);
      if (videoFormats.length > 0) {
        directMp4Url = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0].url;
      }
    }
    
    if (!directMp4Url && data.url) directMp4Url = data.url;

    const thumbnail = data.thumbnail || (data.thumbnails && data.thumbnails.length > 0 ? data.thumbnails[data.thumbnails.length - 1].url : null);
    
    if (directMp4Url) {
      console.log("yt-dlp Success.");
      return { directMp4Url, thumbnail };
    }
  } catch (e) {
    console.error("All extraction stages failed:", e.message);
    throw new Error("Failed to extract video URL from Instagram. Please ensure the URL is correct and public.");
  }

  throw new Error("Failed to extract video URL from Instagram. All methods exhausted.");
}

module.exports = { getReelDirectUrl };
