const adminService = require('../services/adminService');

const resumenGlobal = async (req, res) => {
    try {
        const resumen = await adminService.obtenerResumenGlobal();
        res.status(200).json({ status: 'success', data: resumen });
    } catch (error) {
        console.error('Error al obtener el resumen global:', error);
        res.status(500).json({ status: 'error', message: 'No se pudo cargar el resumen del sistema.' });
    }
};

module.exports = {
    resumenGlobal
};
