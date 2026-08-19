const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const extraController = require('../controllers/extraController');

// Rutas de Auditoría (Solo administradores)
router.get('/auditoria/logs', verificarToken, verificarRol(['Admin']), extraController.obtenerLogsAuditoria);

// Rutas de Notificaciones (Para todos los usuarios)
router.get('/notificaciones', verificarToken, extraController.obtenerNotificaciones);
router.put('/notificaciones/:id_notificacion/leida', verificarToken, extraController.marcarNotificacionLeida);

// Rutas de Comentarios
router.post('/comentarios', verificarToken, extraController.agregarComentario);
router.get('/comentarios/evaluacion/:id_evaluacion', verificarToken, extraController.obtenerComentariosEvaluacion);

module.exports = router;
