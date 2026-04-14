// backend/scratch/test_yt_dlp.js
const { execFile } = require('child_process');
const path = require('path');
const util = require('util');
const execFileAsync = util.promisify(execFile);

async function testYtDlp() {
  const reelUrl = 'https://www.instagram.com/reel/DXE_iyngGUJ/';
  const isLinux = process.platform === 'linux';
  const ytDlpPath = path.join(__dirname, '..', 'bin', isLinux ? 'yt-dlp_linux' : 'yt-dlp');
  
  console.log(`Testing yt-dlp at: ${ytDlpPath}`);
  console.log(`URL: ${reelUrl}`);

  try {
    const { stdout, stderr } = await execFileAsync(ytDlpPath, [
      '-j', 
      '--no-check-certificates',
      '--geo-bypass',
      '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      reelUrl
    ], { 
      env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/usr/bin:/bin` } 
    });

    if (stderr) console.warn('yt-dlp stderr:', stderr);

    const data = JSON.parse(stdout);
    console.log('Success! Extracted Title:', data.title);
    console.log('Extracted URL:', data.url ? 'Yes' : 'No');
    
    if (data.formats) {
        const videoFormats = data.formats.filter(f => f.ext === 'mp4' && f.url);
        console.log(`Found ${videoFormats.length} mp4 video formats.`);
    }

  } catch (error) {
    console.error('yt-dlp failed:', error.message);
    if (error.stdout) console.log('Stdout:', error.stdout.substring(0, 200));
    if (error.stderr) console.error('Stderr:', error.stderr.substring(0, 500));
  }
}

testYtDlp();
