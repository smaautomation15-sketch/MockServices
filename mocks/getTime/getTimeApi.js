const express = require('express');
const router = express.Router();
const { formatInTimeZone } = require('date-fns-tz');

router.get('/', (req, res) => {
    const timeZone = req.query.timeZone || 'Asia/Kolkata';
    const now = new Date();
    
    try {
        const response = {
            year: parseInt(formatInTimeZone(now, timeZone, 'yyyy')),
            month: parseInt(formatInTimeZone(now, timeZone, 'M')),
            day: parseInt(formatInTimeZone(now, timeZone, 'd')),
            hour: parseInt(formatInTimeZone(now, timeZone, 'HH')),
            minute: parseInt(formatInTimeZone(now, timeZone, 'mm')),
            seconds: parseInt(formatInTimeZone(now, timeZone, 'ss')),
            milliSeconds: parseInt(formatInTimeZone(now, timeZone, 'SSS')),
            dateTime: formatInTimeZone(now, timeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSS"),
            date: formatInTimeZone(now, timeZone, 'MM/dd/yyyy'),
            time: formatInTimeZone(now, timeZone, 'HH:mm'),
            timeZone: timeZone,
            dayOfWeek: formatInTimeZone(now, timeZone, 'EEEE'),
            dstActive: false // This would need a proper timezone library to determine accurately
        };

        res.status(200).json(response);
    } catch (error) {
        res.status(400).json({ 
            message: 'Invalid timezone provided',
            error: error.message
        });
    }
});

module.exports = router; 