const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware'); 

// Endpoints REST
router.post('/registrar', authController.registrar);
router.post('/login', authController.login);
router.get('/roles', authController.listarRoles);

// Endpoints Privados (Requieren token JWT para acceder)
router.get('/usuarios', verificarToken, authController.listarUsuarios);
router.get('/auditoria', verificarToken, authController.listarAuditoria);

module.exports = router;