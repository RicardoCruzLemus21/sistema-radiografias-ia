const diagnosticoService = require('../services/diagnosticoService');
const db = require('../config/database'); // Importamos la conexión a la base de datos
const { TABLAS, COLUMNAS } = require('../config/dbDictionary'); // Importamos tu Diccionario de Datos

const registrarEvaluacion = async (req, res) => {
    try {
        // req.body ya vendrá parseado como JSON gracias a Express
        const resultado = await diagnosticoService.guardarEvaluacionEstudiante(req.body);
        
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