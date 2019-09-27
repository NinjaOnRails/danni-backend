const axios = require('axios');

module.exports = async (facebookUserId, access_token) => {
  const res = await axios.get(`https://graph.facebook.com/${facebookUserId}`, {
    params: {
      fields: 'id,name,picture',
      access_token,
    },
  });
  return res.data;
};
