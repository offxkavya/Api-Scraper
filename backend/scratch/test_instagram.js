// backend/scratch/test_instagram.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getReelDirectUrl } = require('../services/rapidApi');

async function test() {
  const testUrls = [
    'https://www.instagram.com/reel/DXE_iyngGUJ/',
    'https://www.instagram.com/reel/DWznmMvEuSR/'
  ];

  for (const url of testUrls) {
    try {
      console.log(`\nTesting URL: ${url}`);
      const result = await getReelDirectUrl(url);
      console.log('Success!', result);
    } catch (error) {
      console.error('Failed:', error.message);
    }
  }
}

test();
