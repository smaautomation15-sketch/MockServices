// app.js

const path = require('path');
const express = require('express')
const router = express.Router();
const authRoutes = require('./routes/authRoutes');
const oauth1Routes = require('./routes/oauth1Routes copy');
const oauth2GrantCodeRoutes = require('./routes/oauth2_grantRoutes copy');
const oauth2PasswordGrantRoutes = require('./routes/oauth2_passwordGrantRoute copy');
const oauth2ClientCredentialsGrantRoutes = require('./routes/oauth2_clientCredentialsGrantRoutes copy');
const customAuthorization = require('./routes/custom_authorization')



// Middleware to parse the request body
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

// Set the view engine to EJS
// router.set('view engine', 'ejs');
// router.set('views', path.join(__dirname, 'views'));

// Register your authentication routes
router.use('/auth', authRoutes);

router.use('/oauth1',oauth1Routes);

router.use('/oauth2/grantcode',oauth2GrantCodeRoutes);

router.use('/oauth2/password_grant',oauth2PasswordGrantRoutes);

router.use('/oauth2/client_credentials_grant',oauth2ClientCredentialsGrantRoutes);

router.use('/customauth', customAuthorization);



module.exports = router