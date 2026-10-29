const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const redisTokenManager = require('../utils/redisTokenManager');

router.use(express.json());

let oauth_callback = "";

// Helper function to parse the authorization header
function parseAuthorizationHeader(header) {
  const regex = /(\w+)="([^"]*)"/g;
  let match;
  const data = {};
  while ((match = regex.exec(header))) {
    const key = match[1];
    const value = match[2];
    data[key] = decodeURIComponent(value);
  }
  return data;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}
    

// Update the isTokenValid function to use Redis
async function isTokenValid(userAuthToken){
  return await redisTokenManager.isOAuth1TokenValid(userAuthToken);
}

// Update the /initiate route to be async and use Redis
router.post('/initiate', async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization;
    const authorizationData = parseAuthorizationHeader(authorizationHeader);
    oauth_callback = authorizationData.oauth_callback;

    if (
      authorizationData.oauth_signature_method === "HMAC-SHA1" &&
      authorizationData.oauth_consumer_key === "Test_OAuth1_Consumer_Key"
    ) {
      // Return the response
      res.setHeader('Content-Type', 'application/x-www-form-urlencoded');
      let randomOAuthToken = generateToken();
      await redisTokenManager.setOAuth1Token(randomOAuthToken);

      res.status(200).send('oauth_token='+randomOAuthToken+'&oauth_token_secret=hdhd0244k9j7ao03&oauth_callback_confirmed=true');
    } else {
      // Invalid headers
      res.sendStatus(401);
    }
  } catch (error) {
    console.error('Error in OAuth1 initiate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update the /token route to be async and use Redis
router.post('/token', async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization;
    const authorizationData = parseAuthorizationHeader(authorizationHeader);
    
    // Check if token exists in Redis
    const tokenExists = await redisTokenManager.getOAuth1Token(authorizationData.oauth_token);
    if(!tokenExists){
      console.log("/oauth1/token===>validation failed")
      return res.sendStatus(401);
    }
    
    if(
      authorizationData.oauth_consumer_key==="Test_OAuth1_Consumer_Key" &&
      authorizationData.oauth_verifier==='hfdp7dh39dks9884'
      ){
        await redisTokenManager.deleteOAuth1Token(authorizationData.oauth_token);
        let oauth_token = generateToken();
        await redisTokenManager.setOAuth1Token(oauth_token);
        res.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        return res.status(200).send('oauth_token='+oauth_token+'&oauth_token_secret=pfkkdhi9sl3r4s00');
      }else{
        console.log("/oauth1/token===>validation failed")
        res.sendStatus(401);
      }
  } catch (error) {
    console.error('Error in OAuth1 token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

// Update the /authorize route to be async and use Redis
router.get('/authorize', async (req, res) => {
  try {
    const tokenExists = await redisTokenManager.getOAuth1Token(req.query.oauth_token);
    if(tokenExists){
      await redisTokenManager.deleteOAuth1Token(req.query.oauth_token);
      let newOauthToken = generateToken();
      await redisTokenManager.setOAuth1Token(newOauthToken);
      return res.redirect(oauth_callback+"?oauth_token="+newOauthToken+"&oauth_verifier=hfdp7dh39dks9884");
    }else{
      return res.sendStatus(401);
    }
  } catch (error) {
    console.error('Error in OAuth1 authorize:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

// Update the /validation route to be async and use Redis
router.get('/validation', async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization;
    const authorizationData = parseAuthorizationHeader(authorizationHeader);
    let currentUserToken = authorizationData.oauth_token;
    
    if(!currentUserToken || !(await isTokenValid(currentUserToken))){
      return res.sendStatus(401);
    }
    
    const tokenExists = await redisTokenManager.getOAuth1Token(authorizationData.oauth_token);
    if(tokenExists){
      return res.status(200).send({message:"oauth1 successful"});
    }else{
      return res.sendStatus(401);
    }
  } catch (error) {
    console.error('Error in OAuth1 validation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

module.exports = router;