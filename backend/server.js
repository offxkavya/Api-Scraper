// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { db, auth } = require('./firebase/admin');
const { getReelDirectUrl } = require('./services/rapidApi');
const { processReelVideo } = require('./services/gemini');

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to authenticate Firebase user token
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized. Missing or invalid token." });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    if (!auth) {
       console.warn("Using mock auth. Service account not loaded.");
       req.user = { uid: "test-user-id" };
       return next();
    }
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Auth Error:", error);
    res.status(401).json({ error: "Unauthorized. Invalid token." });
  }
};

app.post('/api/extract', authenticateUser, async (req, res) => {
  const { reelUrl } = req.body;
  if (!reelUrl || !reelUrl.match(/instagram\.com\/(reel|p)\//)) {
    return res.status(400).json({ error: "Invalid Instagram Reel URL" });
  }

  try {
    // Step 1: RapidAPI
    const { directMp4Url, thumbnail } = await getReelDirectUrl(reelUrl);
    if (!directMp4Url) {
      return res.status(400).json({ error: "Failed to extract video URL from Instagram." });
    }

    // Step 2: Gemini Integration
    const noteData = await processReelVideo(directMp4Url);

    // Step 3: Save to Firestore
    if (!db) {
       console.warn("Firestore not initialized, skipping save. Returning data directly.");
       return res.json({ note: { ...noteData, reelUrl, thumbnail, id: "mock-id", createdAt: new Date().toISOString() }});
    }

    const noteRef = db.collection('users').doc(req.user.uid).collection('notes').doc();
    const finalNote = {
      ...noteData,
      reelUrl,
      thumbnail: thumbnail || null,
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    };

    await noteRef.set(finalNote);

    res.json({ id: noteRef.id, ...finalNote });

  } catch (error) {
    console.error("Extraction Error:", error);
    res.status(500).json({ error: error.message || "Internal server error during extraction." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
