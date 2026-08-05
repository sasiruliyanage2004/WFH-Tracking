const axios = require('axios');

async function main() {
  try {
    const res = await axios.get('https://wfh-tracking-app-idqg.vercel.app/manager/monitoring/66a7d63e-08c6-42db-b725-abb81f9f92e6');
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log(`First 200 chars of body: ${res.data.substring(0, 200)}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (err.response) {
      console.log(`Status: ${err.response.status}`);
      console.log(`Body: ${JSON.stringify(err.response.data)}`);
    }
  }
}
main();
