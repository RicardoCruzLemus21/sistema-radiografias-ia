// sp_registrar_usuario siempre marca debe_cambiar_contrasena = TRUE (pensado para cuentas
// creadas por un admin con clave temporal). Un docente que se registra solo elige su propia
// clave, así que este SP la deja como definitiva.
const pool = require('../src/config/database');

(async () => {
    try {
        await pool.query('DROP PROCEDURE IF EXISTS sp_marcar_clave_definitiva');
        await pool.query(`CREATE PROCEDURE sp_marcar_clave_definitiva(IN p_id_usuario INT)
        BEGIN
            UPDATE Usuarios SET debe_cambiar_contrasena = FALSE WHERE id_usuario = p_id_usuario;
        END`);
        console.log('✅ sp_marcar_clave_definitiva creado.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();
