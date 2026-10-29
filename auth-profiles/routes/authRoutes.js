// app/routes/authRoutes.js

const express = require('express');
const router = express.Router();
// const basicAuthMock = require('../mocks/basicAuthMock');
// const apiKeyAuthMock = require('../mocks/apiKeyAuthMock');

const username = 'admin';
const password = 'password';

// Middleware function to handle Basic authentication
const basicAuthMock = (req, res, next) => {
  // Extract the Authorization header from the request
  const authHeader = req.headers['authorization'];

  // Check if the Authorization header exists and starts with "Basic "
  if (authHeader && authHeader.startsWith('Basic ')) {
    // Decode the base64-encoded username and password
    const encodedCredentials = authHeader.split(' ')[1];
    const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');

    // Extract the username and password from the decoded credentials
    const [enteredUsername, enteredPassword] = decodedCredentials.split(':');

    // Compare the entered username and password with the hardcoded values
    if (enteredUsername === username && enteredPassword === password) {
      // Authentication successful
      next();
    } else {
      // Authentication failed
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } else {
    // Authorization header missing or not using Basic authentication
    res.status(401).json({ error: 'Authorization required' });
  }
};


// List of valid API keys
const validApiKeys = ['YOUR_API_KEY_1', 'YOUR_API_KEY_2'];

// Middleware function to handle API key-based authentication
const apiKeyAuthMock = (req, res, next) => {
  // Extract the API key from the request headers
  const apiKey = req.headers['x-api-key'];

  // Check if the API key is provided and valid
  if (apiKey && validApiKeys.includes(apiKey)) {
    // Authentication successful
    next();
  } else {
    // Authentication failed
    res.status(401).json({ error: 'Invalid API key' });
  }
};

// Route handler shared by GET and POST Basic Auth validation requests.
const protectedBasicHandler = (req, res) => {
  console.log('/protected-basic===>called');
  console.log('Basic Auth successful');
  res.status(200).json({ message: 'Basic authentication successful' });
  // res.json({ message: 'Basic authentication successful' });
};

// Support both methods because Auth Profile clients may configure the check as GET
// or POST. Basic credentials are still required in the Authorization header.
router
  .route('/protected-basic')
  .get(basicAuthMock, protectedBasicHandler)
  .post(basicAuthMock, protectedBasicHandler);

// Route that requires API key-based authentication
router.get('/protected-apikey', apiKeyAuthMock, (req, res) => {
  console.log('/protected-apikey===>called');
  console.log('APIKey Auth successful');
  res.status(200).json({ message: 'API key-based authentication successful' });
  // res.json({ message: 'API key-based authentication successful' });
});

// Hardcoded username and password for demonstration purposes



module.exports = router;
