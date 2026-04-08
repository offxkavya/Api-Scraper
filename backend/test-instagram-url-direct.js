const instagramGetUrl = require('instagram-url-direct');

async function test() {
  const testUrl = 'https://www.instagram.com/reel/DJMoOJ3v4vP/';
  console.log('Testing extraction with instagram-url-direct for:', testUrl);
  try {
    const result = await instagramGetUrl(testUrl);
    console.log('Extraction Success!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Extraction Failed!');
    console.error('Error:', error.message);
  }
}

test();
