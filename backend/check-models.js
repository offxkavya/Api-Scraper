const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("No GEMINI_API_KEY found in .env");
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    console.log("--- Checking Gemini Model Availability ---");
    
    // Test the REST API directly for listing
    console.log("Fetching model list from REST API...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    
    if (data.models) {
        console.log("✔ Successfully retrieved model list via REST API.");
        const names = data.models.map(m => m.name.replace('models/', ''));
        console.log("Available Models:", names.slice(0, 10).join(', ') + (names.length > 10 ? '...' : ''));
    } else {
        console.warn("✘ Could not list models via REST API:", data.error?.message || "Unknown error");
    }

    const testModels = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"];
    
    for (const m of testModels) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            // Small test call
            await model.generateContent("hi");
            console.log(`[SDK] Model ${m}: AVAILABLE`);
        } catch (e) {
            console.log(`[SDK] Model ${m}: FAILED (${e.message.substring(0, 100)})`);
        }
    }
  } catch (err) {
    console.error("Check failed:", err.message);
  }
}

listModels();
