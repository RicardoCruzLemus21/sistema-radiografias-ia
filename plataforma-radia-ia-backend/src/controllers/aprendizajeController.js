const aprendizajeService = require('../services/aprendizajeService');
const adminService = require('../services/aprendizajeAdminService');

const estadoError = (error) => (error instanceof aprendizajeService.ErrorAprendizaje ? 400 : 500);
const manejar = (funcion, etiqueta) => async (req, res) => {
    try {
        const data = await funcion(req);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        if (!(error instanceof aprendizajeService.ErrorAprendizaje)) console.error(`Error en aprendizaje (${etiqueta}):`, error);
        res.status(estadoError(error)).json({ status: 'error', message: error instanceof aprendizajeService.ErrorAprendizaje ? error.message : 'No se pudo completar la operación.' });
    }
};

const idEstudiante = (req) => req.usuario.id_usuario;

module.exports = {
    resumen: manejar((req) => aprendizajeService.obtenerResumen(idEstudiante(req)), 'resumen'),
    leccion: manejar((req) => aprendizajeService.obtenerLeccion(req.params.clase), 'lección'),
    marcarPaso: manejar(async (req) => { await aprendizajeService.marcarPaso(idEstudiante(req), req.params.clase, req.body?.paso); return { ok: true }; }, 'paso'),
    comparador: manejar((req) => aprendizajeService.obtenerComparador(idEstudiante(req), req.query.clase, req.query.contra), 'comparador'),
    sesion: manejar((req) => aprendizajeService.obtenerSesionGuiada(idEstudiante(req), req.params.clase), 'sesión'),
    responder: manejar((req) => aprendizajeService.responder(idEstudiante(req), req.body || {}), 'responder'),
    repaso: manejar((req) => aprendizajeService.obtenerRepaso(idEstudiante(req)), 'repaso'),
    misErrores: manejar((req) => aprendizajeService.obtenerMisErrores(idEstudiante(req)), 'mis errores'),

    // Docente / administrador: revisión del contenido de aprendizaje
    listarLecciones: manejar(() => adminService.listarLecciones(), 'lecciones'),
    guardarLeccion: manejar((req) => adminService.guardarLeccion(req.params.clase, req.body?.contenido, req.body?.estado, req.usuario.id_usuario), 'guardar lección'),
    listarExplicaciones: manejar((req) => adminService.listarExplicaciones(req.query.estado), 'explicaciones'),
    revisarExplicacion: manejar((req) => adminService.revisarExplicacion(req.params.id, req.body?.contenido, req.body?.estado, req.usuario.id_usuario), 'revisar explicación'),
    generarExplicaciones: manejar((req) => adminService.generarExplicaciones(req.body?.limite), 'generar explicaciones'),
    regenerarExplicacion: manejar((req) => adminService.regenerarExplicacion(req.params.id, req.usuario.id_usuario), 'regenerar explicación')
};
