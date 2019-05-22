const youtube = require('../utils/youtube');

const mutations = {
  async createVideo(parent, { youtubeId }, ctx, info) {
    const res = await youtube.get('/videos', {
      params: {
        id: youtubeId,
      },
    });

    const {
      thumbnails: {
        medium: { url },
      },
      channelTitle,
      localized: { title },
      defaultAudioLanguage,
    } = res.data.items[0].snippet;

    const video = await ctx.db.mutation.createVideo(
      {
        data: {
          youtubeId,
          title,
          channelTitle,
          defaultLanguage: defaultAudioLanguage,
          thumbnailUrl: url,
        },
      },
      info
    );

    return video;
  },
  async createAudio(
    parent,
    {
      data: { source, language, video },
    },
    ctx,
    info
  ) {
    const audio = await ctx.db.mutation.createAudio(
      {
        data: {
          source,
          language,
          video: {
            connect: {
              id: video,
            },
          },
        },
      },
      info
    );

    return audio;
  },
};

module.exports = mutations;
