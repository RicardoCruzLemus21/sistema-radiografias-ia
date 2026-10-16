const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const listarUsuarios = async () => {
    const [usuarios] = await pool.query('CALL sp_listar_usuarios_completos()');
    return usuarios[0];
};

const editarUsuario = async (id, datos) => {
    const { nombre_completo, email, password, id_rol, carnet } = datos;

    try {
        if (password) {
            const contrasena_hash = await bcrypt.hash(password, 10);
            await pool.query('CALL sp_editar_usuario_con_password(?, ?, ?, ?, ?, ?)', [id, carnet, nombre_completo, email, contrasena_hash, id_rol]);
        } else {
            await pool.query('CALL sp_editar_usuario_sin_password(?, ?, ?, ?, ?)', [id, carnet, nombre_completo, email, id_rol]);
        }
        return true;
    } catch (error) {
        // El SP protege al ultimo administrador con un SIGNAL propio (sqlState 45000);
        // ese mensaje si se le muestra al usuario, cualquier otro error queda generico.
        if (error.sqlState === '45000') throw new Error(error.sqlMessage);
        throw new Error('No se pudo actualizar el usuario.');
    }
};

const eliminarUsuario = async (id) => {
    try {
        await pool.query('CALL sp_eliminar_usuario(?)', [id]);
        return true;
    } catch (error) {
        if (error.sqlState === '45000') throw new Error(error.sqlMessage);
        throw new Error('No se puede eliminar el usuario porque tiene registros asociados (casos o evaluaciones).');
    }
};

module.exports = {
    listarUsuarios,
    editarUsuario,
    eliminarUsuario
};
