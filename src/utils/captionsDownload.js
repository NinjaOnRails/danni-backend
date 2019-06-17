const youtube = require('./youtube');
const axios = require('axios');
// const parseString = require('xml2js').parseString;

// const capD = async (videoId, language) => {
module.exports = async (videoId, language) => {
  // Fetch list of captions for Youtube video
  const {
    data: { items },
  } = await youtube.get('/captions', {
    params: {
      videoId,
      part: 'snippet',
      key: process.env.YOUTUBE_API,
    },
  });
  if (!items) return null;

  // Check if there are captions for the given language
  const captionsExist = items.find(item => item.snippet.language === language);
  if (!captionsExist) return null;

  // Fetch the captions for the given language
  const { data } = await axios.get(
    `https://www.youtube.com/api/timedtext?lang=${language}&v=${videoId}`
  );
  // if (!data) return null;

  // console.log(data)
  return data;

  // const { data: xml } = await axios.get(
  //   `https://www.youtube.com/api/timedtext?lang=${language}&v=${videoId}`
  // );
  // if (!xml) return null;

  // return xml

  // const captions = {
  //   xml,
  // };

  // parseString(xml, (err, result) => (captions.json = result.transcript.text));

  // return captions;
};

// capD('TGLYcYCm2FM', 'vi');
// capD('l_NYrWqUR40', 'vi');
