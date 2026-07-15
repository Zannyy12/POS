const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', getSettings);
router.put('/', authenticateToken, updateSettings);

module.exports = router;
