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
  const cleanUrl = reelUrl.split('?')[0];

  // --- STAGE 1: RAPIDAPI (Primary - Most Reliable) ---
  if (RAPIDAPI_KEY) {
    const apis = [
      {
        host: 'instagram-scraper-api2.p.rapidapi.com', // Premium Instagram Scraper
        path: '/v1/post_info',
        param: 'shortcode_or_url'
      },
      {
        host: 'instagram47.p.rapidapi.com', // RocketAPI
        path: '/post_info',
        param: 'shortcode_or_url'
      },
      {
        host: 'social-media-video-downloader.p.rapidapi.com',
        path: '/smvd/get/instagram',
        param: 'url'
      },
      {
        host: 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com',
        path: '/',
        param: 'url'
      },
      {
        host: 'instagram-reels-downloader-api.p.rapidapi.com',
        path: '/download',
        param: 'url'
      }
    ];

    for (const api of apis) {
      const { host, path: apiPath, param } = api;

      try {
        console.log(`[Extraction] Attempting Stage 1: RapidAPI (${host})...`);
        
        // Construct URL carefully. If apiPath is '/', we don't want '//?url'
        const baseUrl = `https://${host}${apiPath}`;
        const fetchUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${param}=${encodeURIComponent(cleanUrl)}`;

        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': host,
            'x-rapidapi-key': RAPIDAPI_KEY
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 403) {
            console.warn(`[Extraction] ${host} REQUIRES SUBSCRIPTION (403).`);
          } else {
            console.warn(`[Extraction] ${host} returned ${response.status}: ${errorText.substring(0, 50)}...`);
          }
          continue; 
        }

        const data = await response.json();
        console.log(`[Extraction] ${host} returned data. Parsing...`);
        
        let directMp4Url = null;
        let thumbnail = null;

        if (data) {
          // Comprehensive parsing logic for various API responses
          const source = data.data || data.result || data.item || (Array.isArray(data) ? data[0] : data);
          
          if (Array.isArray(source)) {
            const item = source[0];
            directMp4Url = item?.media || item?.url || item?.video || item?.download_link;
            thumbnail = item?.thumbnail || item?.thumb;
          } else {
            directMp4Url = source?.media || source?.url || source?.video || source?.download_link || source?.video_url || source?.links?.[0]?.url;
            thumbnail = source?.thumbnail || source?.thumb || source?.thumbnail_url;
          }

          // Special case for medias array
          if (!directMp4Url && source.medias && Array.isArray(source.medias)) {
            const video = source.medias.find(m => m.type === 'video') || source.medias[0];
            directMp4Url = video.url;
            thumbnail = source.thumbnail || video.thumbnail;
          }
        }

        if (directMp4Url && (directMp4Url.includes('fbcdn.net') || directMp4Url.includes('cdninstagram.com') || directMp4Url.includes('.mp4'))) {
            console.log(`[Extraction] SUCCESS with ${host}.`);
            return { directMp4Url, thumbnail };
        } else {
          console.warn(`[Extraction] ${host} returned data but no valid direct MP4 URL found.`);
        }
      } catch (e) {
        console.warn(`[Extraction] ${host} failed:`, e.message);
      }
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
    
    // Add /usr/local/bin to PATH for yt-dlp dependencies if needed
    const env = { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/usr/bin:/bin` };

    const { stdout } = await execFileAsync(ytDlpPath, [
      '-j', 
      '--no-check-certificates',
      '--geo-bypass',
      '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      cleanUrl
    ], { env });
    
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
