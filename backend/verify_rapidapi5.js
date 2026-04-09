const fs = require('fs');

async function testRapidAPI() {
  const key = fs.readFileSync('.env', 'utf8').match(/RAPIDAPI_KEY=["']?([^"'\n]+)["']?/)[1];
  const testUrl = encodeURIComponent("https://www.instagram.com/reel/DKy8VdoC3sf/");
  
  const headers = {
    'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com',
    'x-rapidapi-key': key
  };

  try {
    const res = await fetch(`https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/?url=${testUrl}`, { headers });
    console.log(`GET /?url=: ${res.status} - ${await res.text()}`);
  } catch(e) {}
  
  try {
    const res = await fetch(`https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/?url=${testUrl}`, { method: 'POST', headers });
    console.log(`POST /?url=: ${res.status} - ${await res.text()}`);
  } catch(e) {}
}
testRapidAPI();
