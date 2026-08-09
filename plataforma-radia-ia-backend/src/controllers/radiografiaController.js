const radiografiaService = require('../services/radiografiaService');

const registrarPaciente = async (req, res) => {
    try {
        const resultado = await radiografiaService.registrarPaciente(req.body);
        res.status(201).json({ status: 'success', data: resultado });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const crearCaso = async (req, res) => {
    try {
        const resultado = await radiografiaService.crearCaso(req.body);
        res.status(201).json({ status: 'success', data: resultado });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const uploadRadiografia = async (req, res) => {
    try {
        const resultado = await radiografiaService.procesarSubidaRadiografia(req.file, req.body);
        res.status(200).json({
            status: 'success',
            message: 'Radiografía procesada con éxito por el servidor.',
            data: resultado
        });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    registrarPaciente,
    crearCaso,
    uploadRadiografia
};