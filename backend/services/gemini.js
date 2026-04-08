// backend/services/gemini.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

async function downloadVideo(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`unexpected response downloading video ${response.statusText}`);
  await pipeline(response.body, fs.createWriteStream(outputPath));
}

async function processReelVideo(directMp4Url) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  // 1. Download internally first
  const tmpFilePath = path.join(os.tmpdir(), `reel_${Date.now()}.mp4`);
  await downloadVideo(directMp4Url, tmpFilePath);

  let uploadedFile = null;
  try {
    // 2. Upload to Gemini
    const uploadResult = await fileManager.uploadFile(tmpFilePath, {
      mimeType: "video/mp4",
      displayName: "Instagram Reel",
    });

    uploadedFile = uploadResult.file;

    // 3. Wait for processing
    let fileState = await fileManager.getFile(uploadedFile.name);
    while (fileState.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      fileState = await fileManager.getFile(uploadedFile.name);
    }
    if (fileState.state === "FAILED") {
      throw new Error("Video processing failed within Gemini API.");
    }

    const promptText = `
You are a knowledge extraction assistant.
I am giving you a video URL from an Instagram Reel.
Do the following:
1. Transcribe everything spoken in the video fully and accurately.
2. Based on the content, assign it to EXACTLY ONE domain from this list:
   [Export, Business, AI & Tech, Marketing, Finance, Lifestyle, Other]
3. Generate a structured note with:
   - title: a clear descriptive title
   - oneLiner: one catchy sentence summarizing the reel
   - summary: 2-3 line summary of the full content
   - keyTakeaways: array of 3-5 bullet point insights
   - actionItems: array of 2-3 things the viewer should do
   - domain: the assigned domain from the list above
   - transcript: the full word-for-word transcription

Return ONLY a valid JSON object with these exact fields:
domain, title, oneLiner, summary, keyTakeaways, actionItems, transcript
No extra text. No markdown. Just the raw JSON.`;

    // 4. Generate
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadedFile.mimeType,
          fileUri: uploadedFile.uri
        }
      },
      { text: promptText },
    ]);

    let cleanText = result.response.text().trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }

    const parsedData = JSON.parse(cleanText.trim());
    return parsedData;

  } finally {
    // 5. Cleanup local temp file & Gemini remote file
    if (fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
    if (uploadedFile) {
      try {
         await fileManager.deleteFile(uploadedFile.name);
      } catch (e) {
         console.warn("Failed to delete remote file from Gemini API", e);
      }
    }
  }
}

module.exports = { processReelVideo };
