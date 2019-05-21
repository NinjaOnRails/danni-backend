const mutations = {
  async createVideo(parent, args, ctx, info) {
    const video = await ctx.db.mutation.createVideo(
      {
        data: {
          ...args,
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
