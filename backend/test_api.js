const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('http://localhost:5000/api/system/analytics', {
      // no auth token to see if it returns 401 correctly, or I need a token
      // Wait, I can generate a token for system admin
    });
    console.log(res.data);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
