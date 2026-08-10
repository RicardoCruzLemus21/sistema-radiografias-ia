const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

// ==========================================
// ENDPOINTS PÚBLICOS (No requieren sesión)
// ==========================================
router.post('/registrar', authController.registrar);
router.post('/login', authController.login);
router.get('/roles', authController.listarRoles);

// ==========================================
// ENDPOINTS PRIVADOS (Requieren Token JWT)
// ==========================================
router.get('/usuarios', verificarToken, authController.listarUsuarios);
router.get('/auditoria', verificarToken, authController.listarAuditoria);

module.exports = router;