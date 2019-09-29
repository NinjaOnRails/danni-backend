const jwt = require('jsonwebtoken');

module.exports = ({userId, ctx}) => {
  // Generate JWT Token
  const token = jwt.sign({ userId }, process.env.APP_SECRET, {
    expiresIn: '365d',
  });

  // Set the cookie with the token
  return ctx.response.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });
};
