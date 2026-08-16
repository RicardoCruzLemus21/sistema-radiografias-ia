const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const agregarComentario = async (id_evaluacion, id_catedratico, comentario) => {
    try {
        const query = `
            INSERT INTO ${dict.TABLAS.COMENTARIOS} 
            (${dict.COLUMNAS.ID_EVALUACION}, id_catedratico, ${dict.COLUMNAS.COMENTARIO}) 
            VALUES (?, ?, ?)
        `;
        const [resultado] = await pool.query(query, [id_evaluacion, id_catedratico, comentario]);
        return { id_comentario: resultado.insertId, id_evaluacion, comentario };
    } catch (error) {
        throw error;
    }
};

const obtenerComentariosEvaluacion = async (id_evaluacion) => {
    try {
        const query = `
            SELECT c.*, u.${dict.COLUMNAS.NOMBRE_COMPLETO} AS catedratico
            FROM ${dict.TABLAS.COMENTARIOS} c
            INNER JOIN ${dict.TABLAS.USUARIOS} u ON c.id_catedratico = u.${dict.COLUMNAS.ID_USUARIO}
            WHERE c.${dict.COLUMNAS.ID_EVALUACION} = ?
            ORDER BY c.${dict.COLUMNAS.FECHA_COMENTARIO} ASC
        `;
        const [comentarios] = await pool.query(query, [id_evaluacion]);
        return comentarios;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    agregarComentario,
    obtenerComentariosEvaluacion
};
