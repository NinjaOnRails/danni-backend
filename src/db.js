// This file connects to the remote prisma DB and gives us the ability to query it with JS
const { Prisma } = require('prisma-binding');

const db = new Prisma({
  typeDefs: 'src/generated/prisma.graphql',
  // typeDefs: __dirname + "/schema_prep.graphql",
  // endpoint: process.env.PRISMA_ENDPOINT_DEV,
  endpoint: process.env.PRISMA_ENDPOINT_PROD,
  secret: process.env.PRISMA_SECRET,
  debug: false,
});

module.exports = db;
