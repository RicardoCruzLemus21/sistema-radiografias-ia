const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint para obtener los catálogos (Rúbricas y Cuestionarios)
router.get('/catalogos', verificarToken, metricsController.listarCatalogosMetricas);

module.exports = router;