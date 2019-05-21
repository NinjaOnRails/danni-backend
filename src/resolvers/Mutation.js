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
};

module.exports = mutations;
