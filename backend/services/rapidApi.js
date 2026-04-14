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
    // We try multiple RapidAPI hosts to increase success rate
    // Each host can have a different endpoint path
    const apis = [
      {
        host: 'instagram-reels-downloader-api.p.rapidapi.com',
        path: '/download'
      },
      {
        host: 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com',
        path: '/'
      },
      {
        host: 'instagram-looter2.p.rapidapi.com',
        path: '/reels' 
      },
      {
        host: 'social-media-video-downloader.p.rapidapi.com',
        path: '/smvd/get/instagram'
      },
      {
        host: 'instagram-downloader-scraper-reels-igtv-posts-stories.p.rapidapi.com',
        path: '/scraper'
      }
    ];

    for (const api of apis) {
      const host = api.host;
      const apiPath = api.path;

      try {
        console.log(`Attempting Stage 1: RapidAPI with host ${host}...`);
        
        const response = await fetch(
          `https://${host}${apiPath}${apiPath === '/' ? '' : ''}?url=${encodeURIComponent(cleanUrl)}`,
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
          continue; 
        }

        const data = await response.json();
        
        let directMp4Url = null;
        let thumbnail = null;

        if (data) {
          // Check for .data nested structure or .result
          const source = data.data || data.result || data;
          
          let candidateUrl = null;
          let candidateThumb = null;

          // Structure 1: Array of items
          if (Array.isArray(source) && source.length > 0) {
            const item = source[0];
            candidateUrl = item.media || item.url || item.video || item.download_url || item.video_url;
            candidateThumb = item.thumb || item.thumbnail || item.thumbnail_url;
          }
          // Structure 2: medias array
          else if (Array.isArray(source.medias) && source.medias.length > 0) {
            const videoMedia = source.medias.find(m => m.type === 'video' || m.extension === 'mp4' || (m.url && m.url.includes('.mp4'))) || source.medias[0];
            candidateUrl = videoMedia.url;
            candidateThumb = source.thumbnail || source.thumb || videoMedia.thumbnail;
          }
          // Structure 3: direct fields
          else {
            candidateUrl = source.media || source.url || source.video || source.download_link || source.video_url || source.links?.[0]?.url;
            candidateThumb = source.thumbnail || source.thumb || source.thumbnail_url;
          }

          // Case for some APIs that return a list of links
          if (!candidateUrl && Array.isArray(source.links) && source.links.length > 0) {
              candidateUrl = source.links[0].url || source.links[0].link;
          }

          if (candidateUrl) {
            const isCdn = candidateUrl.includes('fbcdn.net') || 
                          candidateUrl.includes('cdninstagram.com') ||
                          candidateUrl.includes('.mp4') || 
                          candidateUrl.includes('video');
            
            const isOriginal = candidateUrl.includes('instagram.com/reel/') || 
                               candidateUrl.includes('instagram.com/p/');

            if (isCdn || !isOriginal) {
              directMp4Url = candidateUrl;
              thumbnail = candidateThumb;
            } else {
              console.warn(`RapidAPI Host ${host} returned an invalid/original URL: ${candidateUrl}`);
            }
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
