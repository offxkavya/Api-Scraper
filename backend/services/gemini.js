// backend/services/gemini.js
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

  try {
    const data = await withRetry(async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  fileData: {
                    mimeType: "video/mp4",
                    fileUri: directMp4Url
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
              ]
            }]
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    });

    // Extract the text response and clean it
    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("No response content from Gemini API");
    }

    // Strip any markdown backticks before parsing JSON
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const noteData = JSON.parse(responseText);
    return noteData;

  } catch (error) {
    console.error("Gemini processing error:", error);
    throw error;
  }
}

module.exports = { processReelVideo };
