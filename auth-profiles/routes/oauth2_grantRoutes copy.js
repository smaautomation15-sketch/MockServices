const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const redisTokenManager = require('../utils/redisTokenManager');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));


let client_id = "Test_OAuth2_Grant_Code_Client_ID";
let client_secret = "Test_OAuth2_Grant_Code_Client_Secret";
let redirect_uri = "";
let state = "";




function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}


async function isTokenValid(userAuthToken){
  return await redisTokenManager.isAccessTokenValid(userAuthToken, 'oauth2_auth_code');
}




// Endpoint for the authorization code grant flow
router.get('/authorize', async (req, res) => {

  // Check if the required query parameters are present
  if (!req.query.response_type || req.query.response_type !="code" || !req.query.client_id || req.query.client_id != client_id|| !req.query.redirect_uri ) {
    return res.status(400).send('Invalid request parameters');
  }
    redirect_uri = req.query.redirect_uri;
    state = req.query.state;


  // Generate a mock authorization code
  const authorizationCode = generateToken();
  await redisTokenManager.setAuthorizationCode(authorizationCode, 'oauth2_auth_code');

  // Redirect back to the provided redirect URI with the authorization code
  const redirectUrl = `${redirect_uri}?code=${authorizationCode}`;
  return res.redirect(redirectUrl);
});



// Endpoint for exchanging the authorization code for an access token
router.post('/token', async (req, res) => {
  try {
    const { grant_type, code, redirect_uri } = req.body;

    // Check if the required request parameters are present
    if (!grant_type || grant_type !== 'authorization_code' || !code || !redirect_uri) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    const hasAuthCode = await redisTokenManager.hasAuthorizationCode(code, 'oauth2_auth_code');
    if(!hasAuthCode){
      return res.sendStatus(401);
    }

    await redisTokenManager.deleteAuthorizationCode(code, 'oauth2_auth_code');

    // Generate a mock access token and other response data
    let accessToken = generateToken();
    await redisTokenManager.setAccessToken(accessToken, 'oauth2_auth_code');
    const tokenType = 'bearer';
    const expiresIn = 300;
    const refreshToken = generateToken();
    await redisTokenManager.setRefreshToken(refreshToken, 'oauth2_auth_code');

    // Return the access token and other response data
    return res.json({ access_token: accessToken, token_type: tokenType, expires_in: expiresIn, refresh_token: refreshToken });
  } catch (error) {
    console.error('Error generating auth code token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/refresh_token', async (req, res) => {
  try {
    console.log('/oauth2/grantcode/refresh_token===>called');
    console.log('Refresh Token Request - OAuth2 Authorization Code Grant');
    
    // Check if the required request parameters are present
    if (!req.body.grant_type || req.body.grant_type !== 'refresh_token' || !req.body.refresh_token) {
      console.log('Invalid refresh token request parameters');
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    const hasRefreshToken = await redisTokenManager.hasRefreshToken(req.body.refresh_token, 'oauth2_auth_code');
    if(!hasRefreshToken){
      console.log('Refresh token not found or expired');
      return res.sendStatus(401);
    }
    await redisTokenManager.deleteRefreshToken(req.body.refresh_token, 'oauth2_auth_code');

    let accessToken = generateToken();
    await redisTokenManager.setAccessToken(accessToken, 'oauth2_auth_code');
    const tokenType = 'bearer';
    const expiresIn = 300;
    const refreshToken = generateToken();
    await redisTokenManager.setRefreshToken(refreshToken, 'oauth2_auth_code');
    
    console.log('OAuth2 Authorization Code Grant refresh token successful');
    return res.json({ access_token: accessToken, token_type: tokenType, expires_in: expiresIn, refresh_token: refreshToken });
  } catch (error) {
    console.error('Error refreshing auth code token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.get('/validation', async (req, res) => {
  try {
    let bearerToken = req.headers['authorization'];
    let token = bearerToken.split(" ")[1];
    const isValid = await isTokenValid(token);
    if(token && isValid){
      res.status(200).send({message:"oauth2 successful"});
    }else{
      res.sendStatus(401);
    }
  } catch (error) {
    console.error('Error validating auth code token:', error);
    res.sendStatus(401);
  }
});

  module.exports = router;
