const express = require('express');
const router = express.Router(); // <-- ¡Esta es la línea que faltaba y que Node.js estaba pidiendo!
const diagnosticoController = require('../controllers/diagnosticoController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// =========================================================
// BYPASS TEMPORAL: Quitamos "verificarToken" de la ejecución
// para permitir las pruebas desde Angular y Postman sin login.
// =========================================================

// Endpoint: POST /api/diagnostico/evaluar
router.post('/evaluar', verificarToken, verificarRol(['estudiante']), diagnosticoController.registrarEvaluacion);

// Endpoints CRUD para Patologías (Catálogo)
// Módulo de Catálogos
router.get('/catalogos', diagnosticoController.listarCatalogos);
router.put('/patologia/:id', verificarToken, verificarRol(['catedratico', 'admin']), diagnosticoController.editarPatologia);
router.delete('/patologia/:id', verificarToken, verificarRol(['catedratico', 'admin']), diagnosticoController.eliminarPatologia);

module.exports = router;