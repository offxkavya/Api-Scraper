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
 * Now supports better error detection and longer retry windows.
 */
async function withRetry(fn, maxRetries = 5, initialDelay = 8000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMsg = error.message?.toLowerCase() || '';
      const isRateLimit = error.status === 429 || 
                        error.status === 503 ||
                        error.status === 400 && errorMsg.includes('busy') ||
                        errorMsg.includes('quota exceeded') ||
                        errorMsg.includes('rate limit') ||
                        errorMsg.includes('too many requests') ||
                        errorMsg.includes('503');

      if (isRateLimit && i < maxRetries - 1) {
        let delay = initialDelay * Math.pow(2, i);
        // Jitter to prevent thundering herd
        delay += Math.random() * 2000;
        
        if (errorMsg.includes('retrydelay')) {
          const match = error.message.match(/retryDelay":"?(\d+)/);
          if (match && match[1]) delay = parseInt(match[1]) * 1000 + 500;
        }

        console.warn(`[AI Retry] Limit hit (Attempt ${i + 1}/${maxRetries}). Retrying in ${Math.round(delay / 1000)}s...`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Fallback to Groq for transcription and summarization if Gemini is unavailable.
 * Uses yt-dlp to extract audio and Groq's Whisper model for transcription.
 */
async function processReelWithGroq(directMp4Url) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) throw new Error("Groq fallback failed: Missing GROQ_API_KEY");

    const groq = new Groq({ apiKey: GROQ_API_KEY });
    let tempAudioPath = null;

    try {
        console.log("[Fallback] Starting Groq processing (Audio-only path)...");
        const tempDir = os.tmpdir();
        tempAudioPath = path.join(tempDir, `reel-audio-${Date.now()}.mp3`);

        // 1. Extract audio using yt-dlp
        console.log("[Fallback] Extracting audio with yt-dlp...");
        const isLinux = process.platform === 'linux';
        const ytDlpPath = path.join(__dirname, '..', 'bin', isLinux ? 'yt-dlp_linux' : 'yt-dlp');
        
        const { execFile } = require('child_process');
        const util = require('util');
        const execFileAsync = util.promisify(execFile);

        await execFileAsync(ytDlpPath, [
            '-x', '--audio-format', 'mp3',
            '--output', tempAudioPath,
            directMp4Url
        ]);

        if (!fs.existsSync(tempAudioPath)) {
            // Check if yt-dlp named it with .mp3 extension if it wasn't exactly what we asked
            const actualPath = tempAudioPath.replace('.mp3', '') + '.mp3';
            if (fs.existsSync(actualPath)) tempAudioPath = actualPath;
            else throw new Error("Failed to extract audio file.");
        }

        // 2. Transcribe with Whisper
        console.log("[Fallback] Transcribing with Groq Whisper...");
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempAudioPath),
            model: "whisper-large-v3",
            response_format: "verbose_json",
        });

        const transcript = transcription.text;
        console.log("[Fallback] Transcription complete. Summarizing...");

        // 3. Summarize with Llama 3.1
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a knowledge extraction assistant. Convert the following transcript into a structured JSON note."
                },
                {
                    role: "user",
                    content: `Transcript: ${transcript}\n\nTask:
                    1. Assign it to ONE domain from: [Export, Business, AI & Tech, Marketing, Finance, Lifestyle, Other]
                    2. Generate JSON with:
                       - title: clear descriptive title
                       - oneLiner: one catchy sentence summarizing the reel
                       - summary: 2-3 line summary
                       - keyTakeaways: array of 3-5 bullet point insights
                       - actionItems: array of 2-3 action steps
                       - domain: assigned domain
                       - transcript: literal transcript from provided text
                    Return ONLY raw JSON.`
                }
            ],
            model: "llama-3.1-70b-versatile",
            response_format: { type: "json_object" }
        });

        const resultText = chatCompletion.choices[0].message.content;
        return JSON.parse(resultText);

    } catch (error) {
        console.error("[Fallback Error] Groq processing failed:", error.message);
        throw error;
    } finally {
        if (tempAudioPath && fs.existsSync(tempAudioPath)) {
            try { fs.unlinkSync(tempAudioPath); } catch(e) {}
        }
    }
}

async function processReelVideo(directMp4Url) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  // Try models in order of preference
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];
  
  for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
    const currentModelName = models[modelIdx];
    console.log(`[AI] Attempting with model: ${currentModelName} (Tier ${modelIdx + 1}/${models.length})`);
    
    const model = genAI.getGenerativeModel({ model: currentModelName });

    try {
       return await withRetry(async () => {
          let tempFilePath = null;
          let fileId = null;

          try {
            // 1. Download the Reel to a temporary file
            console.log("[AI] Downloading video...");
            const tempDir = os.tmpdir();
            tempFilePath = path.join(tempDir, `reel-${Date.now()}.mp4`);
            
            const writer = fs.createWriteStream(tempFilePath);
            const response = await axios({
              url: directMp4Url,
              method: 'GET',
              responseType: 'stream',
              timeout: 60000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/'
              }
            });

            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });

            // 2. Upload to Google AI File API
            console.log("[AI] Uploading to File API...");
            const uploadResult = await fileManager.uploadFile(tempFilePath, {
              mimeType: "video/mp4",
              displayName: "Instagram Reel",
            });
            fileId = uploadResult.file.name;

            // 3. Wait for the file to be processed
            let file = await fileManager.getFile(fileId);
            let pollAttempts = 0;
            while (file.state === FileState.PROCESSING && pollAttempts < 15) {
              await sleep(4000);
              file = await fileManager.getFile(fileId);
              pollAttempts++;
            }

            if (file.state !== FileState.ACTIVE) {
              throw new Error(`Video processing failed (State: ${file.state})`);
            }

            // 4. Generate Content
            console.log("[AI] Generating structured note...");
            const result = await model.generateContent([
              { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
              { text: `You are a knowledge extraction assistant. Given this Instagram Reel video, return a JSON object with:
                title, oneLiner, summary (2-3 lines), keyTakeaways (3-5 points), actionItems (2-3 points), 
                domain (one of: Export, Business, AI & Tech, Marketing, Finance, Lifestyle, Other), 
                transcript (full word-for-word transcription). Return ONLY JSON.` }
            ]);

            let responseText = result.response.text();
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(responseText);

          } finally {
            if (tempFilePath && fs.existsSync(tempFilePath)) {
              try { fs.unlinkSync(tempFilePath); } catch (e) {}
            }
            if (fileId) {
                try { await fileManager.deleteFile(fileId); } catch(e) {}
            }
          }
       });
    } catch (error) {
       console.error(`[AI] Failure with ${currentModelName}:`, error.message);
       // If last model failed, try Groq fallback instead of giving up
       if (modelIdx === models.length - 1) {
         console.warn("[AI] All Gemini options exhausted. Invoking Groq Fallback...");
         return await processReelWithGroq(directMp4Url);
       }
       // Otherwise, the loop continues to the next model tier
       console.info(`[AI] Falling back to next tier...`);
    }
  }

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
