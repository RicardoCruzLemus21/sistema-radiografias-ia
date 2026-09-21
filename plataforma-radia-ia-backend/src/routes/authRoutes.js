const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { crearLimitador } = require('../middlewares/rateLimiter');

// Freno a la fuerza bruta en los endpoints públicos de registro y de consulta de códigos
const limitarRegistro = crearLimitador({ ventanaMs: 60_000, maximo: 10, mensaje: 'Demasiados intentos de registro. Espera un minuto e intenta de nuevo.' });
const limitarConsultaCodigo = crearLimitador({ ventanaMs: 60_000, maximo: 20, mensaje: 'Demasiadas consultas de código. Espera un minuto e intenta de nuevo.' });

// ==========================================
// ENDPOINTS PÚBLICOS (No requieren sesión)
// ==========================================
router.post('/registrar', authController.registrar);
router.post('/registrar-docente', limitarRegistro, authController.registrarDocente);
router.post('/registrar-estudiante', limitarRegistro, authController.registrarEstudiante);
router.get('/docente-por-codigo/:codigo', limitarConsultaCodigo, authController.consultarDocentePorCodigo);
router.get('/cursos-disponibles', authController.listarCursosDisponibles);
router.post('/login', authController.login);
router.get('/roles', authController.listarRoles);

// ==========================================
// ENDPOINTS PRIVADOS (Requieren Token JWT)
// ==========================================
router.get('/usuarios', verificarToken, authController.listarUsuarios);
router.get('/auditoria', verificarToken, authController.listarAuditoria);
router.post('/cambiar-clave-inicial', verificarToken, authController.cambiarClaveInicial);

module.exports = router;