const https = require('https'); 
https.get('https://wfh-tracking-k5ap.vercel.app', res => { 
  let data = ''; 
  res.on('data', chunk => data += chunk); 
  res.on('end', () => { 
    const m = data.match(/src="(\/static\/js\/main\.[^"]+\.js)"/); 
    if(m) {
      https.get('https://wfh-tracking-k5ap.vercel.app'+m[1], r => { 
        let d = ''; 
        r.on('data', c => d+=c); 
        r.on('end', () => console.log(d.includes('https://wfh-tracking.onrender.com') ? 'USES_RENDER' : 'USES_LOCAL')); 
      }); 
    }
  }); 
});
