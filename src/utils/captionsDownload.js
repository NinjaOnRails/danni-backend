const youtube = require('./youtube');
const axios = require('axios');
const parseString = require('xml2js').parseString;

// module.exports

const capD = async (videoId, language) => {
  const {
    data: { items },
  } = await youtube.get('/captions', {
    params: {
      videoId,
    },
  });

  const captionsExist = items.find(item => item.snippet.language === language);

  if (!captionsExist) return `${language} captions not found`;

  const { data: xml } = await axios.get(
    `https://www.youtube.com/api/timedtext?lang=${language}&v=${videoId}`
  );

  if (!xml) return `${language} captions not accessible`;

  const captions = {
    xml,
  };

  parseString(xml, (err, result) => (captions.json = result.transcript.text));

  return captions;
};

// capD('l_NYrWqUR40', 'vi');
