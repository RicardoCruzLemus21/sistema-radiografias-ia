const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const crearNotificacion = async (id_usuario_destino, titulo, mensaje) => {
    try {
        const query = `
            INSERT INTO ${dict.TABLAS.NOTIFICACIONES} 
            (${dict.COLUMNAS.ID_USUARIO_DESTINO}, ${dict.COLUMNAS.TITULO}, ${dict.COLUMNAS.MENSAJE}) 
            VALUES (?, ?, ?)
        `;
        const [resultado] = await pool.query(query, [id_usuario_destino, titulo, mensaje]);
        return { id_notificacion: resultado.insertId };
    } catch (error) {
        console.error('Error creando notificación:', error);
    }
};

const enviarNotificacionMasiva = async (ids_usuarios, titulo, mensaje) => {
    if (!ids_usuarios || ids_usuarios.length === 0) return;
    try {
        const valores = ids_usuarios.map(id => [id, titulo, mensaje]);
        const query = `
            INSERT INTO ${dict.TABLAS.NOTIFICACIONES} 
            (${dict.COLUMNAS.ID_USUARIO_DESTINO}, ${dict.COLUMNAS.TITULO}, ${dict.COLUMNAS.MENSAJE}) 
            VALUES ?
        `;
        await pool.query(query, [valores]);
    } catch (error) {
        console.error('Error enviando notificación masiva:', error);
    }
};

const obtenerNotificaciones = async (id_usuario) => {
    const query = `
        SELECT * FROM ${dict.TABLAS.NOTIFICACIONES} 
        WHERE ${dict.COLUMNAS.ID_USUARIO_DESTINO} = ? 
        ORDER BY ${dict.COLUMNAS.FECHA_CREACION} DESC
    `;
    const [notificaciones] = await pool.query(query, [id_usuario]);
    return notificaciones;
};

const marcarComoLeida = async (id_notificacion) => {
    const query = `
        UPDATE ${dict.TABLAS.NOTIFICACIONES} 
        SET ${dict.COLUMNAS.LEIDA} = TRUE 
        WHERE ${dict.COLUMNAS.ID_NOTIFICACION} = ?
    `;
    await pool.query(query, [id_notificacion]);
    return { success: true };
};

module.exports = {
    crearNotificacion,
    enviarNotificacionMasiva,
    obtenerNotificaciones,
    marcarComoLeida
};
