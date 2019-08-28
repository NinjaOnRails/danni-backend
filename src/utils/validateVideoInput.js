const moment = require('moment');
const youtube = require('./youtube');

module.exports = async (originId, ctx, id = undefined) => {
  // Fetch info and deconstruct response from Youtube
  const {
    data: {
      items: [
        {
          snippet: {
            thumbnails,
            channelTitle,
            localized: { title, description },
            defaultAudioLanguage,
            tags,
          },
          contentDetails: { duration },
          statistics: { viewCount, likeCount, dislikeCount },
        },
      ],
    },
  } = await youtube.get('/videos', {
    params: {
      id: originId,
      part: 'snippet,contentDetails,statistics',
      key: process.env.YOUTUBE_API,
    },
  });
  if (!channelTitle) throw new Error('Video not found on Youtube');

  // Prepare mutation input arguments
  const videoCreateInput = {
    duration: moment.duration(duration, moment.ISO_8601).asSeconds(), // Convert default returned YouTube duration from ISO8601 to seconds
    originId,
    originViewCount: parseInt(viewCount),
    originLikeCount: parseInt(likeCount),
    originDislikeCount: parseInt(dislikeCount),
    originTitle: title,
    originDescription: description,
    originAuthor: channelTitle,
    originLanguage: defaultAudioLanguage,
    originThumbnailUrl: thumbnails.medium ? thumbnails.medium.url : '',
    originThumbnailUrlSd: thumbnails.standard ? thumbnails.standard.url : '',
  };

  // tags validation
  if (tags.length) {
    // Remove tags
    const tagsDisconnect = [];
    if (id) {
      const connectedTags = await ctx.db.query.tags({
        where: { audio_some: { id } },
      });
      for (const key in connectedTags) {
        if (!tags.includes(connectedTags[key].text))
          tagsDisconnect.push({ text: connectedTags[key].text });
        tags = tags.filter(tag => tag !== connectedTags[key].text);
      }
    }

    // Divide tags into new and old (and to disconnect)
    const tagsConnect = [];
    const tagsCreate = [];
    for (const tag of tags) {
      // Check individual tag length
      if (tag.length > 63)
        throw new Error('Each tag must be under 63 characters long');
      // Query db for tag presence
      await ctx.db.query.tag({ where: { text: tag } }).then(res => {
        res
          ? tagsConnect.push({ text: res.text })
          : tagsCreate.push({ text: tag });
      });
    }

    // A tags to input arguments
    videoCreateInput.originTags = {};
    if (tagsConnect.length)
      videoCreateInput.originTags.connect = [...tagsConnect];
    if (tagsCreate.length) videoCreateInput.originTags.create = [...tagsCreate];
    if (tagsDisconnect.length)
      videoCreateInput.tags.disconnect = [...tagsDisconnect];
  }

  return videoCreateInput;
};
