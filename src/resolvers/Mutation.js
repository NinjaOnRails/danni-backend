const youtube = require('../utils/youtube');
const captionDownload = require('../utils/captionsDownload');
const youtubeIdLength = require('../utils/youtubeIdLength');
// const languageTags = require('../config/languageTags');

const mutations = {
  async createVideo(
    parent,
    {
      data: { source, titleVi, addedBy, startAt, tags, defaultVolume },
    },
    ctx,
    info
  ) {
    // Check if source is YouTube and extract ID from it
    source = source.trim();
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

    // Deconstruct response from Youtube
    const {
      thumbnails: {
        medium: { url },
      },
      channelTitle,
      localized: { title },
      defaultAudioLanguage,
    } = res.data.items[0].snippet;

    // Prepare mutation input arguments
    const videoCreateInput = {
      originId,
      titleVi: titleVi.trim(),
      originTitle: title,
      originAuthor: channelTitle,
      originLanguage: defaultAudioLanguage,
      originThumbnailUrl: url,
    };

    // startAt validation
    if (startAt) {
      if (isNaN(startAt) || startAt < 0)
        throw new Error('Invalid start at time');

      videoCreateInput.startAt = startAt;
    }

    // defaultVolume validation
    if (defaultVolume) {
      if (isNaN(defaultVolume) || defaultVolume > 100 || defaultVolume < 0)
        throw new Error('Invalid default volume level');
      videoCreateInput.defaultVolume = defaultVolume;
    }

    // addedBy validation
    if (addedBy) videoCreateInput.addedBy = addedBy.trim();

    // tags validation
    if (tags) {
      // Split string into array of unique items
      tags = [...new Set(tags.split(' '))];

      // Divide tags into new and old
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
      if (tagsConnect) videoCreateInput.tags.connect = [...tagsConnect];
      if (tagsCreate) videoCreateInput.tags.create = [...tagsCreate];
    }

    // Save video to db
    const video = await ctx.db.mutation.createVideo(
      {
        data: {
          ...videoCreateInput,
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
    // Save audio to db
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

    // Save given XML captions to db
    if (xml) {
      var captions = await ctx.db.mutation.createCaption(
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
    }

    // Download captions and save them to db
    const xmlYoutube = await captionDownload(videoExists.originId, languageTag);
    if (!xmlYoutube) throw new Error('Captions not found on Youtube');

    captions = await ctx.db.mutation.createCaption(
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
