// backend/services/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager, FileState } = require("@google/generative-ai/server");
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a function with exponential backoff for rate limits.
 */
async function withRetry(fn, maxRetries = 3, initialDelay = 5000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRateLimit = error.message?.includes('429') ||
        error.status === 429 ||
        error.status === 503 ||
        error.message?.includes('Quota exceeded') ||
        error.message?.includes('503');

      if (isRateLimit && i < maxRetries - 1) {
        // Extract retry delay from error if present (Google API often includes it)
        let delay = initialDelay * Math.pow(2, i);
        if (error.message.includes('retryDelay')) {
          const match = error.message.match(/retryDelay":"?(\d+)/);
          if (match && match[1]) delay = parseInt(match[1]) * 1000 + 1000;
        }

        console.warn(`Gemini Rate Limit hit (Attempt ${i + 1}/${maxRetries}). Retrying in ${Math.round(delay / 1000)}s...`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function processReelVideo(directMp4Url) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  // Try to get a working model - prioritize 2.5-flash (verified available in 2026 env)
  const testModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  const modelName = testModels[0];
  const model = genAI.getGenerativeModel({ model: modelName });

  let tempFilePath = null;
  let fileUri = null;
  let fileId = null;

  try {
    // 1. Download the Reel to a temporary file
    console.log("Downloading video from:", directMp4Url.substring(0, 100) + "...");
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `reel-${Date.now()}.mp4`);
    
    const writer = fs.createWriteStream(tempFilePath);
    const response = await axios({
      url: directMp4Url,
      method: 'GET',
      responseType: 'stream',
      timeout: 60000, // 60 seconds total for download
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
        'Accept': 'video/webm,video/any,video/*;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    console.log("Download complete:", tempFilePath);

    // 2. Upload to Google AI File API
    console.log("Uploading to Gemini File API...");
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType: "video/mp4",
      displayName: "Instagram Reel",
    });
    fileUri = uploadResult.file.uri;
    fileId = uploadResult.file.name;
    console.log(`Uploaded file: ${fileId}, URI: ${fileUri}`);

    // 3. Wait for the file to be processed
    console.log("Waiting for video processing...");
    let file = await fileManager.getFile(fileId);
    let attempts = 0;
    while (file.state === FileState.PROCESSING && attempts < 20) {
      process.stdout.write(".");
      await sleep(3000);
      file = await fileManager.getFile(fileId);
      attempts++;
    }

    if (file.state !== FileState.ACTIVE) {
      throw new Error(`Video processing failed. State: ${file.state}`);
    }
    console.log("\nVideo is active.");

    // 4. Generate Content
    const noteData = await withRetry(async () => {
      const result = await model.generateContent([
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri
          }
        },
        {
          text: `You are a knowledge extraction assistant. Given this Instagram Reel video, do the following:
            1. Transcribe everything spoken in the video fully and accurately.
            2. Assign it to ONE domain from: [Export, Business, AI & Tech, Marketing, Finance, Lifestyle, Other]
            3. Generate a structured note with these exact fields:
               - title: clear descriptive title
               - oneLiner: one catchy sentence summarizing the reel
               - summary: 2-3 line summary
               - keyTakeaways: array of 3-5 bullet point insights
               - actionItems: array of 2-3 action steps
               - domain: assigned domain
               - transcript: full word-for-word transcription
            Return ONLY a valid JSON object with these fields. No extra text. No markdown. Just raw JSON.`
        }
      ]);

      let responseText = result.response.text();
      // Strip any markdown backticks before parsing JSON
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(responseText);
    });

    return noteData;

  } catch (error) {
    console.error("Gemini processing error:", error);
    if (error.response?.data) {
        console.error("Gemini API detailed error:", JSON.stringify(error.response.data));
    }
    throw error;
  } finally {
    // Cleanup temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log("Temporary file deleted.");
      } catch (e) {
        console.warn("Failed to delete temp file:", e.message);
      }
    }
    // Note: We don't delete from File API here to allow for short-term reuse or if processing is needed, 
    // but in a production app you might want to call fileManager.deleteFile(fileId).
    // Google deletes these after 48 hours anyway.
  }
}

module.exports = { processReelVideo };
