const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const obtenerCatalogosMetricas = async () => {
    try {
        const [rubricasArray] = await pool.query('CALL sp_obtener_catalogo_rubricas()');
        const [cuestionariosArray] = await pool.query('CALL sp_obtener_catalogo_cuestionarios()');
        
        return { rubricas: rubricasArray[0], cuestionarios: cuestionariosArray[0] };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    obtenerCatalogosMetricas
};