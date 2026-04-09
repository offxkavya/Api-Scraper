const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
async function test(endpoint) {
  const url = `https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com${endpoint}?url=https://www.instagram.com/reel/C8qL8y0NnOa/`;
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com',
      'x-rapidapi-key': RAPIDAPI_KEY
    }
  });
  console.log(endpoint, response.status, await response.text());
}
async function run() {
  await test('/index');
  await test('/');
  await test('/video');
  await test('/download');
  await test('/reel');
}
run();
