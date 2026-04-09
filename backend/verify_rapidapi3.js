const fs = require('fs');

async function testRapidAPI() {
  const key = process.env.RAPIDAPI_KEY || (fs.readFileSync('.env', 'utf8').match(/RAPIDAPI_KEY=["']?([^"'\n]+)["']?/)[1]);
  const testUrl = encodeURIComponent("https://www.instagram.com/reel/C8qL8y0NnOa/");
  
  const endpoints = ['/index.php', '/api', '/download'];
  for (const ep of endpoints) {
    const fetchUrl = `https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com${ep}?url=${testUrl}`;
    try {
      const response = await fetch(fetchUrl, {
        headers: {
          'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com',
          'x-rapidapi-key': key
        }
      });
      console.log(`${ep} GET: ${response.status} - ${await response.text()}`);
    } catch(e) {}
  }
}
testRapidAPI();
