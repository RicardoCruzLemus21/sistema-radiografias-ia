const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint para guardar calificaciones de la rúbrica
router.post('/rubrica', verificarToken, metricsController.registrarRubrica);

// Endpoint para guardar encuesta de percepción (Variable 3)
router.post('/likert', verificarToken, metricsController.registrarLikert);

// Endpoint para obtener los catálogos (Rúbricas y Cuestionarios)
router.get('/catalogos', verificarToken, metricsController.listarCatalogosMetricas);

module.exports = router;