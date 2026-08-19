const diagnosticoService = require('../services/diagnosticoService');
const db = require('../config/database'); // Importamos la conexión a la base de datos
const { TABLAS, COLUMNAS } = require('../config/dbDictionary'); // Importamos tu Diccionario de Datos

const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');

const registrarEvaluacion = async (req, res) => {
    try {
        // req.body ya vendrá parseado como JSON gracias a Express
        const resultado = await diagnosticoService.guardarEvaluacionEstudiante(req.body);
        
        // EXTRA: Auditoría y Notificaciones
        const id_estudiante = req.body.id_estudiante || 2;
        await auditService.registrarAccion(id_estudiante, 'EVALUACION_COMPLETADA', `El estudiante completó la evaluación del caso ${req.body.id_caso}`);
        
        // Notificar a los catedráticos
        try {
            const [catedraticos] = await db.query(`SELECT ${COLUMNAS.ID_USUARIO} FROM ${TABLAS.USUARIOS} WHERE id_rol = 1`);
            if (catedraticos.length > 0) {
                const ids = catedraticos.map(c => c.id_usuario);
                await notificationService.enviarNotificacionMasiva(ids, 'Nueva Evaluación', `Un estudiante ha completado el diagnóstico del caso ${req.body.id_caso}.`);
            }
        } catch (e) {
            console.error("Error notificando catedráticos:", e);
        }

        // Respondemos con status 201 (Created)
        res.status(201).json({
            status: 'success',
            data: resultado
        });
    } catch (error) {
        console.error("Error al registrar diagnóstico:", error);
        res.status(400).json({
            status: 'error',
            message: error.message || "Ocurrió un error al procesar el diagnóstico del estudiante."
        });
    }
};

// Función actualizada usando el Diccionario de Datos
const listarCatalogos = async (req, res) => {
    try {
        // Hacemos el SELECT a la Tabla 9 usando el Diccionario
        // Agregamos "false AS seleccionada" para que los checkboxes en Angular nazcan desmarcados
        const query = `
            SELECT 
                ${COLUMNAS.ID_PATOLOGIA} AS id, 
                ${COLUMNAS.NOMBRE_PATOLOGIA} AS nombre,
                false AS seleccionada
            FROM ${TABLAS.CATALOGO_PATOLOGIAS}
        `;
        
        const [rows] = await db.query(query);
        
        res.status(200).json({
            status: 'success',
            data: rows
        });
    } catch (error) {
        console.error("Error al obtener catálogos:", error);
        res.status(500).json({
            status: 'error',
            message: "Error interno del servidor al cargar los catálogos médicos."
        });
    }
};

const editarPatologia = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_patologia, descripcion } = req.body;
        
        await db.query(
            `UPDATE ${TABLAS.CATALOGO_PATOLOGIAS} SET ${COLUMNAS.NOMBRE_PATOLOGIA} = ?, descripcion = ? WHERE ${COLUMNAS.ID_PATOLOGIA} = ?`,
            [nombre_patologia, descripcion, id]
        );
        
        res.status(200).json({ status: 'success', message: 'Patología actualizada correctamente' });
    } catch (error) {
        console.error("Error al editar patología:", error);
        res.status(500).json({ status: 'error', message: 'Error al actualizar la patología' });
    }
};

const eliminarPatologia = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM ${TABLAS.CATALOGO_PATOLOGIAS} WHERE ${COLUMNAS.ID_PATOLOGIA} = ?`, [id]);
        res.status(200).json({ status: 'success', message: 'Patología eliminada correctamente' });
    } catch (error) {
        console.error("Error al eliminar patología:", error);
        res.status(500).json({ status: 'error', message: 'No se puede eliminar la patología porque está en uso por evaluaciones existentes.' });
    }
};

const obtenerEvaluacionesPorCurso = async (req, res) => {
    try {
        const { id_curso } = req.params;
        const evaluaciones = await diagnosticoService.obtenerEvaluacionesPorCurso(id_curso);
        res.status(200).json({ status: 'success', data: evaluaciones });
    } catch (error) {
        console.error("Error al obtener evaluaciones:", error);
        res.status(500).json({ status: 'error', message: 'Error al obtener evaluaciones' });
    }
};

const obtenerTodasLasEvaluaciones = async (req, res) => {
    try {
        const evaluaciones = await diagnosticoService.obtenerTodasLasEvaluaciones();
        res.status(200).json({ status: 'success', data: evaluaciones });
    } catch (error) {
        console.error("Error al obtener evaluaciones globales:", error);
        res.status(500).json({ status: 'error', message: 'Error al obtener evaluaciones globales' });
    }
};

const agregarFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;
        await diagnosticoService.agregarFeedback(id, feedback);

        const id_admin = req.usuario?.id_usuario || 1;
        await auditService.registrarAccion(id_admin, 'EVALUAR_DIAGNOSTICO', `Se agregó retroalimentación manual a la evaluación ID: ${id}`);

        res.status(200).json({ status: 'success', message: 'Feedback agregado correctamente' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al agregar feedback' });
    }
};

const invalidarEvaluacion = async (req, res) => {
    try {
        const { id } = req.params;
        await diagnosticoService.invalidarEvaluacion(id);

        const id_admin = req.usuario?.id_usuario || 1;
        await auditService.registrarAccion(id_admin, 'ELIMINAR_EVALUACION', `Se invalidó la evaluación ID: ${id}`);

        res.status(200).json({ status: 'success', message: 'Evaluación invalidada' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    registrarEvaluacion,
    listarCatalogos,
    editarPatologia,
    eliminarPatologia,
    obtenerEvaluacionesPorCurso,
    obtenerTodasLasEvaluaciones,
    agregarFeedback,
    invalidarEvaluacion
};