const { forwardTo } = require('prisma-binding');

const Query = {
  videos: forwardTo('db'),
  video: forwardTo('db'),
  audios: forwardTo('db'),
  captions: forwardTo('db'),
  caption: forwardTo('db'),
};

module.exports = Query;
