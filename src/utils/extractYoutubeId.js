const youtubeIdLength = 11;

module.exports = source => {
  // Check if source is YouTube and extract ID from it
  source = source.trim();
  const sourceYouTube = [
    { domain: 'https://youtube.com/watch?v=', length: 28 },
    { domain: 'http://youtube.com/watch?v=', length: 27 },
    { domain: 'https://www.youtube.com/watch?v=', length: 32 },
    { domain: 'http://www.youtube.com/watch?v=', length: 31 },
    { domain: 'youtube.com/watch?v=', length: 20 },
    { domain: 'www.youtube.com/watch?v=', length: 24 },
    { domain: 'https://youtu.be/', length: 17 },
    { domain: 'https://www.youtu.be/', length: 21 },
    { domain: 'http://youtu.be/', length: 16 },
    { domain: 'http://www.youtu.be/', length: 20 },
    { domain: 'youtu.be/', length: 9 },
    { domain: 'www.youtu.be/', length: 13 },
  ];
  const isYouTube = sourceYouTube.find(value =>
    source.startsWith(value.domain)
  );
  if (isYouTube) {
    const { length } = isYouTube;
    var originId = source.slice(length, length + youtubeIdLength);
  } else if (source.length === youtubeIdLength) {
    var originId = source;
  } else {
    throw new Error('No valid YouTube source was provided');
  }
  return originId;
};
