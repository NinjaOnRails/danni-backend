const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: 'variables.env' });
const createServer = require('./createServer');
const db = require('./db');

const server = createServer();

// Handle cookies (JWT)
server.express.use(cookieParser());

// Decode JWT to get User ID on each request
server.express.use((req, res, next) => {
  const { token } = req.cookies;
  if (token) {
    const { userId } = jwt.verify(token, process.env.COOKIE_SECRET);
    // Put userId onto req for future requests to access
    req.userId = userId;
  }
  next();
});

// Populate user on each request
server.express.use(async (req, res, next) => {
  if (!req.userId) return next();
  const user = await db.query.user({ where: { id: req.userId } });
  req.user = user;
  next();
});

server.start(
  {
    cors: {
      credentials: true,
      origin: [
        process.env.FRONTEND_URL,
        process.env.FRONTEND_URL_2,
        process.env.FRONTEND_URL_3,
      ],
    },
  },
  deets => {
    console.log(`Server is now running on port http://localhost:${deets.port}`);
  }
);

// Ping itself every 15min to stay awake on Heroku
setInterval(() => {
  fetch('https://dannitv2.herokuapp.com');
}, 900000);
