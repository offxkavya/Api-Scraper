// backend/test-full-flow.js
require('dotenv').config();
const { getReelDirectUrl } = require('./services/rapidApi');
const { processReelVideo } = require('./services/gemini');

async function test() {
  const testUrl = "https://www.instagram.com/reel/DKy8VdoC3sf/";
  console.log("--- Starting Full Flow Test ---");
  console.log("URL:", testUrl);

  try {
    console.log("\n[Step 1] Extracting Direct URL...");
    const { directMp4Url, thumbnail } = await getReelDirectUrl(testUrl);
    console.log("Direct MP4 URL found:", directMp4Url ? "YES" : "NO");
    if (!directMp4Url) {
      console.error("Extraction failed.");
      return;
    }

    console.log("\n[Step 2] Processing with Gemini (this will take a while)...");
    const noteData = await processReelVideo(directMp4Url);
    
    console.log("\n--- SUCCESS ---");
    console.log("Title:", noteData.title);
    console.log("OneLiner:", noteData.oneLiner);
    console.log("Domain:", noteData.domain);
    console.log("Transcript length:", noteData.transcript?.length || 0);
    console.log("-----------------");

  } catch (error) {
    console.error("\n--- FAILED ---");
    console.error(error.message);
  }
}

test();
