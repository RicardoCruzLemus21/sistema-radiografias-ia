const clinicalService = require('../services/clinicalService');
const db = require('../config/database'); // <-- Ahora sí coincide con tu database.js
const { TABLAS, COLUMNAS } = require('../config/dbDictionary'); // <-- Ahora coincide con tu dbDictionary.js

const registrarPaciente = async (req, res) => {
    try {
        const paciente = await clinicalService.crearPaciente(req.body);
        res.status(201).json({ status: 'success', data: paciente });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const armarCaso = async (req, res) => {
    try {
        const caso = await clinicalService.crearCaso(req.body);
        res.status(201).json({ status: 'success', data: caso });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const subirImagenRad = async (req, res) => {
    try {
        // Multer procesa el archivo y lo mete en req.file
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No se proporcionó ninguna imagen' });
        }

        const { id_caso, tipo_proyeccion } = req.body;
        
        // Convertimos las diagonales invertidas de Windows a normales para la web
        const ruta_imagen = req.file.path.replace(/\\/g, '/');

        const radiografia = await clinicalService.guardarRadiografia(id_caso, tipo_proyeccion, ruta_imagen);
        
        res.status(201).json({ 
            status: 'success', 
            message: 'Radiografía subida y registrada exitosamente',
            data: radiografia 
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// NUEVA FUNCIÓN: Obtener la Worklist para el estudiante usando el Diccionario de Datos
const obtenerWorklist = async (req, res) => {
    try {
        // Hacemos un JOIN dinámico utilizando estrictamente el Diccionario de Datos
        const query = `
            SELECT 
                c.${COLUMNAS.ID_CASO} AS id, 
                p.${COLUMNAS.CODIGO_PACIENTE} AS paciente, 
                p.${COLUMNAS.EDAD}, 
                c.${COLUMNAS.TITULO_CASO} AS estudio, 
                DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d') AS fecha,
                'Pendiente' AS estado
            FROM ${TABLAS.CASOS} c
            JOIN ${TABLAS.PACIENTES} p ON c.${COLUMNAS.ID_PACIENTE} = p.${COLUMNAS.ID_PACIENTE}
        `;
        
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo la Worklist:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    registrarPaciente,
    armarCaso,
    subirImagenRad,
    obtenerWorklist // <-- No olvides exportar la nueva función aquí
};