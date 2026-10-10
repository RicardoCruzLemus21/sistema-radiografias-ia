const metricsService = require('../services/metricsService');

const listarCatalogosMetricas = async (req, res) => {
    try {
        const catalogos = await metricsService.obtenerCatalogosMetricas();
        res.status(200).json({ status: 'success', data: catalogos });
    } catch (error) {
        console.error("Error al obtener catálogos de métricas:", error);
        res.status(500).json({ status: 'error', message: "Error interno al cargar los catálogos." });
    }
};

module.exports = {
    listarCatalogosMetricas
};