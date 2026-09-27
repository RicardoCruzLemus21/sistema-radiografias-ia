const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// El registro de auditoría es información sensible (quién hizo qué en todo el sistema): solo admin.
router.get('/logs', verificarToken, verificarRol(['admin']), auditController.obtenerLogs);

module.exports = router;
