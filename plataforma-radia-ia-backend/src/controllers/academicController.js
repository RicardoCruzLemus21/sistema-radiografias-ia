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

module.exports = {
    crear,
    asignar,
    listarMisCursos,
    listarEstudiantes,
    verDashboard
};