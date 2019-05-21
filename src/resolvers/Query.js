const { forwardTo } = require('prisma-binding');

const Query = {
  videos: forwardTo('db'),
  audios: forwardTo('db'),
};

module.exports = Query;
