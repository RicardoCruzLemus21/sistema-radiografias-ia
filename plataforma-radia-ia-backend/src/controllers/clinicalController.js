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
        const id_estudiante = req.usuario.id_usuario;
        
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
            INNER JOIN ${TABLAS.ASIGNACIONES} ae ON c.${COLUMNAS.ID_CURSO} = ae.${COLUMNAS.ID_CURSO}
            WHERE ae.${COLUMNAS.ID_ESTUDIANTE} = ?
        `;
        
        const [rows] = await db.query(query, [id_estudiante]);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo la Worklist:', error);
        res.status(500).json({ error: error.message });
    }
};

const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');

const crearCasoCompleto = async (req, res) => {
    try {
        let ruta_imagen = '/uploads/radiografias/rx-default.jpg';
        if (req.file) {
            ruta_imagen = `/uploads/radiografias/${req.file.filename}`;
        } else if (req.body.ruta_imagen) {
            ruta_imagen = req.body.ruta_imagen;
        }

        const id_catedratico = req.usuario?.id_usuario || 1; // Fallback
        const datosCompletos = {
            ...req.body,
            ruta_imagen,
            id_catedratico
        };

        const resultado = await clinicalService.crearCasoCompleto(datosCompletos);

        // EXTRA: Auditoría y Notificaciones
        await auditService.registrarAccion(id_catedratico, 'CREAR_CASO', `Se creó el caso clínico: ${resultado.titulo_caso}`);
        
        // Notificar solo a los estudiantes asignados al curso donde se subió el caso
        try {
            const queryEstudiantes = `
                SELECT ae.${COLUMNAS.ID_ESTUDIANTE} AS id_usuario
                FROM ${TABLAS.ASIGNACIONES} ae
                WHERE ae.${COLUMNAS.ID_CURSO} = ?
            `;
            const [estudiantes] = await db.query(queryEstudiantes, [resultado.id_curso]);
            if (estudiantes.length > 0) {
                const ids = estudiantes.map(e => e.id_usuario);
                await notificationService.enviarNotificacionMasiva(ids, 'Nuevo Caso Clínico', `El catedrático ha publicado el caso: ${resultado.titulo_caso}. Ingresa a tu Worklist para resolverlo.`);
            }
        } catch (e) {
            console.error("Error notificando estudiantes:", e);
        }

        res.status(201).json({ status: 'success', data: resultado });
    } catch (error) {
        console.error('Error al crear caso completo:', error);
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const listarCasosCatedratico = async (req, res) => {
    try {
        const id_catedratico = req.usuario.id_usuario;
        const casos = await clinicalService.obtenerCasosDetallados(id_catedratico);
        res.status(200).json({ status: 'success', data: casos });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const obtenerCasoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const caso = await clinicalService.obtenerDetalleCaso(id);
        res.status(200).json({ status: 'success', data: caso });
    } catch (error) {
        res.status(404).json({ status: 'error', message: error.message });
    }
};

const obtenerSiguienteCodigoPaciente = async (req, res) => {
    try {
        const codigo = await clinicalService.obtenerSiguienteCodigoPaciente();
        res.status(200).json({ status: 'success', data: codigo });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const editarCaso = async (req, res) => {
    try {
        const { id } = req.params;
        await clinicalService.editarCaso(id, req.body);
        res.status(200).json({ status: 'success', message: 'Caso clínico actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const eliminarCaso = async (req, res) => {
    try {
        const { id } = req.params;
        await clinicalService.eliminarCaso(id);
        res.status(200).json({ status: 'success', message: 'Caso clínico eliminado correctamente' });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    registrarPaciente,
    armarCaso,
    subirImagenRad,
    obtenerWorklist,
    crearCasoCompleto,
    listarCasosCatedratico,
    obtenerCasoPorId,
    obtenerSiguienteCodigoPaciente,
    editarCaso,
    eliminarCaso
};