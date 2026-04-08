const { getReelDirectUrl } = require('./services/rapidApi');
require('dotenv').config();

async function test() {
  const url = 'https://www.instagram.com/reel/DKy8VdoC3sf/';
  try {
    console.log(`Testing extraction for: ${url}`);
    const result = await getReelDirectUrl(url);
    console.log('SUCCESS! Extracted URL:', result.directMp4Url);
    process.exit(0);
  } catch (e) {
    console.error('FINAL FAILURE:', e.message);
    process.exit(1);
  }
}

test();
