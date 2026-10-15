const pool = require('../config/database');

const agregarComentario = async (id_evaluacion, id_catedratico, comentario) => {
    try {
        const [resultado] = await pool.query('CALL sp_comentario_crear(?, ?, ?)', [id_evaluacion, id_catedratico, comentario]);
        return { id_comentario: resultado[0][0].id_comentario, id_evaluacion, comentario };
    } catch (error) {
        throw error;
    }
};

const obtenerComentariosEvaluacion = async (id_evaluacion) => {
    try {
        const [comentarios] = await pool.query('CALL sp_comentarios_listar_evaluacion(?)', [id_evaluacion]);
        return comentarios[0];
    } catch (error) {
        throw error;
    }
};

module.exports = {
    agregarComentario,
    obtenerComentariosEvaluacion
};
