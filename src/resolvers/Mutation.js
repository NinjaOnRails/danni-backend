const extractYoutubeId = require('../utils/extractYoutubeId');
const validateVideoInput = require('../utils/validateVideoInput');
const captionDownload = require('../utils/captionsDownload');
// const languageTags = require('../config/languageTags');

const mutations = {
  async createVideo(parent, { data }, ctx, info) {
    // Check if source is YouTube and extract ID from it
    const originId = extractYoutubeId(data.source);

    // Check if video exists
    const videoExists = await ctx.db.query.video({
      where: { originId },
    });
    if (videoExists) throw new Error('Video already exists');

    // Validate other input arguments
    const videoCreateInput = await validateVideoInput(originId, data, ctx);

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
  async updateVideo(parent, { id, password, data }, ctx, info) {
    // Check if edit password matches
    if (password !== 'dracarys') throw new Error('Invalid password');

    // Get Video originId
    let { originId } = await ctx.db.query.video({
      where: { id },
    });

    // New source
    if (data.source) {
      // Check if source is YouTube and extract ID from it
      originId = extractYoutubeId(data.source);

      // Check if new video exists
      const video = await ctx.db.query.video({
        where: { originId },
      });
      if (video && data.source !== originId)
        throw new Error('Video already exists');
      originId = data.source;
    }

    // Validate other input arguments
    const videoUpdateInput = await validateVideoInput(originId, data, ctx, id);

    // Update video in db
    return ctx.db.mutation.updateVideo(
      {
        data: {
          ...videoUpdateInput,
        },
        where: {
          id,
        },
      },
      info
    );
  },
  async deleteVideo(parent, { id, password }, ctx, info) {
    if (!id || !(password === 'dracarys'))
      throw new Error('Invalid delete password');
    return ctx.db.mutation.deleteVideo({
      where: {
        id,
      },
    });
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
