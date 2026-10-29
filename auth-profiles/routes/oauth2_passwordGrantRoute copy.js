const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const crypto = require('crypto');
const redisTokenManager = require('../utils/redisTokenManager');
const { parseBody } = require('../utils/oauth2BodyParser');

// In-memory data store to simulate user authentication
const users = [
  { id: 1, username: 'user1', password: 'password1' },
  { id: 2, username: 'user2', password: 'password2' },
];

// Raw body only for POST /token and POST /refresh_token (multi content-type support)
router.use(
  bodyParser.raw({
    type: (req) =>
      req.method === 'POST' && ['/token', '/refresh_token'].includes(req.path),
    limit: '1mb',
  })
);

// Normalize body by Content-Type for the same routes
router.use((req, res, next) => {
  if (
    req.method !== 'POST' ||
    (req.path !== '/token' && req.path !== '/refresh_token')
  ) {
    return next();
  }
  if (!Buffer.isBuffer(req.body)) {
    return next();
  }
  const contentType = req.get('Content-Type') || '(none)';
  console.log(
    '[OAuth2 Password Grant] Endpoint called: POST /oauth2/password_grant' +
      req.path +
      ' | Content-Type: ' +
      contentType
  );
  parseBody(req.body, req.get('Content-Type') || '', req.path)
    .then((parsed) => {
      req.body = parsed;
      next();
    })
    .catch((err) => {
      res.status(400).json({
        error: 'invalid_request',
        error_description: err.message || 'Invalid body format',
      });
    });
});

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}


async function isTokenValid(userAuthToken){
  return await redisTokenManager.isAccessTokenValid(userAuthToken, 'oauth2_password');
}

// Mock OAuth 2.0 token endpoint
router.post('/token', async (req, res) => {
  try {
    const { grant_type, username, password } = req.body;

    // Check if grant_type is 'password'
    if (grant_type !== 'password') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    // Find the user based on the provided username
    const user = users.find((u) => u.username === username);

    // Check if the user exists and the password matches
    if (!user || user.password !== password) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Generate a mock access token
    const accessToken = generateToken();
    const refreshToken = generateToken();
    await redisTokenManager.setAccessToken(accessToken, 'oauth2_password');
    await redisTokenManager.setRefreshToken(refreshToken, 'oauth2_password');

    // Send the access token as the response
    res.json({ access_token: accessToken, token_type: 'Bearer' , expires_in: 300, refresh_token:refreshToken});
  } catch (error) {
    console.error('Error generating password grant token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected endpoint to test with access token
router.get('/validation', async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization;
  
    // Check if the authorization header is present and formatted correctly
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  
    // Extract the access token from the authorization header
    const accessToken = authorizationHeader.substring('Bearer '.length);
  
    // Check if the access token is valid
    const isValid = await isTokenValid(accessToken);
    if (!isValid) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  
    // Respond with a success message
    res.json({ message: 'oauth2 password grant successful' });
  } catch (error) {
    console.error('Error validating password grant token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  router.post('/refresh_token', async (req, res) => {
    try {
      console.log('/oauth2/password_grant/refresh_token===>called');
      console.log('Refresh Token Request - OAuth2 Password Grant');
      
      // Check if the required request parameters are present
      if (!req.body.grant_type || req.body.grant_type !== 'refresh_token' || !req.body.refresh_token) {
        console.log('Invalid refresh token request parameters');
        return res.status(400).json({ error: 'Invalid request parameters' });
      }
      
      const hasRefreshToken = await redisTokenManager.hasRefreshToken(req.body.refresh_token, 'oauth2_password');
      if(!hasRefreshToken){
        console.log('Refresh token not found or expired');
        return res.sendStatus(401);
      }
      await redisTokenManager.deleteRefreshToken(req.body.refresh_token, 'oauth2_password');
    
      let accessToken = generateToken();
      await redisTokenManager.setAccessToken(accessToken, 'oauth2_password');
      const tokenType = 'bearer';
      const expiresIn = 300;
      const refreshToken = generateToken();
      await redisTokenManager.setRefreshToken(refreshToken, 'oauth2_password');
      
      console.log('OAuth2 Password Grant refresh token successful');
      return res.json({ access_token: accessToken, token_type: tokenType, expires_in: expiresIn, refresh_token: refreshToken });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  module.exports = router;