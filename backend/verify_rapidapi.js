const axios = require('axios');
const util = require('util');

async function test() {
  const url = 'https://www.instagram.com/reel/DKy8VdoC3sf/';
  const RAPIDAPI_KEY = "1eb7178677mshcbff79cb6d8f235p106e1ajsndd04348967cc";
  
  try {
    const response = await axios.request({
      method: 'GET',
      url: 'https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/',
      params: { url: url },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com'
      }
    });

    console.log("Response:", util.inspect(response.data, { depth: null, colors: true }));
  } catch (e) {
    if (e.response) {
      console.error("Error Response:", util.inspect(e.response.data, { depth: null, colors: true }));
    } else {
      console.error(e.message);
    }
  }
}

test();
