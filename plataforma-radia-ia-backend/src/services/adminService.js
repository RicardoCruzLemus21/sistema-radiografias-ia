const pool = require('../config/database');

// KPIs globales para el Panel de Administración
const obtenerResumenGlobal = async () => {
    const [resultado] = await pool.query('CALL sp_admin_resumen_global()');
    return resultado[0][0];
};

module.exports = {
    obtenerResumenGlobal
};
