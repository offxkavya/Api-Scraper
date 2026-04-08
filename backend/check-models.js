const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There isn't a direct listModels in the standard browser/node SDK usually, 
    // it's in the specialized admin SDK or we have to use fetch.
    console.log("Checking gemini-1.5-flash-latest and gemini-1.5-flash...");
    
    for (const m of ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-flash-8b"]) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("hello");
            console.log(`Model ${m} is AVAILABLE`);
        } catch (e) {
            console.log(`Model ${m} FAILED: ${e.message}`);
        }
    }
  } catch (err) {
    console.error(err);
  }
}

listModels();
