const pool = require('../config/database');
const dict = require('../config/dbDictionary');

// 1. Guardar las calificaciones de la rúbrica del estudiante
const guardarCalificacionRubrica = async (bodyData) => {
    const { id_evaluacion, calificaciones } = bodyData;
    // calificaciones será un array: [{ id_criterio: 1, puntaje_obtenido: 5 }, ...]

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (calificaciones && calificaciones.length > 0) {
            for (const c of calificaciones) {
                await connection.query('CALL sp_guardar_calificacion_rubrica(?, ?, ?)', [id_evaluacion, c.id_criterio, c.puntaje_obtenido]);
            }
        }

        await connection.commit();

        return {
            id_evaluacion,
            criterios_evaluados: calificaciones.length,
            mensaje: "Calificaciones de rúbrica guardadas exitosamente."
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// 3. Obtener las calificaciones de rúbrica ya guardadas para una evaluación (o los criterios vacíos si aún no se calificó)
const obtenerCalificacionesEvaluacion = async (id_evaluacion) => {
    const [rows] = await pool.query('CALL sp_obtener_calificaciones_evaluacion(?)', [id_evaluacion]);
    return rows[0];
};

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
    guardarCalificacionRubrica,
    obtenerCatalogosMetricas,
    obtenerCalificacionesEvaluacion
};