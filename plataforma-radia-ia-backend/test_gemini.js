
require('dotenv').config({ override: true });
const apiKey = process.env.GEMINI_API_KEY.trim();
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
  body: JSON.stringify({ contents: [{ parts: [{ text: 'Que es atelectasia?' }] }] })
}).then(r => r.text()).then(b => console.log('RESPONSE:', b)).catch(e => console.log('ERR:', e.message));

