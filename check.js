const https = require('https');
const url = 'https://res.cloudinary.com/dhkdvzd48/raw/upload/v1/prompt-gallery/db.json?' + Date.now();
https.get(url, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const a = JSON.parse(d);
      console.log('total:', a.length);
      console.log('last id:', a[a.length - 1].id);
    } catch(e) {
      console.log('parse error, raw:', d.substring(0, 200));
    }
  });
}).on('error', e => console.error(e.message));
