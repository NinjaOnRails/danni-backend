const axios = require('axios');

module.exports = async access_token => {
  const res = await axios.get('https://graph.facebook.com/me', {
    params: {
      access_token,
    },
  });
  return res.data
};
