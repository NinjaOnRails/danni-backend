const youtube = require('./youtube');

module.exports = async (
  originId,
  { titleVi, descriptionVi, addedBy, startAt, tags, defaultVolume },
  ctx,
  id = undefined
) => {
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
    titleVi: titleVi ? titleVi.trim() : undefined,
    descriptionVi: descriptionVi ? descriptionVi.trim() : undefined,
    addedBy: addedBy ? addedBy.trim() : undefined,
    originTitle: title,
    originAuthor: channelTitle,
    originLanguage: defaultAudioLanguage,
    originThumbnailUrl: thumbnails.medium.url,
    originThumbnailUrlSd: thumbnails.standard.url,
  };

  // startAt validation
  if (startAt) {
    if (isNaN(startAt) || startAt < 0) throw new Error('Invalid start at time');

    videoCreateInput.startAt = startAt;
  }

  // defaultVolume validation
  if (defaultVolume) {
    if (isNaN(defaultVolume) || defaultVolume > 100 || defaultVolume < 0)
      throw new Error('Invalid default volume level');
    videoCreateInput.defaultVolume = defaultVolume;
  }

  // tags validation
  if (tags) {
    // Split string into array of unique items
    tags = [...new Set(tags.split(' '))];

    // Remove tags
    const tagsDisconnect = [];
    if (id) {
      const connectedTags = await ctx.db.query.tags({
        where: { video_some: { id } },
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

    videoCreateInput.tags = {};
    if (tagsConnect.length) videoCreateInput.tags.connect = [...tagsConnect];
    if (tagsCreate.length) videoCreateInput.tags.create = [...tagsCreate];
    if (tagsDisconnect.length)
      videoCreateInput.tags.disconnect = [...tagsDisconnect];
  }

  return videoCreateInput;
};
