const axios = require('axios');
const parseString = require('xml2js').parseString;
// const he = require('he');

const charLimit = 5000;

module.exports = async (id, minBreak = 0.5, language = 'vi') => {
  const { data } = await axios.get(
    `https://www.youtube.com/api/timedtext?lang=${language}&v=${id}`
  );

  parseString(data, (err, { transcript: { text } }) => {
    const texts = { ...text };
    const ssml = {};
    let n = 0;
    ssml[n] = '';
    for (let i = 0; i < text.length - 1; i++) {
      const breakTime = (
        parseFloat(texts[i + 1]['$'].start) -
        parseFloat(texts[i]['$'].start) -
        parseFloat(texts[i]['$'].dur) +
        minBreak
      )
        .toFixed(2)
        .toString();
      const breakTag = ` <break time=\\"${breakTime}s\\" />`;
      //   const breakTag =
      //     breakTime > 0 ? ` <break time=\\"${breakTime}s\\" />` : '';
      const line = texts[i]._ + breakTag + '\n';
      //   const line = he.unescape(texts[i]._) + breakTag + '\n';
      if ((ssml[n] + line).length <= charLimit) {
        ssml[n] += line;
      } else {
        n += 1;
        ssml[n] = line;
      }
    }

    return ssml;
  });
};