const fs = require('fs');

async function testRapidAPI() {
  const key = fs.readFileSync('.env', 'utf8').match(/RAPIDAPI_KEY=["']?([^"'\n]+)["']?/)[1];
  const testUrl = "https://www.instagram.com/reel/DKy8VdoC3sf/";
  
  const headers = {
    'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com',
    'x-rapidapi-key': key,
    'content-type': 'application/json'
  };

  try {
    const r1 = await fetch('https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/', {
      method: 'POST', headers, body: JSON.stringify({ url: testUrl })
    });
    console.log(`POST / (JSON): ${r1.status} - ${await r1.text()}`);
  } catch(e) {}
  
  try {
    const r2 = await fetch('https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/index', {
      method: 'POST', headers, body: JSON.stringify({ url: testUrl })
    });
    console.log(`POST /index (JSON): ${r2.status} - ${await r2.text()}`);
  } catch(e) {}
}
testRapidAPI();
