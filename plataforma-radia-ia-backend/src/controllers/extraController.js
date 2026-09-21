const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');
const commentService = require('../services/commentService');

// --- AUDITORÍA ---
const obtenerLogsAuditoria = async (req, res) => {
    try {
        const logs = await auditService.obtenerLogs();
        res.status(200).json({ status: 'success', data: logs });
    } catch (error) {
        console.error("Error al obtener auditoría:", error);
        res.status(500).json({ status: 'error', message: "Error al cargar la auditoría del sistema." });
    }
};

// --- NOTIFICACIONES ---
const obtenerNotificaciones = async (req, res) => {
    try {
        const id_usuario = req.usuario.id_usuario;
        const notificaciones = await notificationService.obtenerNotificaciones(id_usuario);
        res.status(200).json({ status: 'success', data: notificaciones });
    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        res.status(500).json({ status: 'error', message: "Error al cargar notificaciones." });
    }
};

const eliminarNotificacion = async (req, res) => {
    try {
        const id_notificacion = Number(req.params.id_notificacion);
        if (!Number.isInteger(id_notificacion) || id_notificacion <= 0) {
            return res.status(400).json({ status: 'error', message: 'Identificador de notificación inválido.' });
        }
        const eliminada = await notificationService.eliminarNotificacion(id_notificacion, req.usuario.id_usuario);
        if (!eliminada) {
            return res.status(404).json({ status: 'error', message: 'La notificación no existe.' });
        }
        res.status(200).json({ status: 'success', message: 'Notificación eliminada.' });
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({ status: 'error', message: 'Error al eliminar la notificación.' });
    }
};

// --- COMENTARIOS ---
const agregarComentario = async (req, res) => {
    try {
        const { id_evaluacion, comentario } = req.body;
        const id_catedratico = req.usuario.id_usuario;
        const resultado = await commentService.agregarComentario(id_evaluacion, id_catedratico, comentario);
        notificationService.notificarComentarioDelDocente(id_evaluacion);
        res.status(201).json({ status: 'success', data: resultado, message: "Comentario registrado." });
    } catch (error) {
        console.error("Error al agregar comentario:", error);
        res.status(500).json({ status: 'error', message: "Error interno al guardar comentario." });
    }
};

const obtenerComentariosEvaluacion = async (req, res) => {
    try {
        const { id_evaluacion } = req.params;
        const comentarios = await commentService.obtenerComentariosEvaluacion(id_evaluacion);
        res.status(200).json({ status: 'success', data: comentarios });
    } catch (error) {
        console.error("Error al obtener comentarios:", error);
        res.status(500).json({ status: 'error', message: "Error al cargar comentarios." });
    }
};

module.exports = {
    obtenerLogsAuditoria,
    obtenerNotificaciones,
    eliminarNotificacion,
    agregarComentario,
    obtenerComentariosEvaluacion
};
