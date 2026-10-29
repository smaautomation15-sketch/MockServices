

const express = require('express');
const router = express.Router();
const redisTokenManager = require('../../auth-profiles/utils/redisTokenManager');

// Remove the in-memory array as we'll use Redis
// let webhookAsyncResponses = [];

router.post('/callback', async (req, res) => {
    try {
        await redisTokenManager.storeWebhookResponse(req.body);
        res.status(200).json({message:'Records stored'});
    } catch (error) {
        console.error('Error storing webhook response:', error);
        res.status(500).json({message:'Error storing records', error: error.message});
    }
});

router.get('/fetch', async (req, res) => {
    try {
        const responses = await redisTokenManager.getAllWebhookResponses();
        res.status(200).json({message:'fetch executed', responses: responses});
    } catch (error) {
        console.error('Error fetching webhook responses:', error);
        res.status(500).json({message:'Error fetching records', error: error.message});
    }
});

router.get('/clear', async (req, res) => {
    try {
        const cleared = await redisTokenManager.clearWebhookResponses();
        if(cleared){
            res.status(200).json({message:'Records cleared'});
        } else {
            res.status(200).json({message:'No records to clear'});
        }
    } catch (error) {
        console.error('Error clearing webhook responses:', error);
        res.status(500).json({message:'Error clearing records', error: error.message});
    }
});

module.exports = router;