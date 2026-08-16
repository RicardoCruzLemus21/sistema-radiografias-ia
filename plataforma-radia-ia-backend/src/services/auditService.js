const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const registrarAccion = async (id_usuario, accion, detalle) => {
    try {
        const query = `
            INSERT INTO ${dict.TABLAS.AUDITORIA_ACCIONES} 
            (${dict.COLUMNAS.ID_USUARIO}, ${dict.COLUMNAS.ACCION}, ${dict.COLUMNAS.DETALLE}) 
            VALUES (?, ?, ?)
        `;
        const [resultado] = await pool.query(query, [id_usuario, accion, detalle]);
        return { id_auditoria: resultado.insertId };
    } catch (error) {
        console.error('Error registrando auditoría:', error);
        // No lanzamos error para no bloquear el flujo principal si falla el log
    }
};

const obtenerLogs = async (limite = 50) => {
    const query = `
        SELECT a.*, u.${dict.COLUMNAS.NOMBRE_COMPLETO}
        FROM ${dict.TABLAS.AUDITORIA_ACCIONES} a
        INNER JOIN ${dict.TABLAS.USUARIOS} u ON a.${dict.COLUMNAS.ID_USUARIO} = u.${dict.COLUMNAS.ID_USUARIO}
        ORDER BY a.${dict.COLUMNAS.FECHA_ACCION} DESC
        LIMIT ?
    `;
    const [logs] = await pool.query(query, [limite]);
    return logs;
};

module.exports = {
    registrarAccion,
    obtenerLogs
};
