const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

router.get('/logs', auditController.obtenerLogs);

module.exports = router;
