

const express = require('express');
const router = express.Router();

function wait(delay) { 
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(); 
    }, delay*1000);
  });
}


router.get('/', (req, res) => {
  let seconds = parseInt(req.query["delayseconds"]);
  if(isNaN(seconds)){
    return res.status(400).json({ message: 'Send proper number of seconds' });
  }
    console.log(seconds)
    wait(seconds)
    .then(() => {
      res.status(200).json({ message: 'Response returned after '+seconds+' seconds' });
    })
    .catch((error) => {
      res.status(400).json({ message: 'Error occured in api response' });
    });
});





module.exports = router;
