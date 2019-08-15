const youtube = require('./youtube');

module.exports = async originId => {
  // Fetch info from Youtube
  const res = await youtube.get('/videos', {
    params: {
      id: originId,
      part: 'snippet',
      key: process.env.YOUTUBE_API,
    },
  });
  if (!res.data.items.length) throw new Error('Video not found on Youtube');

  // Deconstruct response from Youtube
  const {
    thumbnails,
    channelTitle,
    localized: { title },
    defaultAudioLanguage,
  } = res.data.items[0].snippet;

  // Prepare mutation input arguments
  const videoCreateInput = {
    originId,
    originTitle: title,
    originAuthor: channelTitle,
    originLanguage: defaultAudioLanguage,
    originThumbnailUrl: thumbnails.medium ? thumbnails.medium.url : '',
    originThumbnailUrlSd: thumbnails.standard ? thumbnails.standard.url : '',
  };

  return videoCreateInput;
};
