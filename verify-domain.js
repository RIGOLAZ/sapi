const https = require('https');
const http = require('http');

const testUrl = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          content: data.trim(),
          url: url
        });
      });
    }).on('error', reject);
  });
};

const main = async () => {
  const urls = [
    'http://shop.etralis.com/validation-key.txt',
    'https://shop.etralis.com/validation-key.txt',
    'http://www.shop.etralis.com/validation-key.txt',
    'https://www.shop.etralis.com/validation-key.txt'
  ];

  console.log('Testing domain validation...\n');
  
  for (const url of urls) {
    try {
      const result = await testUrl(url);
      console.log(`✅ ${result.url}`);
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Content: "${result.content}"`);
      console.log(`   Content-Type: ${result.headers['content-type']}`);
      console.log('');
    } catch (error) {
      console.log(`❌ ${url} - Error: ${error.message}\n`);
    }
  }
};

main();