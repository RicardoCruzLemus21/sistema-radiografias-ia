const clinicalService = require('../services/clinicalService');
const db = require('../config/database'); // <-- Ahora sí coincide con tu database.js

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
        
        // El estado (Pendiente/Completado) y el ejercicio se resuelven en el SP
        const [resultado] = await db.query('CALL sp_obtener_worklist_estudiante(?)', [id_estudiante]);
        const rows = resultado[0];
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo la Worklist:', error);
        res.status(500).json({ error: error.message });
    }
};

const notificationService = require('../services/notificationService');

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

const obtenerCasoEstudiante = async (req, res) => {
    try {
        const { id } = req.params;
        const caso = await clinicalService.obtenerCasoEstudianteSeguro(id);
        res.status(200).json({ status: 'success', data: caso });
    } catch (error) {
        res.status(404).json({ status: 'error', message: error.message });
    }
};

// Retroalimentación de un caso que el estudiante ya respondió (404 si todavía no)
const obtenerRetroalimentacion = async (req, res) => {
    try {
        const idCaso = Number(req.params.id);
        if (!Number.isInteger(idCaso) || idCaso <= 0) return res.status(400).json({ status: 'error', message: 'Caso no válido.' });
        const datos = await clinicalService.obtenerRetroalimentacionEstudiante(req.usuario.id_usuario, idCaso);
        if (!datos) return res.status(404).json({ status: 'error', message: 'Todavía no has respondido este caso.' });
        res.status(200).json({ status: 'success', data: datos });
    } catch (error) {
        console.error('Error obteniendo la retroalimentación:', error);
        res.status(500).json({ status: 'error', message: 'No se pudo cargar la retroalimentación.' });
    }
};

const registrarRespuesta = async (req, res) => {
    try {
        // El estudiante se toma del token: un id enviado en el cuerpo se ignora (evita guardar respuestas a nombre de otro usuario)
        const resultadoFase2y3 = await clinicalService.guardarRespuestaEstudiante({ ...req.body, id_estudiante: req.usuario.id_usuario });
        notificationService.notificarProgresoDelEstudiante(req.usuario.id_usuario, req.body.id_caso);
        res.status(200).json({ status: 'success', data: resultadoFase2y3 });
    } catch (error) {
        if (!(error instanceof clinicalService.ErrorNegocio)) console.error('Error registrando respuesta:', error);
        res.status(estadoError(error)).json({ status: 'error', message: error.message });
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

const obtenerInfoPatologiaIA = async (req, res) => {
    try {
        const { patologia } = req.params;
        const infoJSON = await clinicalService.generarInfoPatologia(patologia);
        res.status(200).json({ status: 'success', data: infoJSON });
    } catch (error) {
        // "No encontrada" / "aún no generada" son estados esperados, no fallos del servidor:
        // usamos 404 para que el interceptor global no dispare la alerta genérica de "Error de Servidor".
        const esContenidoNoDisponible = error.message.includes('no ha sido generado') || error.message.includes('no encontrada en el catálogo');
        res.status(esContenidoNoDisponible ? 404 : 500).json({ status: 'error', message: error.message });
    }
};

const estadoError = (error) => (error instanceof clinicalService.ErrorNegocio ? 400 : 500);

const asignarCasosBanco = async (req, res) => {
    try {
        const { id_curso, ids_casos } = req.body;
        if (!id_curso || !Array.isArray(ids_casos)) {
            return res.status(400).json({ status: 'error', message: 'Datos incompletos' });
        }
        if (!(await clinicalService.verificarCursoDelDocente(req.usuario.id_usuario, id_curso))) {
            return res.status(403).json({ status: 'error', message: 'Ese curso no te pertenece.' });
        }
        const resultado = await clinicalService.asignarCasosBanco(Number(id_curso), ids_casos);
        // Avisa a los estudiantes del curso (sin esperar: si algo falla al notificar, el ejercicio ya quedó publicado)
        notificationService.notificarEjercicioPublicado(Number(id_curso), resultado.nombre, resultado.ids_casos.length);
        res.status(200).json({ status: 'success', data: resultado });
    } catch (error) {
        res.status(estadoError(error)).json({ status: 'error', message: error.message });
    }
};

const componerEjercicio = async (req, res) => {
    try {
        const { id_curso } = req.body || {};
        if (id_curso && !(await clinicalService.verificarCursoDelDocente(req.usuario.id_usuario, id_curso))) {
            return res.status(403).json({ status: 'error', message: 'Ese curso no te pertenece.' });
        }
        const resultado = await clinicalService.componerEjercicio(req.body || {});
        res.status(200).json({ status: 'success', data: resultado });
    } catch (error) {
        res.status(error instanceof clinicalService.ErrorNegocio ? 400 : 500).json({ status: 'error', message: error.message });
    }
};

const obtenerDisponibilidadBanco = async (req, res) => {
    try {
        const { nivel_dificultad, id_curso } = req.query;
        if (id_curso && !(await clinicalService.verificarCursoDelDocente(req.usuario.id_usuario, id_curso))) {
            return res.status(403).json({ status: 'error', message: 'Ese curso no te pertenece.' });
        }
        const disponibilidad = await clinicalService.obtenerDisponibilidadBanco({ nivel_dificultad, id_curso });
        res.status(200).json({ status: 'success', data: disponibilidad });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const obtenerMetricasModelo = async (req, res) => {
    try {
        const metricas = await clinicalService.obtenerMetricasModelo();
        res.status(200).json({ status: 'success', data: metricas });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const obtenerEstadisticasEstudiante = async (req, res) => {
    try {
        const id_estudiante = req.usuario.id_usuario;
        const estadisticas = await clinicalService.obtenerEstadisticasEstudiante(id_estudiante);
        res.status(200).json({ status: 'success', data: estadisticas });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const progresoEjercicios = async (req, res) => {
    try {
        const ejercicios = await clinicalService.obtenerProgresoEjercicios(req.usuario.id_usuario);
        res.status(200).json({ status: 'success', data: ejercicios });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'No se pudo cargar el progreso de los ejercicios.' });
    }
};

const bitacoraEjercicio = async (req, res) => {
    try {
        const id_ejercicio = Number(req.params.id);
        if (!Number.isInteger(id_ejercicio) || id_ejercicio <= 0) {
            return res.status(400).json({ status: 'error', message: 'Ejercicio no válido.' });
        }
        const alumnos = await clinicalService.obtenerBitacoraEjercicio(id_ejercicio, req.usuario.id_usuario);
        res.status(200).json({ status: 'success', data: alumnos });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'No se pudo cargar la bitácora del ejercicio.' });
    }
};

const visibilidadEjercicio = async (req, res) => {
    try {
        const id_ejercicio = Number(req.params.id);
        if (!Number.isInteger(id_ejercicio) || id_ejercicio <= 0) {
            return res.status(400).json({ status: 'error', message: 'Ejercicio no válido.' });
        }
        if (typeof req.body?.oculto !== 'boolean') {
            return res.status(400).json({ status: 'error', message: 'Indica si el ejercicio se oculta (true) o se muestra (false).' });
        }
        const ok = await clinicalService.cambiarVisibilidadEjercicio(id_ejercicio, req.usuario.id_usuario, req.body.oculto);
        if (!ok) return res.status(404).json({ status: 'error', message: 'El ejercicio no existe en tus cursos.' });
        res.status(200).json({ status: 'success', data: { id_ejercicio, oculto: req.body.oculto } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'No se pudo cambiar la visibilidad del ejercicio.' });
    }
};

module.exports = {
    visibilidadEjercicio,
    progresoEjercicios,
    bitacoraEjercicio,
    registrarPaciente,
    armarCaso,
    subirImagenRad,
    obtenerWorklist,
    listarCasosCatedratico,
    obtenerCasoPorId,
    obtenerCasoEstudiante,
    registrarRespuesta,
    obtenerRetroalimentacion,
    obtenerSiguienteCodigoPaciente,
    editarCaso,
    eliminarCaso,
    obtenerInfoPatologiaIA,
    asignarCasosBanco,
    componerEjercicio,
    obtenerDisponibilidadBanco,
    obtenerMetricasModelo,
    obtenerEstadisticasEstudiante
};
