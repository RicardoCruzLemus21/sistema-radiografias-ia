// El check de una notificación la marca como leída y la elimina. Solo borra si la notificación
// pertenece al usuario que lo pide (el endpoint anterior de "marcar leída" actualizaba por id
// sin verificar el dueño). Devuelve cuántas filas se borraron: 0 = no existe o no es suya.
const pool = require('../src/config/database');

(async () => {
    try {
        await pool.query('DROP PROCEDURE IF EXISTS sp_eliminar_notificacion');
        await pool.query(`CREATE PROCEDURE sp_eliminar_notificacion(IN p_id_notificacion INT, IN p_id_usuario INT)
        BEGIN
            DELETE FROM Notificaciones WHERE id_notificacion = p_id_notificacion AND id_usuario_destino = p_id_usuario;
            SELECT ROW_COUNT() AS filas;
        END`);
        console.log('✅ sp_eliminar_notificacion creado.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();
