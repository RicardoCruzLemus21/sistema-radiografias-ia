 
const iaService = require('../services/iaService');

const registrarInferenciaIA = async (req, res) => {
    try {
        const resultado = await iaService.procesarResultadoYConcordancia(req.body);
        
        res.status(201).json({
            status: 'success',
            data: resultado
        });
    } catch (error) {
        console.error("Error en el Motor de IA:", error);
        res.status(400).json({
            status: 'error',
            message: error.message || "Ocurrió un error al procesar la inferencia del modelo y la concordancia."
        });
    }
};

module.exports = {
    registrarInferenciaIA
};