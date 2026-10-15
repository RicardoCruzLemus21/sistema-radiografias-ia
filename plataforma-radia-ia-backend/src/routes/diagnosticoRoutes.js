const express = require('express');
const router = express.Router(); // <-- ¡Esta es la línea que faltaba y que Node.js estaba pidiendo!
const diagnosticoController = require('../controllers/diagnosticoController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Endpoints CRUD para Patologías (Catálogo)
// Módulo de Catálogos
router.get('/catalogos', diagnosticoController.listarCatalogos);
router.put('/patologia/:id', verificarToken, verificarRol(['catedratico', 'admin']), diagnosticoController.editarPatologia);
router.delete('/patologia/:id', verificarToken, verificarRol(['catedratico', 'admin']), diagnosticoController.eliminarPatologia);

module.exports = router;