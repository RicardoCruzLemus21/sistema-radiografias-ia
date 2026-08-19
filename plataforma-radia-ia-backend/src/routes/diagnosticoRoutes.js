const express = require('express');
const router = express.Router(); // <-- ¡Esta es la línea que faltaba y que Node.js estaba pidiendo!
const diagnosticoController = require('../controllers/diagnosticoController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// =========================================================
// BYPASS TEMPORAL: Quitamos "verificarToken" de la ejecución
// para permitir las pruebas desde Angular y Postman sin login.
// =========================================================

// Endpoint: POST /api/diagnostico/evaluar
router.post('/evaluar', /* verificarToken, */ diagnosticoController.registrarEvaluacion);

// Endpoints CRUD para Patologías (Catálogo)
// Módulo de Catálogos
router.get('/catalogos', diagnosticoController.listarCatalogos);
router.put('/patologia/:id', verificarToken, verificarRol(['catedratico', 'admin']), diagnosticoController.editarPatologia);
router.delete('/patologia/:id', verificarToken, verificarRol(['catedratico', 'admin']), diagnosticoController.eliminarPatologia);

// Módulo Human-in-the-Loop (Gestión de Evaluaciones)
router.get('/evaluaciones/curso/:id_curso', verificarToken, verificarRol(['catedratico', 'admin']), diagnosticoController.obtenerEvaluacionesPorCurso);
router.get('/evaluaciones/todas', verificarToken, verificarRol(['admin']), diagnosticoController.obtenerTodasLasEvaluaciones);
router.put('/evaluacion/:id', verificarToken, verificarRol(['catedratico', 'admin']), diagnosticoController.agregarFeedback);
router.delete('/evaluacion/:id', verificarToken, verificarRol(['catedratico', 'admin']), diagnosticoController.invalidarEvaluacion);

module.exports = router;