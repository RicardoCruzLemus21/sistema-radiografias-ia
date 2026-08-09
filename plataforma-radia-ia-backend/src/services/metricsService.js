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
            const query = `
                INSERT INTO ${dict.TABLAS.CALIFICACIONES} 
                (${dict.COLUMNAS.ID_EVALUACION}, ${dict.COLUMNAS.ID_CRITERIO}, ${dict.COLUMNAS.PUNTAJE_OBTENIDO}) 
                VALUES ?
            `;
            const valores = calificaciones.map(c => [id_evaluacion, c.id_criterio, c.puntaje_obtenido]);
            await connection.query(query, [valores]);
        }

        await connection.commit();
        connection.release();

        return {
            id_evaluacion,
            criterios_evaluados: calificaciones.length,
            mensaje: "Calificaciones de rúbrica guardadas exitosamente."
        };
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

// 2. Guardar las respuestas de la encuesta Likert (Variable 3)
const guardarRespuestasLikert = async (bodyData) => {
    const { id_cuestionario, id_estudiante, respuestas } = bodyData;
    // respuestas será un array: [{ dimension_evaluada: 'Educativa', puntaje: 4 }, ...]

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (respuestas && respuestas.length > 0) {
            const query = `
                INSERT INTO ${dict.TABLAS.RESPUESTAS_LIKERT} 
                (${dict.COLUMNAS.ID_CUESTIONARIO}, ${dict.COLUMNAS.ID_ESTUDIANTE}, ${dict.COLUMNAS.DIMENSION_EVALUADA}, ${dict.COLUMNAS.PUNTAJE_LIKERT}) 
                VALUES ?
            `;
            const valores = respuestas.map(r => [id_cuestionario, id_estudiante, r.dimension_evaluada, r.puntaje]);
            await connection.query(query, [valores]);
        }

        await connection.commit();
        connection.release();

        return {
            id_estudiante,
            respuestas_registradas: respuestas.length,
            mensaje: "Respuestas del cuestionario Likert registradas para medición científica."
        };
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

const obtenerCatalogosMetricas = async () => {
    const connection = await pool.getConnection();
    try {
        const [rubricas] = await connection.query(`SELECT * FROM ${dict.TABLAS.RUBRICAS}`);
        const [cuestionarios] = await connection.query(`SELECT * FROM ${dict.TABLAS.CUESTIONARIOS}`);
        
        connection.release();
        return { rubricas, cuestionarios };
    } catch (error) {
        connection.release();
        throw error;
    }
};

module.exports = {
    guardarCalificacionRubrica,
    guardarRespuestasLikert,
    obtenerCatalogosMetricas
};