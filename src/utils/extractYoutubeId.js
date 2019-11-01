const youtubeIdLength = 11;

module.exports = source => {
  // Check if source is YouTube and extract ID from it
  source = source.trim();
  const sourceYouTube = [
    { domain: 'https://youtube.com/watch?v=', length: 28 },
    { domain: 'https://m.youtube.com/watch?v=', length: 30 },
    { domain: 'http://youtube.com/watch?v=', length: 27 },
    { domain: 'http://m.youtube.com/watch?v=', length: 29 },
    { domain: 'https://www.youtube.com/watch?v=', length: 32 },
    { domain: 'https://www.m.youtube.com/watch?v=', length: 34 },
    { domain: 'http://www.youtube.com/watch?v=', length: 31 },
    { domain: 'http://www.m.youtube.com/watch?v=', length: 33 },
    { domain: 'youtube.com/watch?v=', length: 20 },
    { domain: 'm.youtube.com/watch?v=', length: 22 },
    { domain: 'www.youtube.com/watch?v=', length: 24 },
    { domain: 'www.m.youtube.com/watch?v=', length: 26 },
    { domain: 'https://youtu.be/', length: 17 },
    { domain: 'https://m.youtu.be/', length: 19 },
    { domain: 'https://www.youtu.be/', length: 21 },
    { domain: 'https://www.m.youtu.be/', length: 23 },
    { domain: 'http://youtu.be/', length: 16 },
    { domain: 'http://m.youtu.be/', length: 18 },
    { domain: 'http://www.youtu.be/', length: 20 },
    { domain: 'http://www.m.youtu.be/', length: 22 },
    { domain: 'youtu.be/', length: 9 },
    { domain: 'm.youtu.be/', length: 11 },
    { domain: 'www.youtu.be/', length: 13 },
    { domain: 'www.m.youtu.be/', length: 15 },
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
