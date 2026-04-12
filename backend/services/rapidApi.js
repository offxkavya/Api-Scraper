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
    // We try two different popular RapidAPI hosts to increase success rate
    const hosts = [
      'instagram-reels-downloader-api.p.rapidapi.com',
      'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com'
    ];

    for (const host of hosts) {
      try {
        console.log(`Attempting Stage 1: RapidAPI with host ${host}...`);
        
        const response = await fetch(
          `https://${host}/download?url=${encodeURIComponent(cleanUrl)}`,
          {
            method: 'GET',
            headers: {
              'x-rapidapi-host': host,
              'x-rapidapi-key': RAPIDAPI_KEY
            }
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`RapidAPI Host ${host} returned ${response.status}: ${errorText.substring(0, 100)}`);
          continue; // Try next host
        }

        const data = await response.json();
        console.log(`RapidAPI (${host}) response:`, JSON.stringify(data).substring(0, 200) + "...");

        let directMp4Url = null;
        let thumbnail = null;

        // Adapt to various response structures
        if (data) {
          // Check for .data nested structure first (very common)
          const source = data.data || data;
          
          let candidateUrl = null;
          let candidateThumb = null;

          // Structure 1: { media: "...", thumbnail: "..." }
          if (typeof source.media === 'string') {
            candidateUrl = source.media;
            candidateThumb = source.thumbnail;
          } 
          // Structure 2: { url: "..." }
          else if (source.url) {
            candidateUrl = source.url;
            candidateThumb = source.thumbnail || source.thumb;
          }
          // Structure 3: Arrays
          else if (Array.isArray(source.media) && source.media.length > 0) {
            candidateUrl = typeof source.media[0] === 'string' ? source.media[0] : source.media[0].url;
            candidateThumb = source.media[0].thumbnail;
          }
          // Structure 4: Nested objects
          else if (source.main_media) {
            candidateUrl = source.main_media;
          }
          else if (source.result && Array.isArray(source.result) && source.result.length > 0) {
            candidateUrl = source.result[0].url || source.result[0].video;
          }

          // VALIDATE: Ensure it's not just the original URL and looks like a CDN link
          if (candidateUrl && 
              candidateUrl.includes('fbcdn.net') || 
              candidateUrl.includes('.mp4') || 
              candidateUrl.includes('video') ||
              !candidateUrl.includes('instagram.com/reel/')) {
            directMp4Url = candidateUrl;
            thumbnail = candidateThumb;
          } else {
            console.warn(`RapidAPI Host ${host} returned an invalid/original URL: ${candidateUrl}`);
          }
        }

        if (directMp4Url) {
            console.log(`RapidAPI Success with host ${host}.`);
            return { directMp4Url, thumbnail };
        }
      } catch (e) {
        console.warn(`RapidAPI Host ${host} failed:`, e.message);
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
