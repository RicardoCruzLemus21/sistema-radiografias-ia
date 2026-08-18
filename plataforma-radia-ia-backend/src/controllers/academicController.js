const academicService = require('../services/academicService');

const crear = async (req, res) => {
    try {
        const curso = await academicService.crearCurso(req.body);
        res.status(201).json({ status: 'success', data: curso });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const asignar = async (req, res) => {
    try {
        const asignacion = await academicService.asignarEstudiante(req.body);
        res.status(201).json({ status: 'success', message: 'Estudiante matriculado', data: asignacion });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const listarMisCursos = async (req, res) => {
    try {
        const id_catedratico = req.usuario.id_usuario; 
        const cursos = await academicService.obtenerCursosCatedratico(id_catedratico);
        res.status(200).json({ status: 'success', data: cursos });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener los cursos' });
    }
};

const listarEstudiantes = async (req, res) => {
    try {
        const { id_curso } = req.params;
        const estudiantes = await academicService.obtenerEstudiantesPorCurso(id_curso);
        res.status(200).json({ status: 'success', data: estudiantes });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al listar estudiantes' });
    }
};

const verDashboard = async (req, res) => {
    try {
        const { id_curso } = req.params;
        const estadisticas = await academicService.obtenerEstadisticas(id_curso);
        res.status(200).json({ status: 'success', data: estadisticas });
    } catch (error) {
        // Muestra el mensaje detallado que devuelve MySQL en la respuesta JSON
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const verResumenGeneral = async (req, res) => {
    try {
        const id_catedratico = req.usuario.id_usuario;
        const resumen = await academicService.obtenerResumenGeneral(id_catedratico);
        res.status(200).json({ status: 'success', data: resumen });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const verDetalleEstudiante = async (req, res) => {
    try {
        const { id } = req.params;
        const detalle = await academicService.obtenerDetalleEstudiante(id);
        res.status(200).json({ status: 'success', data: detalle });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const editarEstudiante = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await academicService.editarEstudiante(id, req.body);
        res.status(200).json({ status: 'success', data: resultado });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const eliminarEstudiante = async (req, res) => {
    try {
        const { id } = req.params;
        const id_catedratico = req.usuario.id_usuario;
        await academicService.eliminarEstudiante(id, id_catedratico);
        res.status(200).json({ status: 'success', message: 'Estudiante eliminado de tus secciones correctamente.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const verMiRendimiento = async (req, res) => {
    try {
        const id_estudiante = req.usuario.id_usuario;
        const rendimiento = await academicService.obtenerMiRendimiento(id_estudiante);
        res.status(200).json({ status: 'success', data: rendimiento });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const editarCurso = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await academicService.editarCurso(id, req.body);
        res.status(200).json({ status: 'success', data: resultado });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const eliminarCurso = async (req, res) => {
    try {
        const { id } = req.params;
        const id_catedratico = req.usuario.id_usuario;
        await academicService.eliminarCurso(id, id_catedratico);
        res.status(200).json({ status: 'success', message: 'Curso eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    crear,
    asignar,
    listarMisCursos,
    listarEstudiantes,
    verDashboard,
    verResumenGeneral,
    verDetalleEstudiante,
    editarEstudiante,
    eliminarEstudiante,
    verMiRendimiento,
    editarCurso,
    eliminarCurso
};