const youtube = require('../utils/youtube');
const captionDownload = require('../utils/captionsDownload');
const youtubeIdLength = require('../utils/youtubeIdLength');
// const languageTags = require('../config/languageTags');

const mutations = {
  async createVideo(
    parent,
    {
      data: { source, titleVi, addedBy, startAt },
    },
    ctx,
    info
  ) {
    // Trim arguments
    source = source.trim();
    titleVi = titleVi.trim();

    // Check startAt validity
    if (isNaN(startAt) || startAt < 0) throw new Error('Invalid start at time');
    // if (
    //   startAt &&
    //   (startAt.length !== 4 ||
    //     isNaN(startAt) ||
    //     parseInt(startAt[0]) > 6 ||
    //     parseInt(startAt[2]) > 6)
    // )
    //   throw new Error('Invalid start at time');

    // Check if source is YouTube and extract ID from it
    const sourceYouTube = [
      { domain: 'https://youtube.com/watch?v=', length: 28 },
      { domain: 'http://youtube.com/watch?v=', length: 27 },
      { domain: 'https://www.youtube.com/watch?v=', length: 32 },
      { domain: 'http://www.youtube.com/watch?v=', length: 31 },
      { domain: 'youtube.com/watch?v=', length: 20 },
      { domain: 'www.youtube.com/watch?v=', length: 24 },
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

    // Check if video exists
    const videoExists = await ctx.db.query.video({
      where: { originId },
    });
    if (videoExists) throw new Error('Video already exists');

    // Fetch info from Youtube
    const res = await youtube.get('/videos', {
      params: {
        id: originId,
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

    // Set default addedBy
    addedBy = addedBy ? addedBy.trim() : 'Anonymous';
    // if (!startAt) startAt = '0000';

    // Save video to db
    const video = await ctx.db.mutation.createVideo(
      {
        data: {
          originId,
          titleVi,
          originTitle: title,
          originAuthor: channelTitle,
          originLanguage: defaultAudioLanguage,
          originThumbnailUrl: url,
          startAt,
          addedBy,
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
      const xmlYoutube = await captionDownload(videoExists.source, languageTag);
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
