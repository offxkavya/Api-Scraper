// backend/services/rapidApi.js

/**
 * Extracts the direct MP4 URL and thumbnail from an Instagram Reel URL using RapidAPI.
 * This is much more reliable than local extractors like yt-dlp which frequently break.
 */
async function getReelDirectUrl(reelUrl) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY is missing in backend .env file.");
  }

  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com'
    }
  };

  try {
    // We use a robust RapidAPI service for high reliability
    const targetUrl = `https://social-media-video-downloader.p.rapidapi.com/smvd/get/instagram?url=${encodeURIComponent(reelUrl)}`;
    
    const response = await fetch(targetUrl, options);
    const data = await response.json();

    if (!response.ok) {
      console.error("RapidAPI Error Response:", data);
      throw new Error(data.message || "Failed to extract video from Instagram via RapidAPI.");
    }

    // Standard response parsing for social-media-video-downloader
    // It usually returns an array of links or a direct link object
    let directMp4Url = null;
    let thumbnail = null;

    if (data.links && Array.isArray(data.links)) {
      // Find the first video link
      const videoLink = data.links.find(link => link.type === 'video') || data.links[0];
      directMp4Url = videoLink ? videoLink.link : null;
    } else if (data.url) {
      directMp4Url = data.url;
    }

    thumbnail = data.picture || data.thumbnail || null;

    if (!directMp4Url) {
      throw new Error("Could not find a valid video URL in the API response.");
    }

    return { directMp4Url, thumbnail };
  } catch (error) {
    console.error("RapidAPI Extraction Error:", error);
    // Fallback or rethrow with clear message
    throw new Error(`Extraction Error: ${error.message}`);
  }
}

module.exports = { getReelDirectUrl };
