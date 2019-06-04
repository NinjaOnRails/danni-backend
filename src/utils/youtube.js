const axios = require('axios');

module.exports = axios.create({
  baseURL: 'https://www.googleapis.com/youtube/v3',
  params: {
    part: 'snippet',
    key: process.env.YOUTUBE_API,
  },
});
