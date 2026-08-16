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

module.exports = {
    registrarEvaluacion,
    listarCatalogos
};