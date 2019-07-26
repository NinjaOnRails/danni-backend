require('dotenv').config({ path: 'variables.env' });
const http = require('http')
const createServer = require('./createServer');
const db = require('./db');

setInterval(function() {
  http.get(process.env.PRISMA_ENDPOINT);
}, 900000); // every 15 minutes (900000)

const server = createServer();

server.start(
  {
    cors: {
      credentials: true,
      origin: [process.env.FRONTEND_URL, process.env.FRONTEND_URL_2],
    },
  },
  deets => {
    console.log(`Server is now running on port http://localhost:${deets.port}`);
  }
);
