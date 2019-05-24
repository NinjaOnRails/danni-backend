const youtube = require('../utils/youtube');
const captionDownload = require('../utils/captionsDownload');
const languageTags = require('../config/languageTags');

const mutations = {
  async createVideo(parent, { youtubeId }, ctx, info) {
    // Check if video exists
    const videoExists = await ctx.db.query.video({ where: { youtubeId } });
    if (videoExists) throw new Error('Video already exists');

    // Fetch info from Youtube
    const res = await youtube.get('/videos', {
      params: {
        id: youtubeId,
      },
    });
    if (!res.data.items.length) throw new Error('Video not found on Youtube');
    const {
      thumbnails: {
        medium: { url },
      },
      channelTitle,
      localized: { title },
      defaultAudioLanguage,
    } = res.data.items[0].snippet;

    // Save video to db
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
    if (!video) throw new Error('Saving video to db failed');

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
  async createCaption(
    parent,
    {
      data: { languageTag, xml, author, video },
    },
    ctx,
    info
  ) {
    // Check if video exists
    const videoExists = await ctx.db.query.video({ where: { id: video } });
    if (!videoExists) throw new Error('Video not found');

    // Save captions to db
    if (xml) {
      const captions = await ctx.db.mutation.createCaption(
        {
          data: {
            languageTag,
            xml,
            video: {
              connect: {
                id: video,
              },
            },
          },
        },
        info
      );
      if (!captions) throw new Error('Saving captions to db failed');

      return captions;
    } else {
      // Download captions and save them to db
      const xmlYoutube = await captionDownload(
        videoExists.youtubeId,
        languageTag
      );
      if (!xmlYoutube) throw new Error('Captions not found on Youtube');

      const captions = await ctx.db.mutation.createCaption(
        {
          data: {
            languageTag,
            xml: xmlYoutube,
            video: {
              connect: {
                id: video,
              },
            },
          },
        },
        info
      );
      if (!captions) throw new Error('Saving captions to db failed');

      return captions;
    }
  },
  async createTag(parent, { text, video }, ctx, info) {
    const tag = ctx.db.mutation.createTag({
      data: {
        text,
        video: {
          connect: {
            id: video,
          },
        },
      },
    });
    if (!tag) throw new Error('Saving tag to db failed');

    return tag;
  },
};

module.exports = mutations;
