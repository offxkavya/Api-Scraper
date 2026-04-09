const fs = require('fs');

async function testRapidAPI() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const apiKeyMatch = envContent.match(/RAPIDAPI_KEY=["']?([^"'\n]+)["']?/);
  if (!apiKeyMatch) {
    console.log("No key"); return;
  }
  const key = apiKeyMatch[1];
  const testUrl = encodeURIComponent("https://www.instagram.com/reel/DKy8VdoC3sf/");
  const params = ['url', 'link', 'q', 'url_ig', 'ig_url', 'id'];

  for (const p of params) {
    const fetchUrl = `https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/?${p}=${testUrl}`;
    try {
      const response = await fetch(fetchUrl, {
        headers: {
          'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com',
          'x-rapidapi-key': key
        }
      });
      const text = await response.text();
      console.log(`Param ${p} - Status: ${response.status} - ${text.substring(0, 100)}`);
    } catch(e) {
      console.log(`Param ${p} - Error: ${e.message}`);
    }
  }
}
testRapidAPI();
