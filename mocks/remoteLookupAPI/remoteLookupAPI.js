const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const response = {
    "page": 2,
    "per_page": 6,
    "total": 12,
    "total_pages": 2,
    "data": [
      {
        "id": 1,
        "email": "michael.lawson@reqres.in",
        "first_name": "Michael",
        "last_name": "Lawson",
        "avatar": "https://reqres.in/img/faces/7-image.jpg"
      },
      {
        "id": 2,
        "email": "lindsay.ferguson@reqres.in",
        "first_name": "Lindsay",
        "last_name": "Ferguson",
        "avatar": "https://reqres.in/img/faces/8-image.jpg"
      },
      {
        "id": 3,
        "email": "tobias.funke@reqres.in",
        "first_name": "Tobias",
        "last_name": "Funke",
        "avatar": "https://reqres.in/img/faces/9-image.jpg"
      },
      {
        "id": 4,
        "email": "byron.fields@reqres.in",
        "first_name": "Byron",
        "last_name": "Fields",
        "avatar": "https://reqres.in/img/faces/10-image.jpg"
      },
      {
        "id": 5,
        "email": "george.edwards@reqres.in",
        "first_name": "George",
        "last_name": "Edwards",
        "avatar": "https://reqres.in/img/faces/11-image.jpg"
      },
      {
        "id": 6,
        "email": "rachel.howell@reqres.in",
        "first_name": "Rachel",
        "last_name": "Howell",
        "avatar": "https://reqres.in/img/faces/12-image.jpg"
      }
    ],
    "support": {
      "url": "https://contentcaddy.io?utm_source=reqres&utm_medium=json&utm_campaign=referral",
      "text": "Tired of writing endless social media content? Let Content Caddy generate it for you."
    },
    "_meta": {
      "powered_by": "🚀 ReqRes - Deploy backends in 30 seconds",
      "upgrade_url": "https://app.reqres.in/upgrade",
      "docs_url": "https://reqres.in",
      "template_gallery": "https://app.reqres.in/templates",
      "message": "This API is powered by ReqRes. Deploy your own backend in 30 seconds!",
      "features": [
        "30 Second Backend Templates",
        "Custom API Endpoints",
        "Data Persistence",
        "Real-time Analytics"
      ],
      "upgrade_cta": "Upgrade to Pro for unlimited requests, custom endpoints, and data persistence"
    }
  };
  
  res.status(200).json(response);
});

module.exports = router;

