const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint para guardar calificaciones de la rúbrica
router.post('/rubrica', verificarToken, metricsController.registrarRubrica);

// Endpoint para obtener los catálogos (Rúbricas y Cuestionarios)
router.get('/catalogos', verificarToken, metricsController.listarCatalogosMetricas);

// Endpoint para obtener las calificaciones de rúbrica ya guardadas de una evaluación
router.get('/rubrica/evaluacion/:id_evaluacion', verificarToken, metricsController.obtenerCalificacionesEvaluacion);

module.exports = router;