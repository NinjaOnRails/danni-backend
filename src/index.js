require('dotenv').config({ path: 'variables.env' });
const createServer = require('./createServer');
const http = require('http');
const db = require('./db');

const server = createServer();

setInterval(function() {
  http.get('http://danni-prod-5e73c28066.herokuapp.com');
  http.get(process.env.FRONTEND_URL);
}, 1800000); // every 30 minutes

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
