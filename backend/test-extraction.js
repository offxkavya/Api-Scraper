require('dotenv').config({ path: '/Users/kavyamukhija/Desktop/ReelNotes/backend/.env' });
const { getReelDirectUrl } = require('./services/rapidApi');

async function test() {
  const testUrl = 'https://www.instagram.com/reel/DJMoOJ3v4vP/';
  console.log('Testing extraction for:', testUrl);
  try {
    const result = await getReelDirectUrl(testUrl);
    console.log('Extraction Success!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Extraction Failed!');
    console.error('Error:', error.message);
  }
}

test();
