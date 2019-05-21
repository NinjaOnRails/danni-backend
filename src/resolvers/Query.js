const { forwardTo } = require('prisma-binding');

const Query = {
  videos: forwardTo('db'),
};

module.exports = Query;
