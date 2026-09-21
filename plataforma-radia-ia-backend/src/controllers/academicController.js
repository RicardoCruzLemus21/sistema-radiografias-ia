const academicService = require('../services/academicService');
const informeService = require('../services/informeService');
const informeEstudianteService = require('../services/informeEstudianteService');
const codigoDocenteService = require('../services/codigoDocenteService');
const auditService = require('../services/auditService');

// Código que el docente comparte con sus estudiantes para que se registren solos
const verMiCodigo = async (req, res) => {
    try {
        const id_docente = req.usuario.id_usuario;
        const codigo = (await codigoDocenteService.obtenerCodigo(id_docente)) || (await codigoDocenteService.asignarCodigoNuevo(id_docente));
        res.status(200).json({ status: 'success', data: { codigo_docente: codigo } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'No se pudo obtener tu código de docente.' });
    }
};

// Invalida el código anterior (por si se filtró) y genera uno nuevo
const regenerarMiCodigo = async (req, res) => {
    try {
        const id_docente = req.usuario.id_usuario;
        const codigo = await codigoDocenteService.asignarCodigoNuevo(id_docente);
        await auditService.registrarAccion(id_docente, 'REGENERAR_CODIGO_DOCENTE', 'El docente regeneró su código de registro para estudiantes');
        res.status(200).json({ status: 'success', data: { codigo_docente: codigo } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'No se pudo regenerar tu código de docente.' });
    }
};

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

const listarCursosDeCatedratico = async (req, res) => {
    try {
        const { id_catedratico } = req.params;
        const cursos = await academicService.obtenerCursosCatedratico(id_catedratico);
        res.status(200).json({ status: 'success', data: cursos });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener los cursos del catedrático' });
    }
};

const listarCatalogoCursos = async (req, res) => {
    try {
        const catalogo = await academicService.obtenerCatalogoCursos();
        res.status(200).json({ status: 'success', data: catalogo });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener el catálogo de cursos' });
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

// Ejercicios de los cursos del docente (para elegirlos en el informe)
const listarEjerciciosDocente = async (req, res) => {
    try {
        const ejercicios = await informeService.obtenerEjerciciosDocente(req.usuario.id_usuario);
        res.status(200).json({ status: 'success', data: ejercicios });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener los ejercicios' });
    }
};

// Informe PDF de calificaciones por ejercicio o conjunto de ejercicios. Se sirve "inline" para verlo/imprimirlo en el visor del navegador.
const descargarInformeCalificaciones = async (req, res) => {
    try {
        const { id_curso, ejercicios } = req.query;
        const ids = typeof ejercicios === 'string' ? ejercicios.split(',').map(s => s.trim()).filter(Boolean) : [];
        const { buffer, nombreArchivo } = await informeService.generarInformePdf({
            id_docente: req.usuario.id_usuario,
            nombre_docente: req.usuario.nombre_completo || req.usuario.nombre,
            id_curso,
            ids_ejercicios: ids
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    } catch (error) {
        const esDeUsuario = error instanceof informeService.ErrorInforme;
        if (!esDeUsuario) console.error('Error generando el informe PDF:', error);
        res.status(esDeUsuario ? 400 : 500).json({ status: 'error', message: esDeUsuario ? error.message : 'No se pudo generar el informe.' });
    }
};

// Informe PDF individual de un estudiante (evolución del diagnóstico). Opcional: ?ejercicios=1,2 para limitarlo.
const descargarInformeEstudiante = async (req, res) => {
    try {
        const ejercicios = typeof req.query.ejercicios === 'string' ? req.query.ejercicios.split(',').map(s => s.trim()).filter(Boolean) : [];
        const { buffer, nombreArchivo } = await informeEstudianteService.generarInformeEstudiantePdf({
            id_docente: req.usuario.id_usuario,
            nombre_docente: req.usuario.nombre_completo || req.usuario.nombre,
            id_estudiante: req.params.id,
            ids_ejercicios: ejercicios
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    } catch (error) {
        const esDeUsuario = error instanceof informeService.ErrorInforme;
        if (!esDeUsuario) console.error('Error generando el informe individual:', error);
        res.status(esDeUsuario ? 400 : 500).json({ status: 'error', message: esDeUsuario ? error.message : 'No se pudo generar el informe.' });
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
    verMiCodigo,
    regenerarMiCodigo,
    crear,
    asignar,
    listarMisCursos,
    listarEjerciciosDocente,
    descargarInformeCalificaciones,
    descargarInformeEstudiante,
    listarEstudiantes,
    verDashboard,
    verResumenGeneral,
    verDetalleEstudiante,
    editarEstudiante,
    eliminarEstudiante,
    verMiRendimiento,
    editarCurso,
    eliminarCurso,
    listarCursosDeCatedratico,
    listarCatalogoCursos
};