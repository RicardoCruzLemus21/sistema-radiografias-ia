const pool = require('../config/database');
const dict = require('../config/dbDictionary');
const bcrypt = require('bcryptjs');

const listarUsuarios = async () => {
    const [usuarios] = await pool.query('CALL sp_listar_usuarios_completos()');
    return usuarios[0];
};

const editarUsuario = async (id, datos) => {
    const { nombre_completo, email, password, id_rol, carnet } = datos;

    if (password) {
        const contrasena_hash = await bcrypt.hash(password, 10);
        await pool.query('CALL sp_editar_usuario_con_password(?, ?, ?, ?, ?, ?)', [id, carnet, nombre_completo, email, contrasena_hash, id_rol]);
    } else {
        await pool.query('CALL sp_editar_usuario_sin_password(?, ?, ?, ?, ?)', [id, carnet, nombre_completo, email, id_rol]);
    }

    return true;
};

const eliminarUsuario = async (id) => {
    try {
        await pool.query('CALL sp_eliminar_usuario(?)', [id]);
        return true;
    } catch (error) {
        throw new Error('No se puede eliminar el usuario porque tiene registros asociados (casos o evaluaciones).');
    }
};

module.exports = {
    listarUsuarios,
    editarUsuario,
    eliminarUsuario
};
