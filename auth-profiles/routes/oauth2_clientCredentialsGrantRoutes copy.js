const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { access } = require('fs');
const redisTokenManager = require('../utils/redisTokenManager');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

let client_id = "Test_OAuth2_Client_Credentials_Grant_Client_ID";
let client_secret = "Test_OAuth2_Client_Credentials_Grant_Client_Secret";



function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}


async function isTokenValid(userAuthToken){
  return await redisTokenManager.isAccessTokenValid(userAuthToken, 'oauth2_client_credentials');
}




// Endpoint to simulate the token endpoint for client credentials grant
router.post('/token', async (req, res) => {
  try {
    if (req.body.grant_type !== 'client_credentials') {
      return res.status(400).json({ error: 'Invalid grant type' });
    }
    if(req.body.client_id!==client_id || req.body.client_secret!==client_secret){
      return res.status(400).json({ error: 'Invalid client id or client secret' });
    }

    const access_token = generateToken();
    const expires_in = 300;
    const token_type = 'bearer';
    await redisTokenManager.setAccessToken(access_token, 'oauth2_client_credentials');

    res.json({ access_token: access_token, token_type: token_type, expires_in: expires_in });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to test authentication using the access token
router.get('/validation', async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization;
  
    // Check if the access token is provided in the Authorization header
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    const accessToken = authorizationHeader.substring('Bearer '.length);

    // Validate the access token using Redis
    const isValid = await isTokenValid(accessToken);
    if (!accessToken || !isValid) {
      return res.status(401).json({ error: 'Invalid access token' });
    }
  
    // Access token is valid, return a success response
    res.json({ message: 'oauth2 client credentials grant successful' });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


  module.exports = router;