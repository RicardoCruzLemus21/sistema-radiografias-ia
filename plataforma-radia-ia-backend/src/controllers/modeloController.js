const modeloService = require('../services/modeloService');

// Ficha del modelo de IA: estadísticas para entenderlo (docentes y administradores)
const verFichaModelo = async (req, res) => {
    try {
        const ficha = await modeloService.obtenerFichaModelo();
        res.status(200).json({ status: 'success', data: ficha });
    } catch (error) {
        console.error('Error generando la ficha del modelo:', error);
        res.status(500).json({ status: 'error', message: 'No se pudo cargar la ficha del modelo.' });
    }
};

module.exports = { verFichaModelo };
