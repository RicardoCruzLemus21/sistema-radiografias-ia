const express = require('express');
const router = express.Router();
const iaController = require('../controllers/iaController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint: POST /api/ia/inferencia
router.post('/inferencia', verificarToken, iaController.registrarInferenciaIA);

module.exports = router;