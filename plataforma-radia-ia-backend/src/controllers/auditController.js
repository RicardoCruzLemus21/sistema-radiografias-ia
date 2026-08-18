const auditService = require('../services/auditService');

const obtenerLogs = async (req, res) => {
    try {
        const logs = await auditService.obtenerLogs(100);
        res.status(200).json({ status: 'success', data: logs });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener los logs de auditoría.' });
    }
};

module.exports = {
    obtenerLogs
};
