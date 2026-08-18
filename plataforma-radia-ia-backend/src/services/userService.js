const pool = require('../config/database');
const dict = require('../config/dbDictionary');
const bcrypt = require('bcryptjs');

const listarUsuarios = async () => {
    const query = `
        SELECT u.${dict.COLUMNAS.ID_USUARIO} AS id, u.${dict.COLUMNAS.NOMBRE_COMPLETO} AS nombre, u.${dict.COLUMNAS.CORREO} AS email, u.id_rol, r.nombre_rol AS rol
        FROM ${dict.TABLAS.USUARIOS} u
        INNER JOIN ${dict.TABLAS.ROLES} r ON u.id_rol = r.id_rol
    `;
    const [usuarios] = await pool.query(query);
    return usuarios;
};

const editarUsuario = async (id, datos) => {
    const { nombre_completo, email, password, id_rol } = datos;
    let query;
    let params;

    if (password) {
        const contrasena_hash = await bcrypt.hash(password, 10);
        query = `UPDATE ${dict.TABLAS.USUARIOS} SET ${dict.COLUMNAS.NOMBRE_COMPLETO} = ?, ${dict.COLUMNAS.CORREO} = ?, contrasena_hash = ?, id_rol = ? WHERE ${dict.COLUMNAS.ID_USUARIO} = ?`;
        params = [nombre_completo, email, contrasena_hash, id_rol, id];
    } else {
        query = `UPDATE ${dict.TABLAS.USUARIOS} SET ${dict.COLUMNAS.NOMBRE_COMPLETO} = ?, ${dict.COLUMNAS.CORREO} = ?, id_rol = ? WHERE ${dict.COLUMNAS.ID_USUARIO} = ?`;
        params = [nombre_completo, email, id_rol, id];
    }

    await pool.query(query, params);
    return true;
};

const eliminarUsuario = async (id) => {
    try {
        await pool.query(`DELETE FROM ${dict.TABLAS.USUARIOS} WHERE ${dict.COLUMNAS.ID_USUARIO} = ?`, [id]);
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
