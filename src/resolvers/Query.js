const { forwardTo } = require('prisma-binding');

const Query = {
  videos: forwardTo('db'),
  video: forwardTo('db'),
  audios: forwardTo('db'),
  captions: forwardTo('db'),
  caption: forwardTo('db'),
  tag: forwardTo('db'),
  tags: forwardTo('db'),
  currentUser(parent, args, ctx, info) {
    // Check if there is current user ID
    if (!ctx.request.userId) {
      return null;
    }

    return ctx.db.query.user(
      {
        where: {
          id: ctx.request.userId,
        },
      },
      info
    );
  },
};

module.exports = Query;
