// backend/services/gemini.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const Groq = require('groq-sdk');

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
                          error.message?.includes('Quota exceeded');
      
      if (isRateLimit && i < maxRetries - 1) {
        // Extract retry delay from error if present (Google API often includes it)
        let delay = initialDelay * Math.pow(2, i);
        if (error.message.includes('retryDelay')) {
            const match = error.message.match(/retryDelay":"?(\d+)/);
            if (match && match[1]) delay = parseInt(match[1]) * 1000 + 1000;
        }
        
        console.warn(`Gemini Rate Limit hit (Attempt ${i + 1}/${maxRetries}). Retrying in ${Math.round(delay/1000)}s...`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function downloadVideo(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`unexpected response downloading video ${response.statusText}`);
  await parseInt(response.headers.get('content-length') || '0') > 0; // check for content
  await pipeline(response.body, fs.createWriteStream(outputPath));
}

/**
 * Utility to clean and parse JSON from LLM responses
 */
function parseCleanJson(text) {
  try {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    return JSON.parse(cleanText.trim());
  } catch (e) {
    console.error("JSON Parse Error:", e, "Raw Text:", text);
    throw new Error("Failed to parse AI response into valid JSON.");
  }
}

async function processReelVideo(directMp4Url) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
  
  // 1. Download internally first
  const tmpFilePath = path.join(os.tmpdir(), `reel_${Date.now()}.mp4`);
  await downloadVideo(directMp4Url, tmpFilePath);

  let uploadedFile = null;
  try {
    // 2. Upload to Gemini (Transcription Engine)
    console.log("Uploading to Gemini...");
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

    // 4. Step 1: Extract basic raw content via Gemini (Standard Stable Model)
    console.log("Extracting raw content via Gemini...");
    
    const extractionPrompt = `
      Watch this video and provide:
      1. A full transcript of everything spoken.
      2. Key visual notes (any text on screen or important visual cues).
      
      Format your response as:
      TRANSCRIPT: ...
      VISUALS: ...
    `;

    let rawContent;
    try {
      // First attempt with 2.0 Flash
      console.log("Attempting with gemini-2.0-flash...");
      const model20 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const extractionResult = await withRetry(() => model20.generateContent([
        {
          fileData: {
            mimeType: uploadedFile.mimeType,
            fileUri: uploadedFile.uri
          }
        },
        { text: extractionPrompt },
      ]));
      rawContent = extractionResult.response.text();
    } catch (e) {
      const isRateLimit = e.message?.includes('429') || e.message?.includes('Quota exceeded');
      if (isRateLimit) {
        console.warn("Gemini 2.0 Flash quota exhausted, falling back to Gemini 1.5 Flash...");
        const model15 = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const extractionResult = await withRetry(() => model15.generateContent([
          {
            fileData: {
              mimeType: uploadedFile.mimeType,
              fileUri: uploadedFile.uri
            }
          },
          { text: extractionPrompt },
        ]));
        rawContent = extractionResult.response.text();
      } else {
        throw e;
      }
    }

    // 5. Step 2: Structure the Knowledge (Reasoning Phase)
    const reasoningPrompt = `
      You are a knowledge extraction assistant. 
      Based on the following content from an Instagram Reel, generate a beautifully structured note.
      
      CONTENT:
      ${rawContent}
      
      Generate EXACTLY one valid JSON object with these fields:
      - title: a clear descriptive title
      - oneLiner: one catchy sentence summarizing the reel
      - summary: 2-3 line summary of the full content
      - keyTakeaways: array of 3-5 bullet point insights
      - actionItems: array of 2-3 things the viewer should do
      - domain: assign to EXACTLY ONE [Export, Business, AI & Tech, Marketing, Finance, Lifestyle, Other]
      - transcript: the full word-for-word transcript provided in the content
      
      Return ONLY raw JSON. No extra text. No markdown backticks.
    `;

    let finalNote;
    if (groq) {
      try {
        console.log("Using Groq (Llama 3.3) for high-speed reasoning...");
        const groqRes = await groq.chat.completions.create({
          messages: [{ role: "user", content: reasoningPrompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
        });
        finalNote = parseCleanJson(groqRes.choices[0]?.message?.content || "{}");
      } catch (e) {
        console.warn("Groq failed, falling back to Gemini for reasoning:", e.message);
        const reasoningRes = await withRetry(() => model20.generateContent(reasoningPrompt));
        finalNote = parseCleanJson(reasoningRes.response.text());
      }
    } else {
      console.log("Using Gemini for all steps...");
      const model20 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const reasoningRes = await withRetry(() => model20.generateContent(reasoningPrompt));
      finalNote = parseCleanJson(reasoningRes.response.text());
    }

    return finalNote;

  } finally {
    // 6. Cleanup
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
