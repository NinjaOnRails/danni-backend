const youtube = require('./youtube');
const axios = require('axios');
// const parseString = require('xml2js').parseString;

// const capD = async (videoId, language) => {
module.exports = async (videoId, language) => {
  const {
    data: { items },
  } = await youtube.get('/captions', {
    params: {
      videoId,
    },
  });
  if (!items) return null;

  const captionsExist = items.find(item => item.snippet.language === language);
  if (!captionsExist) return null;

  const { data } = await axios.get(
    `https://www.youtube.com/api/timedtext?lang=${language}&v=${videoId}`
  );
  if (!data) return null;

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
