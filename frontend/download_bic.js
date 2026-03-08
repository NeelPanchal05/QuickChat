const fs = require('fs');
const https = require('https');

const file = fs.createWriteStream('src/utils/browser-image-compression.js');
https.get('https://unpkg.com/browser-image-compression@2.0.2/dist/browser-image-compression.js', function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close(); 
    console.log("Download completed successfully.");
  });
}).on('error', function(err) {
  fs.unlink('src/utils/browser-image-compression.js');
  console.error("Error downloading file:", err.message);
});
