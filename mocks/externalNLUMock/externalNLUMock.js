const express = require('express');
const router = express.Router();


router.post('/', (req, res) => {
    console.log("External NLU Mock API called");
    if (!req.body || typeof req.body.user_input !== 'string') {
        return res.status(400).json({ message: 'user_input is required' });
    }
    const userInput = req.body.user_input.toLowerCase();
    
    if (userInput.includes('travel') || userInput.includes('journey')) {
        const mockResponse = {
            "tasks": {
                "definitive": [
                    {
                        "name": "Travel",
                        "score": 0.89
                    }
                ],
                "possible": [
                    {
                        "name": "Book a Flight",
                        "score": 0.59
                    },
                    {
                        "name": "Travel Plan",
                        "score": 0.69
                    }
                ],
                "eliminated": [
                    {
                        "name": "Cancel a booking",
                        "score": 0.03
                    }
                ]
            },
            "entities": [
                {
                    "name": "srcCity",
                    "value": "Hyderabad",
                    "start": 1,
                    "end": 1,
                    "startCharIndex": 5,
                    "endCharIndex": 10
                }
            ],
            "traits": []
        };
        res.json(mockResponse);
    } else {
        res.json({});
    }
});



module.exports = router;
