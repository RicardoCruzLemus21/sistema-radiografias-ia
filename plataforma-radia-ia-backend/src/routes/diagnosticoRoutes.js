const express = require('express');
const router = express.Router(); // <-- ¡Esta es la línea que faltaba y que Node.js estaba pidiendo!
const diagnosticoController = require('../controllers/diagnosticoController');
// const { verificarToken } = require('../middlewares/authMiddleware'); 

// =========================================================
// BYPASS TEMPORAL: Quitamos "verificarToken" de la ejecución
// para permitir las pruebas desde Angular y Postman sin login.
// =========================================================

// Endpoint: POST /api/diagnostico/evaluar
router.post('/evaluar', /* verificarToken, */ diagnosticoController.registrarEvaluacion);

// Endpoint: GET /api/diagnostico/catalogos (El que consultará Angular)
router.get('/catalogos', /* verificarToken, */ diagnosticoController.listarCatalogos);

module.exports = router;