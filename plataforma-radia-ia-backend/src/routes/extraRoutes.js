const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const extraController = require('../controllers/extraController');

// Rutas de Auditoría (Solo admins/catedráticos en la vida real, aquí protegeremos con el middleware)
router.get('/auditoria/logs', verificarToken, extraController.obtenerLogsAuditoria);

// Rutas de Notificaciones (Para todos los usuarios)
router.get('/notificaciones', verificarToken, extraController.obtenerNotificaciones);
router.put('/notificaciones/:id_notificacion/leida', verificarToken, extraController.marcarNotificacionLeida);

// Rutas de Comentarios
router.post('/comentarios', verificarToken, extraController.agregarComentario);
router.get('/comentarios/evaluacion/:id_evaluacion', verificarToken, extraController.obtenerComentariosEvaluacion);

module.exports = router;
