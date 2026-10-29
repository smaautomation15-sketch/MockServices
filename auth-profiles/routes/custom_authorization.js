const express = require('express');
const router = express.Router();
const request = require('request');
const querystring = require('querystring');

const port = 3000;

// app.use(express.urlencoded({ extended: true }));

router.get('/', (req, res) => {
  // Data to be sent in the POST request
  const postData = querystring.stringify(req.body);
  const callbackurl = req.query.callbackurl;
  console.log("Callbackurl generated from platform for custom authentication : "+callbackurl)

  // Options for the external API request
  const options = {
    url: callbackurl, // Replace with the actual API URL
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        'name': 'rama'
      }),
  };

  // Make the external API request using the 'request' module
  request(options, (error, apiResponse, body) => {
    if (error) {
      // Handle errors during the API request
      console.error(error);
      res.status(500).send('Internal Server Error');
    } else {
      try {
        // Assuming success is determined by a specific condition in the API response
        const apiResponseData = JSON.parse(body);
          // HTML page with JavaScript to close the browser window
          console.log("Custom Authentication API is called")
          const htmlResponse = `
            <html>
              <head>
                <script>
                  // Close the browser window after 3 seconds (adjust as needed)
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                </script>
              </head>
              <body>
                <p>Request successful. Closing window...</p>
              </body>
            </html>
          `;

          res.send(htmlResponse);
        
      } catch (error) {
        // Handle errors parsing the API response
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    }
  });
});

module.exports = router;