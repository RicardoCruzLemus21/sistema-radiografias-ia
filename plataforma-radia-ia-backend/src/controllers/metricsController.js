const metricsService = require('../services/metricsService');

const registrarRubrica = async (req, res) => {
    try {
        const resultado = await metricsService.guardarCalificacionRubrica(req.body);
        res.status(201).json({ status: 'success', data: resultado });
    } catch (error) {
        console.error("Error al registrar rúbrica:", error);
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const registrarLikert = async (req, res) => {
    try {
        const resultado = await metricsService.guardarRespuestasLikert(req.body);
        res.status(201).json({ status: 'success', data: resultado });
    } catch (error) {
        console.error("Error al registrar respuestas Likert:", error);
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const listarCatalogosMetricas = async (req, res) => {
    try {
        const catalogos = await metricsService.obtenerCatalogosMetricas();
        res.status(200).json({ status: 'success', data: catalogos });
    } catch (error) {
        console.error("Error al obtener catálogos de métricas:", error);
        res.status(500).json({ status: 'error', message: "Error interno al cargar los catálogos." });
    }
};

const obtenerResultadosLikert = async (req, res) => {
    try {
        const resultados = await metricsService.obtenerResultadosLikert();
        res.status(200).json({ status: 'success', data: resultados });
    } catch (error) {
        console.error("Error al obtener resultados Likert:", error);
        res.status(500).json({ status: 'error', message: "Error interno al cargar los resultados de Likert." });
    }
};

const obtenerCalificacionesEvaluacion = async (req, res) => {
    try {
        const { id_evaluacion } = req.params;
        const calificaciones = await metricsService.obtenerCalificacionesEvaluacion(id_evaluacion);
        res.status(200).json({ status: 'success', data: calificaciones });
    } catch (error) {
        console.error("Error al obtener calificaciones de rúbrica:", error);
        res.status(500).json({ status: 'error', message: "Error interno al cargar las calificaciones." });
    }
};

module.exports = {
    registrarRubrica,
    registrarLikert,
    listarCatalogosMetricas,
    obtenerResultadosLikert,
    obtenerCalificacionesEvaluacion
};